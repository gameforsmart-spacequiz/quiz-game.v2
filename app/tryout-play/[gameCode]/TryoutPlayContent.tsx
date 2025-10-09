"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { Clock, ArrowLeft } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useGameStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"
import type { Quiz, Question } from "@/lib/types"
import Image from "next/image"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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

interface TryoutPlayContentProps {
  gameCode: string
}

export default function TryoutPlayContent({ gameCode }: TryoutPlayContentProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const { currentQuestion, score, correctAnswers, setCurrentQuestion, addScore, incrementCorrectAnswers, setGameId, gameId, playerId, setCorrectAnswers, setScore, resetGame, resetGameKeepMode, setGameMode } =
    useGameStore()

  // Load current question from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedQuestion = localStorage.getItem(`tryout-current-question-${gameCode}`)
      if (savedQuestion) {
        setCurrentQuestion(parseInt(savedQuestion))
      }
      
      // Check if this is a page refresh and show a message
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const isRefresh = navEntry?.type === 'reload'
      if (isRefresh && savedQuestion) {
        toast.success("Progress restored from previous session!")
      }
    }
  }, [gameCode, setCurrentQuestion])

  const [timeLeft, setTimeLeft] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`tryout-time-left-${gameCode}`)
      return saved ? parseInt(saved) : 0
    }
    return 0
  })
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [answers, setAnswers] = useState<{[key: number]: string}>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`tryout-answers-${gameCode}`)
      return saved ? JSON.parse(saved) : {}
    }
    return {}
  })
  const [showFinishDialog, setShowFinishDialog] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`tryout-show-finish-dialog-${gameCode}`)
      return saved === 'true'
    }
    return false
  })
  const [showUnansweredDialog, setShowUnansweredDialog] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`tryout-show-unanswered-dialog-${gameCode}`)
      return saved === 'true'
    }
    return false
  })
  const [showBackConfirmationDialog, setShowBackConfirmationDialog] = useState(false)
  const [unansweredQuestions, setUnansweredQuestions] = useState<number[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`tryout-unanswered-questions-${gameCode}`)
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [quiz, setQuiz] = useState<Quiz | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`tryout-quiz-data-${gameCode}`)
      return saved ? JSON.parse(saved) : null
    }
    return null
  })
  const [loading, setLoading] = useState(true)
  const [gameSettings, setGameSettings] = useState<{ timeLimit: number; questionCount: number } | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`tryout-game-settings-${gameCode}`)
      return saved ? JSON.parse(saved) : null
    }
    return null
  })
  const [allQuestions, setAllQuestions] = useState<Question[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`tryout-questions-${gameCode}`)
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [sessionSeed, setSessionSeed] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`tryout-seed-${gameCode}`)
      return saved ? parseInt(saved) : null
    }
    return null
  })
  const [playerName, setPlayerName] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`tryout-player-name-${gameCode}`)
      return saved || ""
    }
    return ""
  })

  // Function to find next unanswered question
  const findNextUnansweredQuestion = useCallback((startIndex: number) => {
    for (let i = startIndex + 1; i < allQuestions.length; i++) {
      if (!answers[i] || answers[i] === '') {
        return i;
      }
    }
    return -1; // No unanswered questions found
  }, [allQuestions.length, answers]);

  // Function to find previous unanswered question
  const findPreviousUnansweredQuestion = useCallback((startIndex: number) => {
    for (let i = startIndex - 1; i >= 0; i--) {
      if (!answers[i] || answers[i] === '') {
        return i;
      }
    }
    return -1; // No unanswered questions found
  }, [answers]);

  // Function to check if all questions are answered and handle finish logic
  const checkAndFinishQuiz = useCallback((updatedAnswers?: {[key: number]: string}) => {
    // Use updated answers if provided, otherwise use current state
    const currentAnswers = updatedAnswers || answers;
    const unanswered = [];
    
    for (let i = 0; i < allQuestions.length; i++) {
      if (!currentAnswers[i] || currentAnswers[i] === '') {
        unanswered.push(i);
      }
    }

    console.log("Checking finish quiz:", {
      totalQuestions: allQuestions.length,
      answeredQuestions: Object.keys(currentAnswers).length,
      unansweredQuestions: unanswered.length,
      unanswered: unanswered,
      answers: currentAnswers,
      updatedAnswers: updatedAnswers
    });

    if (unanswered.length > 0) {
      // There are unanswered questions - show unanswered dialog
      setUnansweredQuestions(unanswered);
      setShowUnansweredDialog(true);
      setShowFinishDialog(false); // Ensure finish dialog is closed
      toast.warning(`Masih ada ${unanswered.length} soal yang belum dijawab!`);
    } else {
      // All questions answered - show finish dialog
      setShowFinishDialog(true);
      setShowUnansweredDialog(false); // Ensure unanswered dialog is closed
      toast.success("Semua soal telah terjawab! Quiz siap untuk diselesaikan.");
    }
  }, [allQuestions.length, answers]);

  // Save answers to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`tryout-answers-${gameCode}`, JSON.stringify(answers))
    }
  }, [answers, gameCode])

  // Save current question to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`tryout-current-question-${gameCode}`, currentQuestion.toString())
    }
  }, [currentQuestion, gameCode])

  // Save time left to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && timeLeft > 0) {
      localStorage.setItem(`tryout-time-left-${gameCode}`, timeLeft.toString())
    }
  }, [timeLeft, gameCode])

  // Save questions to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && allQuestions.length > 0) {
      localStorage.setItem(`tryout-questions-${gameCode}`, JSON.stringify(allQuestions))
    }
  }, [allQuestions, gameCode])

  // Save session seed to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionSeed !== null) {
      localStorage.setItem(`tryout-seed-${gameCode}`, sessionSeed.toString())
    }
  }, [sessionSeed, gameCode])

  // Save quiz data to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && quiz) {
      localStorage.setItem(`tryout-quiz-data-${gameCode}`, JSON.stringify(quiz))
    }
  }, [quiz, gameCode])

  // Save game settings to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && gameSettings) {
      localStorage.setItem(`tryout-game-settings-${gameCode}`, JSON.stringify(gameSettings))
    }
  }, [gameSettings, gameCode])

  // Save player name to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && playerName) {
      localStorage.setItem(`tryout-player-name-${gameCode}`, playerName)
    }
  }, [playerName, gameCode])

  // Save dialog states to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`tryout-show-finish-dialog-${gameCode}`, showFinishDialog.toString())
    }
  }, [showFinishDialog, gameCode])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`tryout-show-unanswered-dialog-${gameCode}`, showUnansweredDialog.toString())
    }
  }, [showUnansweredDialog, gameCode])

  useEffect(() => {
    if (typeof window !== 'undefined' && unansweredQuestions.length > 0) {
      localStorage.setItem(`tryout-unanswered-questions-${gameCode}`, JSON.stringify(unansweredQuestions))
    }
  }, [unansweredQuestions, gameCode])

  // Cleanup function to clear localStorage when component unmounts
  useEffect(() => {
    return () => {
      // Only clear if the quiz is not completed
      if (typeof window !== 'undefined' && !showFinishDialog) {
        // Don't clear here as we want to persist on refresh
        // Only clear when quiz is actually finished
      }
    }
  }, [showFinishDialog])

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

  // Function to regenerate questions and choices with a seeded shuffle
  // This ensures consistent randomization - same seed will always produce same order
  const regenerateQuestionsWithSeed = useCallback((seed: number, quizData: any, questionCount: number) => {
    try {
      if (!quizData || !quizData.questions || !Array.isArray(quizData.questions)) {
        console.error("Invalid quiz data structure:", quizData);
        return [];
      }
      
      if (quizData.questions.length === 0) {
        console.error("Quiz has no questions");
        return [];
      }
      
      if (questionCount <= 0) {
        console.error("Invalid question count:", questionCount);
        return [];
      }
      
      const shuffledQuestions = seededShuffle(quizData.questions, seed).slice(0, questionCount)
      
      return shuffledQuestions.map((q: any, idx: number) => {
        if (!q || !q.answers || !Array.isArray(q.answers)) {
          console.error("Invalid question structure:", q);
          return q;
        }
        
        const answerSeed = seed + (q.id || idx) * 101
        return {
          ...q,
          answers: seededShuffle(q.answers, answerSeed),
        }
      })
    } catch (error) {
      console.error("Error in regenerateQuestionsWithSeed:", error);
      return [];
    }
  }, [seededShuffle])

  useEffect(() => {
    const fetchGame = async () => {
      if (!gameCode || typeof gameCode !== "string") {
        console.error("Invalid game code:", gameCode);
        toast.error("Invalid game code!");
        router.replace("/");
        return;
      }

      // Check if all data is already loaded from localStorage
      if (allQuestions.length > 0 && sessionSeed !== null && quiz && gameSettings) {
        console.log("All data already loaded from localStorage, skipping fetch");
        setLoading(false);
        return;
      }

      const { data: gameData, error: gameErr } = await supabase
        .from("game_sessions")
        .select("id, quiz_id, total_time_minutes, question_limit, status, started_at, participants")
        .eq("game_pin", gameCode.toUpperCase())
        .single()

      if (gameErr || !gameData) {
        console.error("Game fetch error:", gameErr?.message, gameErr?.details);
        toast.error("Game not found!");
        router.replace("/");
        return;
      }

      setGameId(gameData.id);
      setGameSettings({
        timeLimit: gameData.time_limit,
        questionCount: gameData.question_count,
      });
      
      // Only set time if not already loaded from localStorage
      if (timeLeft === 0) {
        setTimeLeft(gameData.time_limit);
      }

      // Get player name from the participants array
      const playerData = gameData.participants?.find((p: any) => p.id === playerId)

      if (playerData?.name) {
        setPlayerName(playerData.name);
      }

      const { data: quizData, error: quizErr } = await supabase
        .from("quizzes")
        .select(`
          *,
          questions (
            id,
            question,
            question_image_url,
            question_image_alt,
            choices (
              id,
              choice_text,
              choice_image_url,
              choice_image_alt,
              is_correct
            )
          )
        `)
        .eq("id", gameData.quiz_id)
        .single()

      if (quizErr || !quizData) {
        console.error("Quiz fetch error:", quizErr?.message, quizErr?.details);
        toast.error("Quiz not found!");
        router.replace("/");
        return;
      }

      if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
        console.error("Quiz has no questions or invalid structure:", quizData);
        toast.error("Quiz has no questions!");
        router.replace("/");
        return;
      }

      setQuiz(quizData as Quiz);

      // Create seed for consistent question order - use game ID and player ID only for stability
      // This ensures the same quiz will always have the same question order for the same player
      // Only create new seed if not already loaded from localStorage
      let seed = sessionSeed;
      if (!seed) {
        seed = `${gameData.id}-${playerId || 'tryout'}`.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)
        setSessionSeed(seed);
        console.log("Generated new seed for consistent randomization:", seed);
      } else {
        console.log("Using existing seed for consistent randomization:", seed);
      }
      
      const shuffled = regenerateQuestionsWithSeed(seed!, quizData, gameData.question_count);
      
      if (!shuffled || shuffled.length === 0) {
        console.error("Failed to generate questions from quiz data");
        toast.error("Failed to load quiz questions!");
        router.replace("/");
        return;
      }
      
      setAllQuestions(shuffled);
      console.log("Tryout quiz loaded with consistent randomization:", {
        questionsCount: shuffled.length,
        timeLimit: gameData.time_limit,
        questionCount: gameData.question_count,
        seed: seed,
        firstQuestionId: shuffled[0]?.id,
        lastQuestionId: shuffled[shuffled.length - 1]?.id
      });
      
      // Show toast that questions are randomized
      toast.success(t('questionsRandomized'));
      setLoading(false);
    }

    fetchGame();
  }, [gameCode, router, setCurrentQuestion, setGameId, playerId, regenerateQuestionsWithSeed, allQuestions.length, sessionSeed, timeLeft, quiz, gameSettings, playerName]);

  const handleAnswer = useCallback(async (choiceId: number | null) => {
    console.log("Handling answer:", {
      choiceId,
      currentQuestion,
      totalQuestions: allQuestions.length,
      timeLeft
    });

    setIsAnswered(true);
    setSelectedChoiceId(choiceId);

    const currentQ = allQuestions[currentQuestion];
    const selectedChoice = currentQ?.answers?.find(c => c.id === choiceId);

    // Save answer without showing result
    let updatedAnswers = answers;
    if (selectedChoice) {
      updatedAnswers = {
        ...answers,
        [currentQuestion]: selectedChoice.answer || ''
      };
      setAnswers(updatedAnswers);
    }

    console.log("Answer saved:", selectedChoice?.answer);

    // Auto-advance after 0.5 seconds
    setTimeout(() => {
      console.log("Auto-advancing:", {
        currentQuestion,
        totalQuestions: allQuestions.length,
        willAdvance: currentQuestion < allQuestions.length - 1
      });
      
      // Find next unanswered question using the updated answers
      const nextUnansweredIndex = (() => {
        for (let i = currentQuestion + 1; i < allQuestions.length; i++) {
          if (!updatedAnswers[i] || updatedAnswers[i] === '') {
            return i;
          }
        }
        return -1; // No unanswered questions found
      })();
      
      if (nextUnansweredIndex !== -1) {
        // Found next unanswered question - go to it
        console.log("Going to next unanswered question:", nextUnansweredIndex);
        setCurrentQuestion(nextUnansweredIndex);
        setSelectedChoiceId(null);
        setIsAnswered(false);
        setShowResult(false);
        setIsCorrect(false);
        toast.info(`Melompat ke soal ${nextUnansweredIndex + 1} yang belum dijawab`);
      } else {
        // No more unanswered questions - check if all questions are completed
        console.log("No more unanswered questions, checking if all questions are completed");
        checkAndFinishQuiz(updatedAnswers);
      }
    }, 500);
  }, [allQuestions, currentQuestion, setCurrentQuestion, timeLeft, checkAndFinishQuiz, answers]);

  // Function to automatically finish quiz when time runs out
  const autoFinishQuiz = useCallback(() => {
    console.log("Auto-finishing quiz due to time limit");
    
    // Calculate final score
    let finalScore = 0;
    let finalCorrect = 0;
    
    allQuestions.forEach((question, index) => {
      const userAnswer = answers[index];
      if (userAnswer) {
        const correctChoice = question.answers?.find(c => c.is_correct);
        if (correctChoice && correctChoice.answer === userAnswer) {
          finalScore += 10;
          finalCorrect += 1;
        }
      }
    });
    
    // Update store with final scores
    setScore(finalScore);
    setCorrectAnswers(finalCorrect);
    
    // Clean up localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`tryout-answers-${gameCode}`);
      localStorage.removeItem(`tryout-current-question-${gameCode}`);
      localStorage.removeItem(`tryout-time-left-${gameCode}`);
      localStorage.removeItem(`tryout-questions-${gameCode}`);
      localStorage.removeItem(`tryout-seed-${gameCode}`);
      localStorage.removeItem(`tryout-quiz-data-${gameCode}`);
      localStorage.removeItem(`tryout-game-settings-${gameCode}`);
      localStorage.removeItem(`tryout-player-name-${gameCode}`);
      localStorage.removeItem(`tryout-show-finish-dialog-${gameCode}`);
      localStorage.removeItem(`tryout-show-unanswered-dialog-${gameCode}`);
      localStorage.removeItem(`tryout-unanswered-questions-${gameCode}`);
    }
    
    // Show time's up message
    toast.error("Waktu habis! Quiz otomatis selesai.");
    
    // Redirect to results
    router.push(`/tryout-result/${gameCode}`);
  }, [allQuestions, answers, setScore, setCorrectAnswers, gameCode, router]);

  // Timer effect - only start when questions are loaded
  useEffect(() => {
    if (timeLeft > 0 && !isAnswered && allQuestions.length > 0 && !loading) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && allQuestions.length > 0 && !loading) {
      console.log("Time's up! Auto-finishing quiz");
      // Auto-finish the quiz when time runs out
      autoFinishQuiz();
    }
  }, [timeLeft, isAnswered, allQuestions.length, loading, autoFinishQuiz]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/galaxy.webp')",
          }}
        />
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-purple-400 mx-auto mb-3 sm:mb-4"></div>
            <p className="text-white text-sm sm:text-base md:text-lg">Loading quiz...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz || allQuestions.length === 0) {
    return (
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/galaxy.webp')",
          }}
        />
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="text-center max-w-sm sm:max-w-md">
            <p className="text-white text-sm sm:text-base md:text-lg mb-4">Loading quiz questions...</p>
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <Button
              onClick={() => {
                setGameMode("tryout");
                router.push("/select-quiz");
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3"
            >
              Back to Quiz Selection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = allQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / allQuestions.length) * 100;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Galaxy Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/galaxy.webp')",
        }}
      />
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Main Content */}
      <div className="relative z-10 h-screen flex flex-col overflow-hidden">
        {/* Mobile Scroll Container */}
        <div className="flex-1 overflow-y-auto lg:overflow-visible min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between p-2 sm:p-4 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <Button
              onClick={() => setShowBackConfirmationDialog(true)}
              variant="outline"
              className="bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20 transition-all duration-300 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
            >
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t('back')}</span>
            </Button>
            
            <div className="text-left min-w-0 flex-1">
              <h1 className="text-sm sm:text-lg md:text-xl font-bold text-white truncate">{quiz?.title || 'Quiz'}</h1>
              {quiz?.description && <p className="text-xs sm:text-sm text-gray-300 truncate">{quiz.description}</p>}
            </div>
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-6 px-2 sm:px-4 pb-2 sm:pb-4 min-h-0 overflow-hidden">
          {/* Question Content */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-black/30 backdrop-blur-xl border border-white/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-2xl relative overflow-hidden h-full"
            >
              {/* Galaxy Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 rounded-xl sm:rounded-2xl"></div>
              <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-gradient-radial from-white/10 to-transparent rounded-full blur-lg sm:blur-xl"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-16 sm:h-16 md:w-24 md:h-24 bg-gradient-radial from-blue-400/20 to-transparent rounded-full blur-md sm:blur-lg"></div>
              <div className="relative z-10 flex flex-col h-full">
              {/* Question Tags and Timer */}
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4 flex-shrink-0">
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <span className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border border-blue-400/30 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm">
                    {t('questionNumber')} {currentQuestion + 1}
                  </span>
                  {answers[currentQuestion] && (
                    <span className="bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-300 border border-green-400/30 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm">
                      {t('alreadyAnsweredCheck')}
                    </span>
                  )}
                  {!answers[currentQuestion] && (
                    <span className="bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 border border-red-400/30 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm">
                      ⚠ {t('notAnswered')}
                    </span>
                  )}
                </div>
                
                {/* Timer - Aligned with question tags */}
                <div className="flex items-center gap-1 sm:gap-2 text-white bg-white/10 backdrop-blur-lg px-2 sm:px-3 md:px-4 py-1 sm:py-2 rounded-lg border border-white/20 shadow-lg">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                  <span className="text-sm sm:text-base md:text-lg font-mono font-bold">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                </div>
              </div>

              {/* Question */}
              <div className="mb-4 sm:mb-6 flex-shrink-0">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-white mb-3 sm:mb-4 leading-tight">
                  {currentQ.question}
                </h2>
                {currentQ.question_image_url && (
                  <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto h-32 sm:h-40 md:h-48 mb-3 sm:mb-4">
                    <Image
                      src={currentQ.question_image_url}
                      alt={currentQ.question_image_alt || currentQ.question}
                      fill
                      className="object-contain rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Answers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6 flex-shrink-0">
                {currentQ.answers?.map((choice, index) => {
                  const isSelected = selectedChoiceId === choice.id;
                  const isAnswered = answers[currentQuestion] === choice.answer;

                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleAnswer(choice.id)}
                      className={`p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-200 backdrop-blur-sm relative overflow-hidden ${
                        isSelected || isAnswered
                          ? 'border-purple-400 bg-purple-500/20'
                          : 'border-white/30 bg-black/20 hover:border-purple-300 hover:bg-purple-500/10'
                      }`}
                    >
                      {/* Galaxy effect for choices */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-lg sm:rounded-xl"></div>
                      <div className="relative z-10 flex items-center gap-2 sm:gap-3">
                        <div className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold backdrop-blur-sm flex-shrink-0 ${
                          isSelected || isAnswered
                            ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg'
                            : 'bg-gradient-to-br from-purple-400/30 to-purple-600/30 text-purple-200 border border-purple-400/50'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="text-white font-medium text-sm sm:text-base leading-tight flex-1 text-left">{choice.answer}</span>
                        {isAnswered && (
                          <span className="ml-auto text-xs text-purple-300 flex-shrink-0">✓</span>
                        )}
                        {isSelected && !isAnswered && (
                          <span className="ml-auto text-xs text-blue-300 flex-shrink-0 hidden sm:inline">Selected</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-between flex-shrink-0 mt-auto">
                <button
                  onClick={() => {
                    // Find previous unanswered question
                    const prevUnansweredIndex = findPreviousUnansweredQuestion(currentQuestion);
                    
                    if (prevUnansweredIndex !== -1) {
                      // Found previous unanswered question - go to it
                      console.log("Previous button clicked, going to unanswered question:", prevUnansweredIndex);
                      const prevQuestion = allQuestions[prevUnansweredIndex];
                      const prevAnswer = answers[prevUnansweredIndex];
                      
                      setCurrentQuestion(prevUnansweredIndex);
                      
                      // Set the selected choice if there's a previous answer
                      if (prevAnswer && prevQuestion) {
                        const selectedChoice = prevQuestion.answers?.find(c => c.answer === prevAnswer);
                        setSelectedChoiceId(selectedChoice?.id || null);
                        setIsAnswered(true);
                      } else {
                        setSelectedChoiceId(null);
                        setIsAnswered(false);
                      }
                      setShowResult(false);
                    } else if (currentQuestion > 0) {
                      // No previous unanswered question, go to previous question in sequence
                      const prevQuestion = allQuestions[currentQuestion - 1];
                      const prevAnswer = answers[currentQuestion - 1];
                      
                      setCurrentQuestion(currentQuestion - 1);
                      
                      // Set the selected choice if there's a previous answer
                      if (prevAnswer && prevQuestion) {
                        const selectedChoice = prevQuestion.answers?.find(c => c.answer === prevAnswer);
                        setSelectedChoiceId(selectedChoice?.id || null);
                        setIsAnswered(true);
                      } else {
                        setSelectedChoiceId(null);
                        setIsAnswered(false);
                      }
                      setShowResult(false);
                    }
                  }}
                  disabled={currentQuestion === 0}
                  className="px-3 sm:px-4 py-2 rounded-lg border border-white/30 text-white/70 disabled:opacity-50 disabled:cursor-not-allowed bg-black/20 backdrop-blur-sm hover:bg-white/10 transition-all duration-200 text-sm sm:text-base"
                >
                  ← {t('previous')}
                </button>
                <button
                  onClick={() => {
                    // Find next unanswered question
                    const nextUnansweredIndex = findNextUnansweredQuestion(currentQuestion);
                    
                    if (nextUnansweredIndex !== -1) {
                      // Found next unanswered question - go to it
                      console.log("Next button clicked, going to unanswered question:", nextUnansweredIndex);
                      const nextQuestion = allQuestions[nextUnansweredIndex];
                      const nextAnswer = answers[nextUnansweredIndex];
                      
                      setCurrentQuestion(nextUnansweredIndex);
                      
                      // Set the selected choice if there's an answer for this question
                      if (nextAnswer && nextQuestion) {
                        const selectedChoice = nextQuestion.answers?.find(c => c.answer === nextAnswer);
                        setSelectedChoiceId(selectedChoice?.id || null);
                        setIsAnswered(true);
                      } else {
                        setSelectedChoiceId(null);
                        setIsAnswered(false);
                      }
                      setShowResult(false);
                    } else {
                      // No more unanswered questions - check if all questions are completed
                      console.log("Next button clicked, no more unanswered questions, checking completion");
                      checkAndFinishQuiz(answers);
                    }
                  }}
                  disabled={false}
                  className="px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 backdrop-blur-sm hover:from-purple-500 hover:to-blue-500 transition-all duration-200 shadow-lg text-sm sm:text-base"
                >
                  {findNextUnansweredQuestion(currentQuestion) === -1 ? t('complete') : `${t('next')} →`}
                </button>
              </div>

              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 flex flex-col space-y-3 sm:space-y-4 lg:space-y-6 min-h-0">
            {/* Progress Section */}
            <div className="bg-black/30 backdrop-blur-xl border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-4 md:p-6 shadow-2xl relative overflow-hidden flex-shrink-0">
              {/* Galaxy Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 rounded-xl sm:rounded-2xl"></div>
              <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gradient-radial from-white/10 to-transparent rounded-full blur-md sm:blur-lg"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4 sm:mb-4">
                  <div className="w-6 h-6 sm:w-6 sm:h-6 bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-full flex items-center justify-center backdrop-blur-sm border border-purple-400/50">
                    <span className="text-purple-300 text-sm sm:text-sm">🧠</span>
                  </div>
                  <h3 className="font-bold text-white text-sm sm:text-base">{t('progress')}</h3>
                </div>
                
                <div className="mb-4 sm:mb-4">
                  <div className="flex justify-between text-xs sm:text-sm text-gray-300 mb-2">
                    <span>{Object.keys(answers).length}/{allQuestions.length}</span>
                    <span>{Math.round((Object.keys(answers).length / allQuestions.length) * 100)}% {t('complete')}</span>
                  </div>
                  <div className="w-full bg-black/30 rounded-full h-2 sm:h-2 border border-white/20">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 sm:h-2 rounded-full transition-all duration-300 shadow-lg"
                      style={{ width: `${(Object.keys(answers).length / allQuestions.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
               
                
              </div>
            </div>

            {/* Questions Section - Scrollable */}
            <div className="bg-black/30 backdrop-blur-xl border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-4 md:p-6 shadow-2xl relative overflow-hidden flex-1 min-h-0 flex flex-col">
              {/* Galaxy Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 rounded-xl sm:rounded-2xl"></div>
              <div className="absolute bottom-0 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-radial from-blue-400/20 to-transparent rounded-full blur-sm sm:blur-md"></div>
              <div className="relative z-10 flex flex-col h-full">
                <h3 className="font-bold text-white mb-4 sm:mb-4 text-sm sm:text-base flex-shrink-0">{t('questions')}</h3>
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-400/30 scrollbar-track-transparent max-h-48 sm:max-h-60 md:max-h-72">
                  <div className="grid grid-cols-5 sm:grid-cols-5 gap-2 sm:gap-3 md:gap-4 pb-4">
                    {allQuestions.map((_, index) => {
                      const isAnswered = answers[index] !== undefined && answers[index] !== '';
                      const isCurrent = index === currentQuestion;
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            const targetQuestion = allQuestions[index];
                            const targetAnswer = answers[index];
                            
                            setCurrentQuestion(index);
                            
                            // Set the selected choice if there's an answer for this question
                            if (targetAnswer && targetQuestion) {
                              const selectedChoice = targetQuestion.answers?.find(c => c.answer === targetAnswer);
                              setSelectedChoiceId(selectedChoice?.id || null);
                              setIsAnswered(true);
                            } else {
                              setSelectedChoiceId(null);
                              setIsAnswered(false);
                            }
                            setShowResult(false);
                          }}
                          className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 backdrop-blur-sm relative ${
                            isCurrent
                              ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg border border-purple-400/50'
                              : isAnswered
                              ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg border border-green-400/50'
                              : 'bg-gradient-to-br from-red-500/20 to-red-600/20 text-red-300 hover:bg-red-500/30 border border-red-400/30 hover:border-red-300'
                          }`}
                          title={isAnswered ? `${t('question')} ${index + 1} - ${t('alreadyAnswered')}` : `${t('question')} ${index + 1} - ${t('notAnsweredYet')}`}
                        >
                          {index + 1}
                          {isAnswered && (
                            <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3 h-3 sm:w-3 sm:h-3 bg-green-400 rounded-full border border-white/50"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Legend */}
                <div className="mt-4 sm:mt-4 space-y-2 sm:space-y-2 flex-shrink-0">
                  <div className="flex items-center gap-2 sm:gap-2 text-xs text-gray-300">
                    <div className="w-3 h-3 sm:w-3 sm:h-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded"></div>
                    <span className="text-xs">{t('currentQuestion')}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-2 text-xs text-gray-300">
                    <div className="w-3 h-3 sm:w-3 sm:h-3 bg-gradient-to-br from-green-500 to-green-600 rounded"></div>
                    <span className="text-xs">{t('answered')}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-2 text-xs text-gray-300">
                    <div className="w-3 h-3 sm:w-3 sm:h-3 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded border border-red-400/30"></div>
                    <span className="text-xs">{t('unanswered')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Finish Dialog */}
      {showFinishDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black/30 backdrop-blur-xl border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl max-w-sm sm:max-w-md w-full relative overflow-hidden">
            {/* Galaxy Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 rounded-xl sm:rounded-2xl"></div>
            <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gradient-radial from-white/10 to-transparent rounded-full blur-md sm:blur-lg"></div>
            <div className="relative z-10 text-center">
              <div className="mb-3 sm:mb-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                  <span className="text-lg sm:text-xl md:text-2xl">✓</span>
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2">{t('quizComplete')}</h3>
                <p className="text-gray-300 text-xs sm:text-sm">
                  {t('allQuestionsAnswered')}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-white/10">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-gray-300">{t('totalQuestions')}:</span>
                  <span className="text-white font-semibold">{allQuestions.length}</span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm mt-2">
                  <span className="text-gray-300">{t('answered')}:</span>
                  <span className="text-green-400 font-semibold">{Object.keys(answers).length}</span>
                </div>
              </div>
              <p className="text-gray-300 mb-4 sm:mb-6 text-xs sm:text-sm">
                {t('areYouSureFinishQuiz')} {t('cannotChangeAnswers')}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
                <button
                  onClick={() => setShowFinishDialog(false)}
                  className="px-4 sm:px-6 py-2 rounded-lg border border-white/30 text-white/70 bg-black/20 backdrop-blur-sm hover:bg-white/10 transition-all duration-200 text-sm sm:text-base"
                >
                  {t('continue')}
                </button>
                <button
                  onClick={() => {
                    // Calculate final score
                    let finalScore = 0;
                    let finalCorrect = 0;
                    
                    allQuestions.forEach((question, index) => {
                      const userAnswer = answers[index];
                      if (userAnswer) {
                        const correctChoice = question.answers?.find(c => c.is_correct);
                        if (correctChoice && correctChoice.choice_text === userAnswer) {
                          finalScore += 10;
                          finalCorrect += 1;
                        }
                      }
                    });
                    
                    // Update store with final scores
                    setScore(finalScore);
                    setCorrectAnswers(finalCorrect);
                    
                    // Clean up localStorage
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem(`tryout-answers-${gameCode}`);
                      localStorage.removeItem(`tryout-current-question-${gameCode}`);
                      localStorage.removeItem(`tryout-time-left-${gameCode}`);
                      localStorage.removeItem(`tryout-questions-${gameCode}`);
                      localStorage.removeItem(`tryout-seed-${gameCode}`);
                      localStorage.removeItem(`tryout-quiz-data-${gameCode}`);
                      localStorage.removeItem(`tryout-game-settings-${gameCode}`);
                      localStorage.removeItem(`tryout-player-name-${gameCode}`);
                      localStorage.removeItem(`tryout-show-finish-dialog-${gameCode}`);
                      localStorage.removeItem(`tryout-show-unanswered-dialog-${gameCode}`);
                      localStorage.removeItem(`tryout-unanswered-questions-${gameCode}`);
                    }
                    
                    // Redirect to results
                    router.push(`/tryout-result/${gameCode}`);
                  }}
                  className="px-4 sm:px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white backdrop-blur-sm hover:from-purple-500 hover:to-blue-500 transition-all duration-200 shadow-lg text-sm sm:text-base"
                >
                  {t('finish')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unanswered Questions Dialog */}
      {showUnansweredDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-black/30 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl max-w-2xl w-full my-8 relative">
            {/* Galaxy Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 rounded-2xl"></div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-radial from-white/10 to-transparent rounded-full blur-lg"></div>
            
            {/* Header */}
            <div className="relative z-10 text-center p-6 pb-4">
              <div className="mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-2xl">⚠</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{t('stillUnanswered')}!</h3>
                <p className="text-gray-300 text-sm">
                  {t('youStillHave')} {unansweredQuestions.length} {t('questionsNotAnswered')}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 mb-4 border border-white/10">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-300">{t('totalQuestions')}:</span>
                  <span className="text-white font-semibold">{allQuestions.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-300">{t('answered')}:</span>
                  <span className="text-green-400 font-semibold">{Object.keys(answers).length}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-300">{t('unanswered')}:</span>
                  <span className="text-red-400 font-semibold">{unansweredQuestions.length}</span>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="relative z-10 px-6 pb-4 max-h-80 overflow-y-auto">
              <div className="mb-4">
                <p className="text-gray-300 mb-3 text-sm text-center">{t('unansweredQuestions')}</p>
                <div className="grid grid-cols-5 gap-2">
                  {unansweredQuestions.map((questionIndex) => (
                    <span
                      key={questionIndex}
                      className="px-3 py-2 bg-red-500/20 text-red-300 border border-red-400/30 rounded-full text-sm font-medium text-center"
                    >
                      {t('questionNumber')} {questionIndex + 1}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 p-6 pt-4 border-t border-white/10">
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowUnansweredDialog(false)}
                  className="px-6 py-2 rounded-lg border border-white/30 text-white/70 bg-black/20 backdrop-blur-sm hover:bg-white/10 transition-all duration-200"
                >
                  {t('close')}
                </button>
                <button
                  onClick={() => {
                    // Go to first unanswered question
                    const firstUnanswered = unansweredQuestions[0];
                    console.log("Going to unanswered question:", firstUnanswered);
                    setCurrentQuestion(firstUnanswered);
                    setSelectedChoiceId(null);
                    setIsAnswered(false);
                    setShowResult(false);
                    setShowUnansweredDialog(false);
                  }}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 text-white backdrop-blur-sm hover:from-red-500 hover:to-orange-500 transition-all duration-200 shadow-lg"
                >
                  {t('answerNow')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back Confirmation Dialog */}
      {showBackConfirmationDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/30 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 relative overflow-hidden">
            {/* Galaxy Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 rounded-2xl"></div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-radial from-white/10 to-transparent rounded-full blur-lg"></div>
            <div className="relative z-10 text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-2xl">⚠</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{t('exitConfirmation')}</h3>
                <p className="text-gray-300 text-sm">
                  {t('areYouSureExitQuiz')}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-300">{t('currentProgress')}</span>
                  <span className="text-white font-semibold">{Object.keys(answers).length}/{allQuestions.length} {t('questions')}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-300">{t('timeRemaining')}</span>
                  <span className="text-blue-400 font-semibold">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                </div>
              </div>
              <p className="text-gray-300 mb-6 text-sm">
                {t('progressWillBeSaved')}
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowBackConfirmationDialog(false)}
                  className="px-6 py-2 rounded-lg border border-white/30 text-white/70 bg-black/20 backdrop-blur-sm hover:bg-white/10 transition-all duration-200"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={() => {
                    // Clean up localStorage
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem(`tryout-answers-${gameCode}`);
                      localStorage.removeItem(`tryout-current-question-${gameCode}`);
                      localStorage.removeItem(`tryout-time-left-${gameCode}`);
                      localStorage.removeItem(`tryout-questions-${gameCode}`);
                      localStorage.removeItem(`tryout-seed-${gameCode}`);
                      localStorage.removeItem(`tryout-quiz-data-${gameCode}`);
                      localStorage.removeItem(`tryout-game-settings-${gameCode}`);
                      localStorage.removeItem(`tryout-player-name-${gameCode}`);
                      localStorage.removeItem(`tryout-show-finish-dialog-${gameCode}`);
                      localStorage.removeItem(`tryout-show-unanswered-dialog-${gameCode}`);
                      localStorage.removeItem(`tryout-unanswered-questions-${gameCode}`);
                    }
                    
                    // Reset game state but keep tryout mode
                    resetGameKeepMode();
                    
                    // Navigate back
                    router.push("/select-quiz");
                  }}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 text-white backdrop-blur-sm hover:from-orange-500 hover:to-red-500 transition-all duration-200 shadow-lg"
                >
                  {t('exit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
