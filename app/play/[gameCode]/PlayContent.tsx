
"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { Clock } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import SpaceDodge from "@/components/space-dodge"
import { useGameStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"
import { supabaseB } from "@/lib/supabase-b"
import { getGameSessionByPin } from "@/lib/sessions-api"
import { getParticipantsByGameId, updateParticipantScore } from "@/lib/participants-api"
import { generateXID } from "@/lib/id-generator"
import { syncServerTime } from "@/lib/server-time"
import type { Quiz, Question } from "@/lib/types"
import Image, { type StaticImageData } from "next/image"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/language-context"

function PixelButton({
  children,
  color = "blue",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  color?: "blue" | "green" | "red" | "yellow"
}) {
  const colorStyles = {
    blue: "bg-blue-500 border-blue-700 text-white hover:bg-blue-600 active:bg-blue-700",
    green: "bg-green-500 border-green-700 text-white hover:bg-green-600 active:bg-green-700",
    red: "bg-red-500 border-red-700 text-white hover:bg-red-600 active:bg-red-700",
    yellow: "bg-yellow-400 border-yellow-600 text-black hover:bg-yellow-500 active:bg-yellow-600",
  }

  return (
    <button
      className={`border-2 font-mono uppercase tracking-wide shadow-[4px_4px_0px_rgba(0,0,0,0.8)] active:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:translate-x-[2px] active:translate-y-[2px] transition-all ${colorStyles[color]} px-4 py-3 text-sm w-full ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

interface PlayContentProps {
  gameCode: string
}

export default function PlayContent({ gameCode }: PlayContentProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const { currentQuestion, score, correctAnswers, setCurrentQuestion, addScore, incrementCorrectAnswers, setGameId, gameId, playerId, setCorrectAnswers, setScore, resetGame } =
    useGameStore()

  const [timeLeft, setTimeLeft] = useState(0)
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [isQuizStarted, setIsQuizStarted] = useState(false)
  const [shouldNavigate, setShouldNavigate] = useState(false)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMiniGame, setShowMiniGame] = useState(false)
  const [gameSettings, setGameSettings] = useState<{ timeLimit: number; questionCount: number } | null>(null)
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [progressRestored, setProgressRestored] = useState(false)
  const [storeHydrated, setStoreHydrated] = useState(false)
  const [sessionSeed, setSessionSeed] = useState<number | null>(null)
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [isSupabaseBSession, setIsSupabaseBSession] = useState(false)

  // Seeded RNG (mulberry32) and Fisher-Yates shuffle for stable per-session randomness
  const createRng = useCallback((seed: number) => {
    let t = seed >>> 0
    return () => {
      t += 0x6D2B79F5
      let r = Math.imul(t ^ (t >>> 15), 1 | t)
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
  }, [])

  const seededShuffle = useCallback(<T,>(arr: T[], seed: number): T[] => {
    const rng = createRng(seed)
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }, [createRng])

  // Function to regenerate questions and answers with a seeded shuffle
  const regenerateQuestionsWithSeed = useCallback((seed: number, quizData: any, questionCount: number, gameId: string, quizStartTime: string | null) => {
    try {
      // Validate input data
      if (!quizData || !quizData.questions || !Array.isArray(quizData.questions)) {

        return [];
      }

      if (quizData.questions.length === 0) {

        return [];
      }

      if (questionCount <= 0) {

        return [];
      }

      // Create a shared seed for question selection (same for all players)
      const sharedSeed = `${gameId}-${quizStartTime || Date.now()}`.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)

      // Use shared seed to select the SAME questions for all players
      const selectedQuestions = seededShuffle(quizData.questions, sharedSeed).slice(0, questionCount)

      // Use player-specific seed to shuffle the ORDER of selected questions
      const shuffledQuestions = seededShuffle(selectedQuestions, seed)

      return shuffledQuestions.map((q: any, idx: number) => {
        // Validate question structure
        if (!q || !q.answers || !Array.isArray(q.answers)) {

          // Skip invalid questions instead of returning them
          return null;
        }

        // derive a sub-seed for answers to reduce correlation with question order
        const answerSeed = seed + (q.id || idx) * 101
        return {
          ...q,
          answers: seededShuffle(q.answers, answerSeed),
        }
      }).filter(q => q !== null) // Remove null values from invalid questions
    } catch (error) {

      return [];
    }
  }, [seededShuffle])

  useEffect(() => {
    const fetchGame = async () => {
      if (!gameCode || typeof gameCode !== "string") {
        toast.error("Invalid game code!");
        router.replace("/");
        return;
      }

      // Try Supabase B first (new sessions)
      const sessionFromB = await getGameSessionByPin(gameCode.toUpperCase())

      let gameDataToUse: any = null
      let isFromSupabaseB = false

      if (sessionFromB) {
        isFromSupabaseB = true
        setIsSupabaseBSession(true)
        gameDataToUse = {
          id: sessionFromB.id,
          quiz_id: sessionFromB.quiz_id,
          total_time_minutes: sessionFromB.settings?.timeLimit || 10,
          question_limit: sessionFromB.settings?.questionCount?.toString() || '10',
          status: sessionFromB.status,
          started_at: sessionFromB.timestamps?.started_at || null,
          current_questions: null // Supabase B doesn't store current_questions in session
        }
      } else {
        // Fallback to main Supabase (legacy sessions)
        const { data: gameData, error: gameErr } = await supabase
          .from("game_sessions")
          .select("id, quiz_id, total_time_minutes, question_limit, status, started_at, current_questions")
          .eq("game_pin", gameCode.toUpperCase())
          .single()

        if (gameErr || !gameData) {
          toast.error("Game not found!");
          router.replace("/");
          return;
        }

        gameDataToUse = gameData
      }

      setGameId(gameDataToUse.id);
      setGameSettings({
        timeLimit: gameDataToUse.total_time_minutes > 100 ? Math.round(gameDataToUse.total_time_minutes / 60) : gameDataToUse.total_time_minutes,
        questionCount: gameDataToUse.question_limit === 'all' ? 999 : parseInt(gameDataToUse.question_limit),
      });
      setTimeLeft(gameDataToUse.total_time_minutes * 60);
      setStartedAt(gameDataToUse.started_at);

      const { data: quizData, error: quizErr } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", gameDataToUse.quiz_id)
        .single()

      if (quizErr || !quizData) {
        toast.error("Quiz not found!");
        router.replace("/");
        return;
      }

      // Validate quiz data structure
      if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
        toast.error("Quiz has no questions!");
        router.replace("/");
        return;
      }

      setQuiz(quizData as Quiz);

      // Use the current_questions from game_sessions if available, otherwise use quiz questions
      let questionsToUse = gameDataToUse.current_questions && gameDataToUse.current_questions.length > 0
        ? gameDataToUse.current_questions
        : quizData.questions;

      // Validate questionsToUse structure
      if (!questionsToUse || !Array.isArray(questionsToUse) || questionsToUse.length === 0) {
        questionsToUse = quizData.questions;
      }

      // Validate each question has required structure
      const validQuestions = questionsToUse.filter((q: any) => {
        if (!q || !q.answers || !Array.isArray(q.answers)) {
          return false;
        }
        return true;
      });

      if (validQuestions.length === 0) {
        toast.error("No valid questions found!");
        router.replace("/");
        return;
      }

      questionsToUse = validQuestions;

      // Build a per-session seed key for HOST-PLAYER mode
      const sessionKey = `session-seed-${gameDataToUse.id}-${playerId}-${gameDataToUse.started_at || "nostart"}`
      const existingSeed = typeof window !== "undefined" ? localStorage.getItem(sessionKey) : null;
      let seed: number;

      if (existingSeed) {
        seed = parseInt(existingSeed);
        setSessionSeed(seed);
      } else {
        const base = `${gameDataToUse.id}-${playerId || 'anonymous'}-${gameDataToUse.started_at || Date.now()}`
        seed = base.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)
        setSessionSeed(seed);
        if (typeof window !== "undefined") localStorage.setItem(sessionKey, seed.toString());
      }

      // Generate questions using the seed
      const shuffled = regenerateQuestionsWithSeed(seed, { questions: questionsToUse }, gameDataToUse.question_limit === 'all' ? 999 : parseInt(gameDataToUse.question_limit), gameDataToUse.id, gameDataToUse.started_at);

      if (!shuffled || shuffled.length === 0) {
        toast.error("Failed to load quiz questions!");
        router.replace("/");
        return;
      }

      const validShuffled = shuffled.filter(q => {
        if (!q || !q.answers || !Array.isArray(q.answers)) {
          return false;
        }
        return true;
      });

      if (validShuffled.length === 0) {
        toast.error("No valid questions after processing!");
        router.replace("/");
        return;
      }

      setAllQuestions(validShuffled);

      // Save questions to database (only for legacy sessions)
      if (!isFromSupabaseB) {
        const { error: updateError } = await supabase
          .from("game_sessions")
          .update({ current_questions: validShuffled })
          .eq("id", gameDataToUse.id);
      }

      if (gameDataToUse.status === 'active') {
        setIsQuizStarted(true);
      } else {
        setIsQuizStarted(false);
      }

      setLoading(false);
    }

    fetchGame();
  }, [gameCode, router, setCurrentQuestion, setGameId, playerId, regenerateQuestionsWithSeed]);

  // Check when store is hydrated and restore progress
  useEffect(() => {
    if (!storeHydrated && !loading && gameId && playerId && isQuizStarted) {
      setStoreHydrated(true);

      // Check if this is a fresh game session by comparing gameId with stored gameId
      const storedGameId = localStorage.getItem('current-game-id');
      const isNewGameSession = storedGameId !== gameId;

      if (isNewGameSession) {
        // This is a new game session, reset progress

        setCurrentQuestion(0);
        setScore(0);
        setCorrectAnswers(0);
        localStorage.setItem('current-game-id', gameId);

        // Also ensure player starts with fresh database state
        const resetPlayerProgress = async () => {
          try {
            await supabase
              .from("players")
              .update({
                score: 0,
                // current_question removed - calculate from responses instead 
              })
              .eq("id", playerId);

            setProgressRestored(true);
          } catch (error) {

            setProgressRestored(true);
          }
        };

        resetPlayerProgress();
        return;
      }

      // Existing session - restore progress from database
      const restoreProgress = async () => {
        try {
          // Fetch current game session data
          const { data: gameSession, error: gameError } = await supabase
            .from("game_sessions")
            .select("participants, responses, started_at")
            .eq("id", gameId)
            .single()

          if (gameError) {

            setProgressRestored(true);
            return;
          }

          // Find player in participants array
          const player = gameSession.participants.find((p: any) => p.id === playerId);
          if (!player) {

            setProgressRestored(true);
            return;
          }

          // Get player's responses from this session
          const playerResponses = gameSession.responses.filter((r: any) => r.player_id === playerId);
          const normalAnswers = playerResponses.filter((r: any) => r.question_id !== 'mini-game');

          if (normalAnswers.length > 0) {
            const lastAnsweredIndex = normalAnswers.length - 1;
            const nextQuestion = lastAnsweredIndex + 1;

            if (nextQuestion < (gameSettings?.questionCount || 15)) {
              setCurrentQuestion(nextQuestion);


              // Correct count from normal answers only
              const correctCount = normalAnswers.filter((answer: any) => answer.is_correct).length;
              setCorrectAnswers(correctCount);

              // Set score from participant data
              setScore(player.score || 0);
              setProgressRestored(true);
            } else {
              router.replace(`/result/${gameCode}`);
              return;
            }
          } else {
            // No answers yet, sync score from participant data
            setScore(player.score || 0);
            setProgressRestored(true);
          }
        } catch (error) {

          setProgressRestored(true);
        }
      };

      restoreProgress();
    }
  }, [storeHydrated, loading, gameId, playerId, isQuizStarted, gameSettings?.questionCount, setCurrentQuestion, setScore, setCorrectAnswers, router, gameCode]);

  // Monitor player leaving the page and clean up
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (gameId && playerId) {
        try {
          // Get current game session data
          const { data: gameSession, error: gameError } = await supabase
            .from("game_sessions")
            .select("participants")
            .eq("id", gameId)
            .single()

          if (gameError) {

            return
          }

          // Update participants array to mark player as inactive
          const updatedParticipants = gameSession.participants.map((participant: any) => {
            if (participant.id === playerId) {
              return {
                ...participant,
                // current_question removed - calculate from responses instead
              };
            }
            return participant;
          });

          // Update game session
          await supabase
            .from("game_sessions")
            .update({ participants: updatedParticipants })
            .eq("id", gameId)
        } catch (error) {

        }
      }
    }

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden' && gameId && playerId) {
        try {
          // Get current game session data
          const { data: gameSession, error: gameError } = await supabase
            .from("game_sessions")
            .select("participants")
            .eq("id", gameId)
            .single()

          if (gameError) {

            return
          }

          // Update participants array to mark player as inactive
          const updatedParticipants = gameSession.participants.map((participant: any) => {
            if (participant.id === playerId) {
              return {
                ...participant,
                // current_question removed - calculate from responses instead
              };
            }
            return participant;
          });

          // Update game session
          await supabase
            .from("game_sessions")
            .update({ participants: updatedParticipants })
            .eq("id", gameId)
        } catch (error) {

        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [gameId, playerId])

  useEffect(() => {
    if (!gameCode || !gameId) return;

    let channel: any;

    const handlePayload = (payload: any) => {
      console.log('[Player] Game status update received:', payload)
      const newStatus = payload.new.status;

      if (newStatus === 'active') {
        if (!isQuizStarted) setIsQuizStarted(true);
        // Handle timestamps from Supabase B or Legacy
        const newStartedAt = payload.new.timestamps?.started_at || payload.new.started_at;
        if (newStartedAt) setStartedAt(newStartedAt);
      } else if (newStatus === 'finished' || newStatus === 'finish') {
        console.log('[Player] Game finished, redirecting...')
        router.replace(`/result/${gameCode}`);
      }
    }

    if (isSupabaseBSession) {
      // Supabase B Subscription - Use ID for robustness
      console.log('[Player] Subscribing to Supabase B session:', gameId)
      channel = supabaseB
        .channel(`player-game-status-${gameId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${gameId}` },
          handlePayload
        )
        .subscribe((status) => {
          console.log('[Player] Supabase B Subscription Status:', status)
        });
    } else {
      // Legacy Subscription for Main Supabase
      channel = supabase
        .channel("game-status")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "game_sessions", filter: `game_pin=eq.${gameCode.toUpperCase()}` },
          handlePayload
        )
        .subscribe();
    }

    return () => {
      if (isSupabaseBSession) supabaseB.removeChannel(channel);
      else supabase.removeChannel(channel);
    };
  }, [gameCode, gameId, isQuizStarted, router, isSupabaseBSession]);

  // Polling Fallback: Check status manually every 500ms (reduced for faster response)
  // This ensures players get redirected even if Realtime connection fails (e.g. 406 errors)
  useEffect(() => {
    if (!gameId) return;

    // Immediate check on mount
    const checkStatus = async () => {
      try {
        let status = null;

        if (isSupabaseBSession) {
          const { data } = await supabaseB
            .from('sessions')
            .select('status')
            .eq('id', gameId)
            .single();
          status = data?.status;
        } else {
          const { data } = await supabase
            .from('game_sessions')
            .select('status')
            .eq('id', gameId)
            .single();
          status = data?.status;
        }

        if (status === 'finished' || status === 'finish') {
          console.log('[Player] Status check detected finish, redirecting immediately...');
          router.replace(`/result/${gameCode}`);
          return true; // Signal that we should stop polling
        }
      } catch (error) {
        console.error('[Player] Error checking status:', error);
      }
      return false;
    };

    // Check immediately
    checkStatus();

    // Then poll every 500ms for faster response
    const interval = setInterval(async () => {
      const shouldStop = await checkStatus();
      if (shouldStop) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [gameId, isSupabaseBSession, gameCode, router]);

  // Timer sinkron dengan server - mulai setelah countdown selesai
  useEffect(() => {
    if (!isQuizStarted || !gameSettings || !startedAt) return;

    let unsub = () => { };

    const startTimer = async () => {
      // Get server time offset to avoid client clock issues (Vercel/production)
      const serverNow = await syncServerTime();
      const clientOffset = serverNow - Date.now();

      const start = new Date(startedAt).getTime();
      const limitMs = gameSettings.timeLimit * 60 * 1000; // Convert minutes to milliseconds

      const tick = () => {
        const now = Date.now() + clientOffset;
        const remain = Math.max(0, start + limitMs - now);
        setTimeLeft(Math.floor(remain / 1000));
        if (remain <= 0) {
          setShouldNavigate(true);
        }
      };

      tick();
      const iv = setInterval(tick, 1000);
      unsub = () => {
        clearInterval(iv);
      };
    };

    startTimer();

    return () => {
      unsub();
    };
  }, [isQuizStarted, gameSettings, startedAt]);

  // When timer hits zero, navigate player to result page (production-safe)
  useEffect(() => {
    if (!shouldNavigate) return;
    router.replace(`/result/${gameCode}`);
  }, [shouldNavigate, router, gameCode]);

  const question = allQuestions[currentQuestion];

  // Safety check: if currentQuestion is out of bounds, reset it
  useEffect(() => {
    if (allQuestions.length > 0 && currentQuestion >= allQuestions.length) {

      setCurrentQuestion(0);
    }
  }, [currentQuestion, allQuestions.length, setCurrentQuestion]);

  const getChoiceLabel = (index: number) => String.fromCharCode(65 + index);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimeText = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerSelect = async (choice: {
    id: number;
    choice_text: string | null;
    is_correct: boolean;
  }) => {
    if (isAnswered || !question) return;

    setSelectedChoiceId(choice.id);
    setIsAnswered(true);
    const correct = choice.is_correct;
    setIsCorrect(correct);

    let earnedPoints = 0;
    if (correct) {
      // Calculate points per question to ensure max 100 points total
      // 5 questions = 20pts/question, 10 = 10pts/question, 20 = 5pts/question
      const totalQuestions = gameSettings?.questionCount || 10;
      earnedPoints = Math.round(100 / totalQuestions);
      addScore(earnedPoints);
      incrementCorrectAnswers();
    }

    try {
      // Validasi ID
      if (!gameId || !playerId) {
        toast.error("Invalid game or player data!");
        router.replace("/");
        return;
      }

      if (isSupabaseBSession) {
        // Supabase B: Update participant score and questions_answered directly
        const { data: participant, error: getError } = await supabaseB
          .from("participant")
          .select("score, questions_answered")
          .eq("id", playerId)
          .single()

        if (getError) {
          console.error('[Play] Error getting participant:', getError)
          // Don't throw - try to continue with just updating score
        }

        const currentScore = participant?.score || 0
        const newScore = currentScore + earnedPoints
        const currentQuestionsAnswered = participant?.questions_answered ?? 0
        const newQuestionsAnswered = currentQuestionsAnswered + 1

        // Try to update with questions_answered first, fallback to just score
        const { error: updateError } = await supabaseB
          .from("participant")
          .update({
            score: newScore,
            questions_answered: newQuestionsAnswered
          })
          .eq("id", playerId)

        if (updateError) {
          console.warn('[Play] Update with questions_answered failed, trying score only:', updateError)
          // Fallback: just update score if questions_answered column doesn't exist
          const { error: scoreOnlyError } = await supabaseB
            .from("participant")
            .update({ score: newScore })
            .eq("id", playerId)

          if (scoreOnlyError) {
            console.error('[Play] Error updating score:', scoreOnlyError)
            // Don't throw - let the game continue
          }
        }

        // Check if all questions are completed - update session status
        if (currentQuestion + 1 >= gameSettings!.questionCount) {
          // Player completed all questions - don't change game status here
          // The host will handle ending the game
        }
      } else {
        // Legacy: Update game_sessions in main Supabase
        const { data: gameSession, error: gameError } = await supabase
          .from("game_sessions")
          .select("participants, responses")
          .eq("id", gameId)
          .single();

        if (gameError) {
          throw gameError;
        }

        // Update participants array with new score
        const updatedParticipants = gameSession.participants.map((participant: any) => {
          if (participant.id === playerId) {
            return {
              ...participant,
              score: (participant.score || 0) + earnedPoints,
            };
          }
          return participant;
        });

        // Add response to responses array
        const newResponse = {
          id: generateXID(),
          player_id: playerId,
          question_id: question.id,
          answer_id: selectedChoiceId,
          is_correct: correct,
          points_earned: earnedPoints,
          created_at: new Date().toISOString()
        };

        const updatedResponses = [...(gameSession.responses || []), newResponse];

        // Update game session with new data
        const { error: updateError } = await supabase
          .from("game_sessions")
          .update({
            participants: updatedParticipants,
            responses: updatedResponses
          })
          .eq("id", gameId);

        if (updateError) {
          throw updateError;
        }

        // Check if all questions completed
        if (currentQuestion + 1 >= gameSettings!.questionCount) {
          const { error: statusError } = await supabase
            .from("game_sessions")
            .update({
              status: 'finished',
              ended_at: new Date().toISOString()
            })
            .eq("id", gameId);

          if (statusError) {
            throw statusError;
          }
        }
      }
    } catch (error: any) {

      toast.error(`Failed to save answer: ${error.message}`);
      return;
    }

    setShowResult(true);

    setTimeout(
      () => {
        setShowResult(false);
        setIsAnswered(false);
        setSelectedChoiceId(null);
        if (correct && (correctAnswers + 1) % 3 === 0) {
          setShowMiniGame(true);
        } else if (currentQuestion + 1 < gameSettings!.questionCount) {
          setCurrentQuestion(currentQuestion + 1);
        } else {
          // Clean up session seed when game ends
          if (gameId && playerId) {
            localStorage.removeItem(`session-seed-${gameId}-${playerId}`);
          }
          router.replace(`/result/${gameCode}`);
        }
      },
      correct ? 400 : 600,
    );
  };

  const handleMiniGameComplete = async (score: number) => {
    // Always update local state immediately for better UX
    addScore(score);
    setShowMiniGame(false);

    try {
      // Validasi ID
      if (!gameId || !playerId) {
        toast.error("Invalid game or player data!");
        router.replace("/");
        return;
      }

      // Ensure score is valid
      if (typeof score !== 'number' || isNaN(score) || score < 0) {
        toast.error("Invalid mini-game score!");
        return;
      }

      if (isSupabaseBSession) {
        // Supabase B: Update participant score directly
        const { data: participant, error: getError } = await supabaseB
          .from("participant")
          .select("score")
          .eq("id", playerId)
          .single()

        if (getError) {
          console.error('[Play] Error getting participant:', getError)
          toast.error("Failed to update score - please try again")
          return
        }

        const newScore = (participant?.score || 0) + score

        const { error: updateError } = await supabaseB
          .from("participant")
          .update({ score: newScore })
          .eq("id", playerId)

        if (updateError) {
          console.error('[Play] Error updating participant score:', updateError)
          toast.error("Failed to update game session")
          return
        }
      } else {
        // Legacy: Update game_sessions in main Supabase
        const { data: gameSession, error: fetchError } = await supabase
          .from("game_sessions")
          .select("participants, responses")
          .eq("id", gameId)
          .single();

        if (fetchError) {
          toast.error("Failed to update score - please try again");
          return;
        }

        // Update participants array with mini-game score
        const updatedParticipants = gameSession.participants.map((participant: any) => {
          if (participant.id === playerId) {
            return {
              ...participant,
              score: (participant.score || 0) + score
            };
          }
          return participant;
        });

        // Add mini-game response to responses array
        const miniGameResponse = {
          id: generateXID(),
          player_id: playerId,
          question_id: 'mini-game',
          answer_id: 'mini-game',
          is_correct: false,
          points_earned: score,
          created_at: new Date().toISOString()
        };

        const updatedResponses = [...(gameSession.responses || []), miniGameResponse];

        // Update game session with new data
        const { error: updateError } = await supabase
          .from("game_sessions")
          .update({
            participants: updatedParticipants,
            responses: updatedResponses
          })
          .eq("id", gameId);

        if (updateError) {
          toast.error("Failed to update game session");
          return;
        }
      }

      toast.success(`Mini-game bonus: +${score} points!`);

    } catch (error: any) {
      toast.error("Failed to save mini-game score - please contact support");
    }

    // Continue game flow
    if (currentQuestion + 1 < gameSettings!.questionCount) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Clean up session seed when game ends
      if (gameId && playerId) {
        localStorage.removeItem(`session-seed-${gameId}-${playerId}`);
      }
      router.replace(`/result/${gameCode}`);
    }
  };

  if (loading || !gameSettings || (isQuizStarted && !progressRestored))
    return (
      <>
        <Background />
        <div className="relative z-10 min-h-screen flex items-center justify-center font-mono text-white">
          <div className="bg-black/70 border-4 border-white p-6 rounded-lg">
            <p>{t('loadingQuiz', 'Loading quiz...')}</p>
          </div>
        </div>
      </>
    );

  // Check if quiz data is still loading or if questions array is empty
  if (!quiz || allQuestions.length === 0) {


    return (
      <>
        <Background />
        <div className="relative z-10 min-h-screen flex items-center justify-center font-mono text-white">
          <div className="bg-black/70 border-4 border-white p-6 rounded-lg">
            <p>{t('loadingQuiz', 'Loading quiz...')}</p>
          </div>
        </div>
      </>
    );
  }

  // Check if current question exists in the questions array
  if (!question) {


    return (
      <>
        <Background />
        <div className="relative z-10 min-h-screen flex items-center justify-center font-mono text-white">
          <div className="bg-black/70 border-4 border-red-500 p-6 rounded-lg">
            <p>{t('quizNotFound', 'Quiz not found or invalid quiz ID.')}</p>
            <button onClick={() => router.replace("/")} className="mt-4 px-4 py-2 bg-red-600 rounded">
              {t('goHome', 'Go Home')}
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!isQuizStarted)
    return (
      <>
        <Background />
        <div className="relative z-10 min-h-screen flex items-center justify-center font-mono text-white">
          <div className="bg-black/70 border-4 border-white p-6 rounded-lg">
            <p>{t('waitingForHost', 'Waiting for host to start...')}</p>
          </div>
        </div>
      </>
    );

  return (
    <>
      <Background />
      <div className="relative z-10 min-h-screen flex items-center justify-center font-mono text-white">
        <AnimatePresence>{showMiniGame && <SpaceDodge onComplete={handleMiniGameComplete} />}</AnimatePresence>

        <div className="w-full max-w-4xl mx-auto p-4">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-lg sm:text-xl font-bold text-white">{t('spaceQuiz')}</h1>
              <Image
                src="/images/gameforsmartlogo.png"
                alt="GameForSmart"
                width={200}
                height={80}
                className="w-28 h-auto sm:w-32 md:w-36 lg:w-40 xl:w-44 opacity-90 hover:opacity-100 transition-opacity duration-300"
                priority
              />
            </div>
            <div className="flex justify-between items-center">
              <div className="text-lg">
                {t('score', 'Score')}: <span className="font-bold text-yellow-300">{score}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span className="text-lg">{formatTimeText(timeLeft)}</span>
              </div>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between text-sm text-white/70">
            <span>{t('progress', 'Progress')}: {currentQuestion}/{gameSettings.questionCount}</span>
            <span>{Math.round((currentQuestion / gameSettings.questionCount) * 100)}%</span>
          </div>
          <Progress value={(currentQuestion / gameSettings.questionCount) * 100} className="mb-6" />

          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white/10 border-4 border-white/20 p-6 rounded-lg mb-6"
          >
            <h2 className="text-xl mb-4">
              {t('questionOf', 'Question {current} of {total}').replace('{current}', String(currentQuestion + 1)).replace('{total}', String(gameSettings.questionCount))}
            </h2>
            {question.image && (
              <div className="mb-6 flex justify-center">
                <Image
                  src={question.image || "/images/placeholder.svg"}
                  alt={t('questionImage', 'Question image')}
                  width={300}
                  height={200}
                  sizes="(max-width: 768px) 100vw, 300px"
                  priority
                  className="max-w-full max-h-64 object-contain rounded-lg border-2 border-white/20"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>
            )}
            <p className="text-lg mb-6">{question.question}</p>

            <div
              className={`grid ${question.answers.length === 3 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"} gap-4`}
            >
              {question.answers.map((answer, index) => {
                const isSelected = selectedChoiceId === parseInt(answer.id);
                const isRight = answer.id === question.correct;
                let buttonColor: "blue" | "green" | "red" = "blue";

                if (isAnswered) {
                  if (isRight) buttonColor = "green";
                  else if (isSelected && !isRight) buttonColor = "red";
                }
                //
                return (
                  <PixelButton
                    key={answer.id}
                    color={buttonColor}
                    disabled={isAnswered}
                    onClick={() => handleAnswerSelect({ id: parseInt(answer.id), choice_text: answer.answer, is_correct: isRight })}
                    className={`${isAnswered ? "cursor-not-allowed" : ""} ${isAnswered && !isSelected ? "opacity-50" : ""} text-left`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg bg-black/30 px-2 py-1 rounded border border-white/20 min-w-[32px] text-center">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <div className="flex-1 flex items-center gap-3">
                        {answer.image && (
                          <Image
                            src={answer.image || "/images/placeholder.svg"}
                            alt="Pilihan jawaban"
                            width={48}
                            height={48}
                            sizes="48px"
                            className="w-12 h-12 object-contain rounded border border-white/20"
                            style={{ imageRendering: "pixelated" }}
                          />
                        )}
                        <span className="flex-1">{answer.answer}</span>
                      </div>
                    </div>
                  </PixelButton>
                );
              })}
            </div>


          </motion.div>
        </div>
      </div>
    </>
  );
}

function Background() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-[url('/images/space_bg.jpg')]"
        style={{ backgroundSize: "cover", imageRendering: "pixelated" }}
      />
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
}