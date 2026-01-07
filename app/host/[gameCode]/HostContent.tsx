"use client"

import React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import {
  Play,
  Users,
  QrCode,
  Clock,
  UsersRound,
  Timer,
  HelpCircle,
  Copy,
  Check,
  Trophy,
  Medal,
  Award,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  UserX,
  Home,
  RotateCw,
  LogOut,
  X,
  Sparkles,
  Rocket,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGameStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"
import { supabaseB, isSupabaseBAvailable } from "@/lib/supabase-b"
import { finalizeGame, syncGameToMainDatabase } from "@/lib/sync-manager"
import { getGameSessionByPin, createGameSession, updateGameSession, subscribeToGameSession } from "@/lib/sessions-api"
import { getParticipantsByGameId, subscribeToGameParticipants } from "@/lib/participants-api"
import { generateGameCode } from "@/lib/game-utils"
import { fetchQuizzes } from "@/lib/dummy-data"
import { toast, Toaster } from "sonner"
import Image, { type StaticImageData } from "next/image"
import type { Quiz, Player } from "@/lib/types"
import { RulesDialog } from "@/components/rules-dialog"
import { QRCodeModal } from "@/components/qr-code-modal"
import { syncServerTime } from "@/lib/server-time"
import { getFirstName, formatDisplayName } from "@/lib/utils"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/locales/translations"
import { generateXID } from "@/lib/id-generator"
import { getDisplayName } from "@/lib/player-name"
import { PodiumLeaderboard, SmartNameDisplay, StableScoreDisplay, type PlayerProgress } from "./leaderboard"

// Fallback translator for non-hook helpers in this module
const tStatic = (key: keyof typeof translations['en']) => {
  try {
    const lang = typeof window !== 'undefined' ? (localStorage.getItem('i18nextLng') || 'en') : 'en'
    const dict = (translations as any)[lang] || translations.en
    return dict[key] || key
  } catch {
    return (translations as any).en[key] || String(key)
  }
}


// === TYPES ===
interface HostContentProps {
  gameCode: string
}

// === STABLE PROGRESS BAR ===
const StableProgressBar = React.memo(({
  playerId,
  currentQuestion,
  totalQuestions
}: {
  playerId: string;
  currentQuestion: number;
  totalQuestions: number;
}) => {
  const [displayProgress, setDisplayProgress] = useState(currentQuestion)

  useEffect(() => {
    // Only update if progress actually increased
    if (currentQuestion > displayProgress) {
      setDisplayProgress(currentQuestion)
    }
  }, [currentQuestion, displayProgress])

  const percentage = totalQuestions > 0 ? (displayProgress / totalQuestions) * 100 : 0

  return (
    <div className="flex-1 h-3 bg-white/30 rounded-full overflow-hidden border border-white/40 select-none pointer-events-none cursor-default">
      <motion.div
        className="h-full bg-gradient-to-r from-green-400 to-green-500 shadow-sm select-none pointer-events-none"
        initial={{ width: `${percentage}%` }}
        animate={{ width: `${Math.min(percentage, 100)}%` }}
        transition={{ duration: 0.4, ease: "easeOut", type: "tween" }}
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      />
    </div>
  )
})
StableProgressBar.displayName = "StableProgressBar"

// === HOST CONTENT COMPONENT ===
export default function HostContent({ gameCode }: HostContentProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const [gameId, setGameId] = useState<string | null>(null)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)

  const [players, setPlayers] = useState<Player[]>([])
  const [playerProgress, setPlayerProgress] = useState<PlayerProgress[]>([])

  const [quizStarted, setQuizStarted] = useState(false)
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [quizTimeLeft, setQuizTimeLeft] = useState(0)
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [quizManuallyEnded, setQuizManuallyEnded] = useState(false)

  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const [showExitModal, setShowExitModal] = useState(false)
  const [showEndQuizModal, setShowEndQuizModal] = useState(false)
  const [showKickModal, setShowKickModal] = useState(false)
  const [playerToKick, setPlayerToKick] = useState<{ id: string; name: string } | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isSupabaseBSession, setIsSupabaseBSession] = useState(false)
  const isExitingRef = useRef(false)

  const [countdownLeft, setCountdownLeft] = useState<number | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)

  // Debounced updatePlayerProgress to prevent flickering
  const debouncedUpdateProgress = useRef<NodeJS.Timeout>()
  const updateQueue = useRef<Set<string>>(new Set())
  const isUpdating = useRef(false)
  const hasFinishedGame = useRef(false) // Track if game has been finished to prevent loop
  // Pagination states
  const [currentPlayerPage, setCurrentPlayerPage] = useState(0)
  const [currentProgressPage, setCurrentProgressPage] = useState(0)
  const [slideDirection, setSlideDirection] = useState(0) // -1 for left, 1 for right
  const PLAYERS_PER_PAGE = 20 // 4 rows x 5 columns (2xl), 5 rows x 4 columns (xl), etc.

  // Store previous progress values to prevent unnecessary resets
  const prevProgressRef = useRef<Map<string, number>>(new Map())

  const { setGameCode, setQuizId, setIsHost, gameSettings, setGameSettings } = useGameStore()
  const [joinUrl, setJoinUrl] = useState("")
  const [hostId, setHostId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    setJoinUrl(`${window.location.origin}/?code=${gameCode}`)
  }, [gameCode])

  const calculateRanking = (players: PlayerProgress[]): PlayerProgress[] => {
    return players
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({
        ...player,
        rank: index + 1,
      }))
  }

  // Pagination helper functions
  const getPaginatedPlayers = (playersList: Player[], page: number) => {
    const startIndex = page * PLAYERS_PER_PAGE
    const endIndex = startIndex + PLAYERS_PER_PAGE
    return playersList.slice(startIndex, endIndex)
  }

  const getPaginatedProgress = (progressList: PlayerProgress[], page: number) => {
    const startIndex = page * PLAYERS_PER_PAGE
    const endIndex = startIndex + PLAYERS_PER_PAGE
    return progressList.slice(startIndex, endIndex)
  }

  const getTotalPages = (totalItems: number) => {
    return Math.ceil(totalItems / PLAYERS_PER_PAGE)
  }

  // Animation variants for sliding transitions
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.8,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.8,
    }),
  }

  const slideTransition = {
    x: { type: "spring" as const, stiffness: 300, damping: 30 },
    opacity: { duration: 0.2 },
    scale: { duration: 0.2 },
  }

  // Pagination component with slide direction tracking
  const PaginationControls = ({
    currentPage,
    totalPages,
    onPageChange,
    onDirectionChange
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onDirectionChange: (direction: number) => void;
  }) => {
    if (totalPages <= 1) return null;

    const handlePrevious = () => {
      const newPage = Math.max(0, currentPage - 1);
      if (newPage !== currentPage) {
        onDirectionChange(-1);
        onPageChange(newPage);
      }
    };

    const handleNext = () => {
      const newPage = Math.min(totalPages - 1, currentPage + 1);
      if (newPage !== currentPage) {
        onDirectionChange(1);
        onPageChange(newPage);
      }
    };

    const handlePageClick = (page: number) => {
      if (page !== currentPage) {
        onDirectionChange(page > currentPage ? 1 : -1);
        onPageChange(page);
      }
    };

    return (
      <div className="flex items-center justify-center gap-2 sm:gap-4 mt-4">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 0}
          className="p-1 sm:p-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="flex items-center gap-1 sm:gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => handlePageClick(i)}
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-mono transition-colors ${i === currentPage
                ? "bg-blue-500 text-white"
                : "bg-white/10 border border-white/20 hover:bg-white/20"
                }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages - 1}
          className="p-1 sm:p-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!gameCode || typeof gameCode !== "string") {
        toast.error("Invalid game code!")
        router.replace("/")
        return
      }

      // Try Supabase B first (new sessions)
      let sessionFromB = await getGameSessionByPin(gameCode.toUpperCase())

      if (sessionFromB) {
        // Session found in Supabase B
        const sessionQuizId = sessionFromB.quiz_id
        setGameId(sessionFromB.id)
        setGameCode(gameCode)
        setQuizId(sessionQuizId)
        setHostId(sessionFromB.host_id)
        setIsSupabaseBSession(true)
        setGameSettings({
          timeLimit: sessionFromB.settings?.timeLimit || 10,
          questionCount: sessionFromB.settings?.questionCount || 10
        })
        setIsHost(true)
        setQuizStarted(sessionFromB.status === 'active')
        setStartedAt(sessionFromB.timestamps?.started_at || null)
        setShowLeaderboard(sessionFromB.status === 'finish')

        // Fetch initial players from Supabase B participant table
        const participants = await getParticipantsByGameId(sessionFromB.id)
        console.log('[Host] Fetched participants from Supabase B:', participants)
        const playersData = participants.map((p) => ({
          id: p.id,
          name: p.nickname,
          nickname: p.nickname,
          avatar: p.avatar || '',
          score: p.score || 0,
          joined_at: p.joined_at || new Date().toISOString()
        }))
        console.log('[Host] Setting players:', playersData)
        setPlayers(playersData as any)

        const quizzes = await fetchQuizzes()
        const found = quizzes.find((q) => q.id === sessionQuizId)
        if (!found) {
          toast.error("Quiz not found!")
          router.replace("/")
          return
        }
        setQuiz(found)
        setLoading(false)
        return
      }

      // Fallback to main Supabase (legacy sessions)
      const { data: gameData, error: gameErr } = await supabase
        .from("game_sessions")
        .select(
          "id, quiz_id, total_time_minutes, question_limit, status, countdown_started_at, started_at, participants, responses, host_id",
        )
        .eq("game_pin", gameCode.toUpperCase())
        .single()

      if (gameErr || !gameData) {
        toast.error("Game not found!")
        router.replace("/")
        return
      }

      setGameId(gameData.id)
      setGameCode(gameCode)
      setQuizId(gameData.quiz_id)
      setHostId(gameData.host_id || "01mdpz2b00100000000p") // Use existing host_id or default
      setGameSettings({
        timeLimit: gameData.total_time_minutes > 100 ? Math.round(gameData.total_time_minutes / 60) : gameData.total_time_minutes, // Handle legacy data
        questionCount: gameData.question_limit === 'all' ? 999 : parseInt(gameData.question_limit)
      })
      setIsHost(true)
      setQuizStarted(gameData.status === 'active')
      setStartedAt(gameData.started_at)
      setShowLeaderboard(gameData.status === 'finished')

      const quizzes = await fetchQuizzes()
      const found = quizzes.find((q) => q.id === gameData.quiz_id)
      if (!found) {
        toast.error("Quiz not found!")
        router.replace("/")
        return
      }
      setQuiz(found)
      setLoading(false)
    }
    fetchData()
  }, [gameCode, router, setGameCode, setGameId, setQuizId, setGameSettings, setIsHost])

  const handleRestart = useCallback(async () => {
    if (!quiz || !gameSettings) {
      toast.error("Cannot restart: Quiz or settings not available")
      return
    }

    try {
      // Generate new game code and ID
      const newGameCode = generateGameCode()
      const newGameId = generateXID()

      // Create new game session in Supabase B
      const session = await createGameSession({
        id: newGameId,
        game_pin: newGameCode,
        quiz_id: quiz.id,
        quiz_title: quiz.title,
        host_id: hostId || generateXID(),
        status: "waiting",
        settings: {
          timeLimit: gameSettings.timeLimit,
          questionCount: gameSettings.questionCount,
          application: "space-quiz"
        },
        timestamps: {
          created_at: new Date().toISOString()
        }
      })

      if (!session) {
        toast.error("Failed to create new game session")
        return
      }

      // Update store with new game code
      setGameCode(session.game_pin)
      setGameId(session.id)
      setQuizId(quiz.id)

      // Navigate to new game host page
      router.push(`/host/${session.game_pin}`)
      toast.success("New game session created!")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

      toast.error(`Failed to restart game: ${errorMessage}`)
    }
  }, [quiz, gameSettings, hostId, router, setGameCode, setGameId, setQuizId])

  const handleHome = useCallback(() => {
    router.push("/")
  }, [router])

  const updatePlayerProgress = useCallback(async () => {
    if (!gameId || !quiz || isUpdating.current) return

    isUpdating.current = true

    try {
      let playersData: any[] = []
      let answers: any[] = []

      if (isSupabaseBSession) {
        // Fetch from Supabase B
        const participants = await getParticipantsByGameId(gameId)
        playersData = participants.map((p) => ({
          id: p.id,
          name: p.nickname,
          nickname: p.nickname,
          avatar: p.avatar || '',
          score: p.score || 0,
          questions_answered: p.questions_answered || 0,
          joined_at: p.joined_at || new Date().toISOString()
        }))
        answers = []
      } else {
        // Get game session data with participants and responses
        const { data: gameSession, error: gameError } = await supabase
          .from("game_sessions")
          .select("participants, responses")
          .eq("id", gameId)
          .single()

        if (gameError) {
          return
        }

        playersData = gameSession.participants || []
        // Filter out mini-game responses
        answers = (gameSession.responses || []).filter((r: any) => r.question_id !== 'mini-game')
      }

      const progressMap = new Map<string, PlayerProgress>()

      playersData.forEach((player: any) => {
        let answeredQuestions = 0
        let score = player.score || 0
        const totalQuestions = gameSettings.questionCount || 10

        if (isSupabaseBSession) {
          // Use questions_answered from Supabase B participant
          answeredQuestions = player.questions_answered || 0
        } else {
          // Calculate from answers for legacy sessions
          const playerAnswers = answers.filter((a: any) => a.player_id === player.id)
          const uniqueQuestionIds = new Set(playerAnswers.map((a: any) => a.question_id))
          answeredQuestions = uniqueQuestionIds.size

          const calculatedScore = playerAnswers.reduce((sum: number, a: any) => sum + (a.points_earned || 0), 0)
          // Prevent score from flickering to 0 by using the higher value
          score = Math.max(player.score || 0, calculatedScore)
        }

        progressMap.set(player.id, {
          id: player.id,
          name: player.nickname ?? player.name,
          avatar: player.avatar || "/placeholder.svg?height=40&width=40&text=Player",
          score,
          currentQuestion: answeredQuestions,
          totalQuestions,
          isActive: answeredQuestions < totalQuestions,
          rank: 0,
        })
      })

      const sorted = Array.from(progressMap.values()).sort((a, b) => b.score - a.score)
      const ranked = sorted.map((p, idx) => ({ ...p, rank: idx + 1 }))

      // Batch update with better change detection
      setPlayerProgress(prev => {
        // More efficient change detection - only check essential fields
        const hasChanges = prev.length !== ranked.length ||
          prev.some((oldPlayer, index) => {
            const newPlayer = ranked[index]
            return !newPlayer ||
              oldPlayer.id !== newPlayer.id ||
              oldPlayer.score !== newPlayer.score ||
              oldPlayer.currentQuestion !== newPlayer.currentQuestion ||
              oldPlayer.rank !== newPlayer.rank
          })

        if (!hasChanges) {
          return prev
        }

        return ranked
      })

      // Only check for completion if quiz is actually started and active
      if (quizStarted && !showLeaderboard) {
        // Get only players who have actually joined and participated
        const activePlayers = ranked.filter((p) => p.currentQuestion > 0)

        // Check if ALL active players have completed their questions
        const allActivePlayersCompleted = activePlayers.length > 0 && activePlayers.every((p) => p.currentQuestion >= p.totalQuestions)

        // Check if there are players still actively answering questions
        const hasPlayersStillActive = activePlayers.some((p) => p.currentQuestion < p.totalQuestions)



        // Only finish game if:
        // 1. Quiz is actually started
        // 2. There are active players who have answered questions
        // 3. ALL active players have completed their questions
        // 4. Game is not already finished
        // 5. Quiz was not manually ended
        // 6. Quiz has been running for a reasonable time
        // 7. Players have answered a reasonable number of questions (not just 1)
        const minQuestionsRequired = Math.max(3, Math.floor((gameSettings.questionCount || 10) * 0.3)) // At least 30% of questions or 3 questions minimum

        if (activePlayers.length > 0 && allActivePlayersCompleted && !hasPlayersStillActive && !quizManuallyEnded) {
          // Additional check: ensure players have answered enough questions
          const allPlayersAnsweredEnough = activePlayers.every((p) => p.currentQuestion >= minQuestionsRequired)

          if (!allPlayersAnsweredEnough) {
            return
          }

          // Additional safety check: ensure quiz has been running for at least 30 seconds
          let quizStartedAt: string | null = null

          if (isSupabaseBSession) {
            // Fetch from Supabase B
            const { data } = await supabaseB
              .from("sessions")
              .select("timestamps")
              .eq("id", gameId)
              .single()
            quizStartedAt = data?.timestamps?.started_at || null
          } else {
            // Fetch from main Supabase
            const { data } = await supabase
              .from("game_sessions")
              .select("started_at")
              .eq("id", gameId)
              .single()
            quizStartedAt = data?.started_at || null
          }

          if (quizStartedAt) {
            const startTime = new Date(quizStartedAt).getTime()
            const currentTime = Date.now()
            const quizDuration = currentTime - startTime

            // Only auto-finish if quiz has been running for at least 30 seconds
            if (quizDuration > 30000) { // 30 seconds
              if (isSupabaseBSession) {
                // Get current timestamps and merge
                const { data: currentSession } = await supabaseB
                  .from("sessions")
                  .select("timestamps")
                  .eq("id", gameId)
                  .single()

                const currentTimestamps = currentSession?.timestamps || {}
                let parsedTimestamps = currentTimestamps;
                if (typeof parsedTimestamps === 'string') {
                  try {
                    parsedTimestamps = JSON.parse(parsedTimestamps);
                    if (typeof parsedTimestamps === 'string') parsedTimestamps = JSON.parse(parsedTimestamps);
                  } catch (e) {
                    console.error("Failed to parse timestamps in auto-finish", e);
                    if (typeof parsedTimestamps === 'string') parsedTimestamps = {};
                  }
                }

                await supabaseB
                  .from("sessions")
                  .update({
                    status: 'finish',
                    timestamps: {
                      ...parsedTimestamps,
                      ended_at: new Date().toISOString()
                    }
                  })
                  .eq("id", gameId)

                // Sync to main database
                if (gameId) syncGameToMainDatabase(gameId).catch(err =>
                  console.error("[Host] Auto-finish sync failed:", err)
                )
              } else {
                await supabase
                  .from("game_sessions")
                  .update({ status: 'finished', ended_at: new Date().toISOString() })
                  .eq("id", gameId)
              }
              setShowLeaderboard(true)
            }
          }
        } else if (quizManuallyEnded) {
        } else if (activePlayers.length === 0) {
        } else if (hasPlayersStillActive) {
        } else if (!allActivePlayersCompleted) {
        }
      }
    } catch (error) {

    } finally {
      isUpdating.current = false
    }
  }, [gameId, quiz, showLeaderboard, gameSettings.questionCount, quizStarted, isSupabaseBSession])

  const fetchPlayers = useCallback(async () => {
    if (!gameId) return

    try {
      let playersData: any[] = []
      let answers: any[] = []

      if (isSupabaseBSession) {
        // Fetch from Supabase B
        const participants = await getParticipantsByGameId(gameId)
        playersData = participants.map((p) => ({
          id: p.id,
          name: p.nickname,
          nickname: p.nickname,
          avatar: p.avatar || '',
          score: p.score || 0,
          questions_answered: p.questions_answered || 0,
          joined_at: p.joined_at || new Date().toISOString()
        }))
        answers = []
      } else {
        // Fetch from main Supabase (legacy)
        const { data: gameSession, error: gameError } = await supabase
          .from("game_sessions")
          .select("participants, responses")
          .eq("id", gameId)
          .single()

        if (gameError) {
          return
        }

        playersData = gameSession.participants || []
        answers = (gameSession.responses || []).filter((r: any) => r.question_id !== 'mini-game')
      }

      setPlayers(playersData || [])

      if (playersData && playersData.length > 0) {
        const progressMap = new Map<string, PlayerProgress>()
        playersData.forEach((player: any) => {
          let answeredQuestions = 0
          let score = player.score || 0

          if (isSupabaseBSession) {
            // Use questions_answered from Supabase B participant
            answeredQuestions = player.questions_answered || 0
          } else {
            // Calculate from answers for legacy sessions
            const playerAnswers = answers.filter((a: any) => a.player_id === player.id && a.question_index >= 0)
            const uniqueQuestionIndices = new Set(playerAnswers.map((a: any) => a.question_index))
            answeredQuestions = uniqueQuestionIndices.size
          }

          progressMap.set(player.id, {
            id: player.id,
            name: player.name || player.nickname,
            avatar: player.avatar || "/placeholder.svg?height=40&width=40&text=Player",
            score,
            currentQuestion: answeredQuestions,
            totalQuestions: gameSettings.questionCount || 10,
            isActive: answeredQuestions < (gameSettings.questionCount || 10),
            rank: 0,
          })
        })

        const sorted = Array.from(progressMap.values()).sort((a, b) => b.score - a.score)
        const ranked = sorted.map((p, idx) => ({ ...p, rank: idx + 1 }))

        // Prevent unnecessary updates that could cause flickering
        setPlayerProgress(prev => {
          // Only update if there are actual changes to prevent flickering
          if (JSON.stringify(prev) === JSON.stringify(ranked)) {
            return prev
          }
          return ranked
        })
      }
    } catch (error) {
      console.error('[Host] Error fetching players:', error)
    }
  }, [gameId, gameSettings.questionCount, isSupabaseBSession])

  // Reset pagination when players change
  useEffect(() => {
    setCurrentPlayerPage(0)
  }, [players.length])

  useEffect(() => {
    setCurrentProgressPage(0)
  }, [playerProgress.length])


  // Smart useEffect for player changes with debouncing (friend's suggestion)
  const lastRefreshTime = useRef(0)
  const refreshDebounceTime = 1000 // 1 second debounce for faster response
  const [forceUpdateKey, setForceUpdateKey] = useState(0)

  useEffect(() => {
    if (!gameId || !mounted) return

    const now = Date.now()
    const timeSinceLastRefresh = now - lastRefreshTime.current

    // Only refresh if enough time has passed (prevents infinite loops)
    // Allow refresh during quiz for real-time progress updates
    if (timeSinceLastRefresh >= refreshDebounceTime) {

      lastRefreshTime.current = now

      // Debounced refresh to ensure we have the latest data
      const refreshTimeout = setTimeout(async () => {

        await fetchPlayers()
        await updatePlayerProgress()

      }, 500)

      return () => clearTimeout(refreshTimeout)
    } else {

    }
  }, [players.length, gameId, mounted, quizStarted, fetchPlayers, updatePlayerProgress])

  useEffect(() => {
    if (!gameId) return

    // Game status subscription - use appropriate database
    let gameSubscription: ReturnType<typeof supabase.channel>

    if (isSupabaseBSession) {
      // Subscribe to Supabase B sessions table
      gameSubscription = supabaseB
        .channel(`host-game-status-${gameId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${gameId}` },
          (payload) => {
            const newGameData = payload.new as any;
            const newStatus = newGameData.status;

            if (newStatus === 'finish') {
              setQuizStarted(false)
              setShowLeaderboard(true)
            } else if (newStatus === 'active') {
              setQuizStarted(true)
              // Don't force close leaderboard on active updates to prevent race conditions during finish transition
              // setShowLeaderboard(false) 
              if (newGameData.timestamps?.started_at) {
                setStartedAt(newGameData.timestamps.started_at)
              }
            }
          },
        )
        .subscribe()
    } else {
      // Legacy: Subscribe to main Supabase game_sessions table  
      gameSubscription = supabase
        .channel("game_status")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${gameId}` },
          (payload) => {
            const newStatus = payload.new.status;

            // Use if/else if to ensure state transitions are mutually exclusive.
            if (newStatus === 'finished' || newStatus === 'finish') {
              setQuizStarted(false)
              setShowLeaderboard(true)
            } else if (newStatus === 'active') {
              setQuizStarted(true)
              setShowLeaderboard(false)
              // Handle Supabase B nested timestamps
              if (payload.new.timestamps?.started_at) {
                setStartedAt(payload.new.timestamps.started_at)
              } else if (payload.new.started_at) {
                setStartedAt(payload.new.started_at)
              }
            } else if (newStatus === 'waiting' && (payload.new.timestamps?.countdown_started_at || payload.new.countdown_started_at)) {
              // This strictly handles Waiting + Countdown combo
              setQuizStarted(true)
              setShowLeaderboard(false)
            }
          },
        )
        .subscribe()
    }

    // Players subscription - use Supabase B for new sessions, main Supabase for legacy
    let playersSubscription: ReturnType<typeof supabase.channel> | null = null

    if (isSupabaseBSession) {
      // Subscribe to Supabase B participant table
      playersSubscription = supabaseB
        .channel(`host-participants-${gameId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "participant", filter: `game_id=eq.${gameId}` },
          async () => {
            // Refresh participants list from Supabase B and update progress
            const participants = await getParticipantsByGameId(gameId)
            const playersData = participants.map((p) => ({
              id: p.id,
              name: p.nickname,
              nickname: p.nickname,
              avatar: p.avatar || '',
              score: p.score || 0,
              questions_answered: p.questions_answered || 0,
              joined_at: p.joined_at || new Date().toISOString()
            }))
            setPlayers(playersData as any)

            // Update player progress with new data
            const progressMap = new Map<string, PlayerProgress>()
            playersData.forEach((player) => {
              const answeredQuestions = player.questions_answered || 0
              const totalQuestions = gameSettings.questionCount || 10

              progressMap.set(player.id, {
                id: player.id,
                name: player.name || player.nickname,
                avatar: player.avatar || "/placeholder.svg?height=40&width=40&text=Player",
                score: player.score || 0,
                currentQuestion: answeredQuestions,
                totalQuestions,
                isActive: answeredQuestions < totalQuestions,
                rank: 0,
              })
            })

            const sorted = Array.from(progressMap.values()).sort((a, b) => b.score - a.score)
            const ranked = sorted.map((p, idx) => ({ ...p, rank: idx + 1 }))
            setPlayerProgress(ranked)

            // AUTO-FINISH CHECK FOR REALTIME UPDATES
            console.log('[Host] Checking auto-finish. Started:', quizStarted, 'ShowLeaderboard:', showLeaderboard, 'Ranked:', ranked.length)

            if (quizStarted && !showLeaderboard && ranked.length > 0) {
              const activePlayers = ranked.filter(p => p.currentQuestion > 0)
              const allCompleted = activePlayers.length > 0 && activePlayers.every(p => p.currentQuestion >= p.totalQuestions)

              console.log('[Host] Active Players:', activePlayers.length, 'All Completed:', allCompleted)

              if (allCompleted) {
                // Double check duration to prevent premature finish on fast clicks (min 10s safety)
                if (startedAt) {
                  const startTime = new Date(startedAt).getTime()
                  const duration = Date.now() - startTime
                  console.log('[Host] Game Duration:', duration, 'ms')

                  if (duration > 1000) { // Reduced to 1 second to avoid delay
                    console.log('[Host] Auto-finishing game via Realtime...')

                    // Use Sync Manager to sync to main DB and update status
                    await finalizeGame(gameId)

                    setQuizStarted(false)
                    setShowLeaderboard(true)
                  } else {
                    console.log('[Host] Game too short to auto-finish')
                  }
                } else {
                  console.log('[Host] startedAt is missing, cannot check duration')
                }
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Host] Subscribed to Supabase B participants')
          }
        })
    } else {
      // Legacy: Subscribe to main Supabase game_sessions for participant updates
      playersSubscription = supabase
        .channel(`players-${gameId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${gameId}` },
          async (payload) => {
            // Check if participants array has changed
            if (payload.new.participants) {
              const participants = payload.new.participants;
              // Update players state
              setPlayers(participants);
            }
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Host] Subscribed to main Supabase participants')
          }
        })
    }

    // Debounced updatePlayerProgress to prevent flickering
    const debouncedUpdatePlayerProgress = () => {
      if (debouncedUpdateProgress.current) {
        clearTimeout(debouncedUpdateProgress.current)
      }
      debouncedUpdateProgress.current = setTimeout(() => {
        updatePlayerProgress()
      }, 500) // Increased to 500ms for better batching with many players
    }

    // Subscribe to responses changes in game_sessions
    const responsesSubscription = supabase
      .channel(`responses-${gameId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${gameId}` },
        async (payload) => {


          // Check if responses array has changed
          if (payload.new.responses) {

            // Trigger debounced progress update
            debouncedUpdatePlayerProgress()
          }
        },
      )
      .subscribe((status) => {

        if (status === 'SUBSCRIBED') {

        }
      })

    setTimeout(async () => {
      await fetchPlayers()
      await updatePlayerProgress()
    }, 50)



    return () => {
      if (isSupabaseBSession) {
        supabaseB.removeChannel(gameSubscription)
      } else {
        supabase.removeChannel(gameSubscription)
      }
      if (playersSubscription) {
        if (isSupabaseBSession) {
          supabaseB.removeChannel(playersSubscription)
        } else {
          supabase.removeChannel(playersSubscription)
        }
      }
      supabase.removeChannel(responsesSubscription)

      // Cleanup debounced update
      if (debouncedUpdateProgress.current) {
        clearTimeout(debouncedUpdateProgress.current)
      }
    }
  }, [gameId, fetchPlayers, updatePlayerProgress, isSupabaseBSession, quizStarted, showLeaderboard, startedAt, gameSettings])

  useEffect(() => {
    if (!quizStarted || !gameSettings?.timeLimit) return

    let unsub = () => { }
    let timerInterval: NodeJS.Timeout | null = null
    let clientOffset = 0

    // Start timer logic when startedAt is available
    const startTimer = async () => {
      if (!startedAt) return

      // Get server time offset ONCE to sync with player timer
      const serverNow = await syncServerTime()
      clientOffset = serverNow - Date.now()

      const start = new Date(startedAt).getTime()
      const limitMs = gameSettings.timeLimit * 60 * 1000 // Convert minutes to milliseconds

      // Track last time to prevent backwards movement
      let lastTimeLeft = Infinity

      const tick = () => {
        const now = Date.now() + clientOffset
        const remain = Math.max(0, start + limitMs - now)
        const newTimeLeft = Math.floor(remain / 1000)

        // Only update if time decreased (prevents glitch going backwards)
        if (newTimeLeft <= lastTimeLeft) {
          lastTimeLeft = newTimeLeft
          setQuizTimeLeft(newTimeLeft)
        }

        if (remain <= 0 && !hasFinishedGame.current) {
          hasFinishedGame.current = true
          setIsTimerActive(false)

          // Clear interval before async operations
          if (timerInterval) {
            clearInterval(timerInterval)
            timerInterval = null
          }

          // Update game status to finished
          (async () => {
            try {
              const endedAt = new Date().toISOString()

              if (isSupabaseBSession) {
                const { data: currentSession } = await supabaseB
                  .from("sessions")
                  .select("timestamps")
                  .eq("id", gameId)
                  .single()

                const currentTimestamps = currentSession?.timestamps || {}
                let parsedTimestamps = currentTimestamps;
                if (typeof parsedTimestamps === 'string') {
                  try {
                    parsedTimestamps = JSON.parse(parsedTimestamps);
                    if (typeof parsedTimestamps === 'string') parsedTimestamps = JSON.parse(parsedTimestamps);
                  } catch (e) {
                    console.error("Failed to parse timestamps in timer-end", e);
                    if (typeof parsedTimestamps === 'string') parsedTimestamps = {};
                  }
                }

                await supabaseB
                  .from("sessions")
                  .update({
                    status: 'finish',
                    timestamps: {
                      ...parsedTimestamps,
                      ended_at: endedAt
                    }
                  })
                  .eq("id", gameId)

                // Sync to main database
                if (gameId) syncGameToMainDatabase(gameId).catch(err =>
                  console.error("[Host] Timer-end sync failed:", err)
                )

                // Success for Supabase B
                setQuizStarted(false)
                setShowLeaderboard(true)
              } else {
                const { error } = await supabase
                  .from("game_sessions")
                  .update({
                    status: 'finished',
                    ended_at: endedAt
                  })
                  .eq("id", gameId)

                if (!error) {
                  // Show leaderboard on host page (no navigation)
                  setQuizStarted(false)
                  setShowLeaderboard(true)
                }
              }
            } catch (err) {
              console.error("Error ending game on timer:", err)
            }
          })()
        }
      }

      // Run first tick immediately
      tick()

      // Then run every second
      timerInterval = setInterval(tick, 1000)

      unsub = () => {
        if (timerInterval) {
          clearInterval(timerInterval)
        }
      }
    }

    startTimer()

    return unsub
  }, [quizStarted, gameSettings?.timeLimit, gameId, startedAt])

  useEffect(() => {
    if (!quizStarted || !gameId) return

    let countdownInterval: NodeJS.Timeout | null = null
    let countdownServerOffset = 0
    let countdownStartTime: number | null = null
    let lastCountdownValue = Infinity

    const initCountdown = async () => {
      try {
        let countdownStartedAt: string | null = null
        let sessionStartedAt: string | null = null

        if (isSupabaseBSession) {
          // Fetch from Supabase B
          const { data } = await supabaseB
            .from("sessions")
            .select("timestamps")
            .eq("id", gameId)
            .single()
          countdownStartedAt = data?.timestamps?.countdown_started_at || null
          sessionStartedAt = data?.timestamps?.started_at || null
        } else {
          // Fetch from main Supabase
          const { data } = await supabase
            .from("game_sessions")
            .select("countdown_started_at, started_at")
            .eq("id", gameId)
            .single()
          countdownStartedAt = data?.countdown_started_at || null
          sessionStartedAt = data?.started_at || null
        }

        if (!countdownStartedAt) return

        // Get server time offset ONCE
        const serverTime = await syncServerTime()
        countdownServerOffset = serverTime - Date.now()
        countdownStartTime = new Date(countdownStartedAt).getTime()

        // Synchronous tick function - no async operations
        const tick = () => {
          if (!countdownStartTime) return

          const now = Date.now() + countdownServerOffset
          const elapsed = Math.floor((now - countdownStartTime) / 1000)
          const left = Math.max(0, 10 - elapsed)

          // Only update if countdown decreased (prevents going backwards)
          if (left <= lastCountdownValue && left >= 0 && left <= 10) {
            lastCountdownValue = left
            setCountdownLeft(left)
          }

          // Handle countdown finish
          if (left === 0) {
            if (countdownInterval) {
              clearInterval(countdownInterval)
              countdownInterval = null
            }

            // Set started_at when countdown finishes
            if (!sessionStartedAt) {
              const newStartedAt = new Date(Date.now() + countdownServerOffset).toISOString();

              (async () => {
                try {
                  if (isSupabaseBSession) {
                    // Get current timestamps and merge
                    const { data: currentSession } = await supabaseB
                      .from("sessions")
                      .select("timestamps")
                      .eq("id", gameId)
                      .single()

                    const currentTimestamps = currentSession?.timestamps || {}

                    await supabaseB
                      .from("sessions")
                      .update({
                        timestamps: {
                          ...currentTimestamps,
                          started_at: newStartedAt
                        }
                      })
                      .eq("id", gameId)

                    setStartedAt(newStartedAt)
                  } else {
                    await supabase
                      .from("game_sessions")
                      .update({ started_at: newStartedAt, status: 'active' })
                      .eq("id", gameId)
                  }
                } catch (err) {
                  console.error("[HOST] Error setting started_at:", err)
                }
              })()
            }
          }
        }

        // Run first tick immediately
        tick()

        // Then tick every 100ms for smoother countdown (sync with player)
        countdownInterval = setInterval(tick, 100)
      } catch (error) {
        console.error("[HOST] Error initializing countdown:", error)
        setCountdownLeft(0)
      }
    }

    initCountdown()

    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }
    }
  }, [quizStarted, gameId, isSupabaseBSession])

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gameCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const startQuiz = async () => {
    if (players.length === 0) {
      toast.error("❌ No players have joined!")
      return
    }
    setIsStarting(true)
    hasFinishedGame.current = false // Reset flag when starting new game
    try {
      const startAt = new Date().toISOString()

      if (isSupabaseBSession) {
        // Update Supabase B sessions table with proper JSONB merge
        // First get current timestamps
        const { data: currentSession } = await supabaseB
          .from("sessions")
          .select("timestamps")
          .eq("id", gameId)
          .single()

        let currentTimestamps = currentSession?.timestamps || {}
        if (typeof currentTimestamps === 'string') {
          try {
            currentTimestamps = JSON.parse(currentTimestamps);
          } catch (e) {
            console.error("Failed to parse existing timestamps in startQuiz", e);
            currentTimestamps = {};
          }
        }

        await supabaseB
          .from("sessions")
          .update({
            status: 'active',
            timestamps: {
              ...currentTimestamps,
              countdown_started_at: startAt
            }
          })
          .eq("id", gameId)
      } else {
        // Legacy: Update main Supabase game_sessions table
        await supabase
          .from("game_sessions")
          .update({
            status: 'active',
            countdown_started_at: startAt,
            // started_at will be set after countdown finishes
          })
          .eq("id", gameId)
      }

      toast.success("🚀 Quiz started!")
      setQuizStarted(true)
    } catch {
      toast.error("❌ Failed to start quiz")
    } finally {
      setIsStarting(false)
    }
  }

  // Show kick confirmation modal
  const confirmKickPlayer = (playerId: string, playerName: string) => {
    setPlayerToKick({ id: playerId, name: playerName })
    setShowKickModal(true)
  }

  // Execute kick after confirmation
  const executeKickPlayer = async () => {
    if (!playerToKick) return

    try {
      // Remove player from participants array
      const { data: gameSession, error: gameError } = await supabase
        .from("game_sessions")
        .select("participants")
        .eq("id", gameId)
        .single()

      if (gameError) {
        console.error("Error fetching game session:", gameError)
        return
      }

      const updatedParticipants = gameSession.participants.filter((p: any) => p.id !== playerToKick.id)

      const { data, error } = await supabase
        .from("game_sessions")
        .update({ participants: updatedParticipants })
        .eq("id", gameId)
        .select()

      if (error) {
        console.error("[HOST] ❌ Error kicking player:", error)
        return
      }

      // The real-time listener will automatically handle removing the player from state
      // and the player's page will automatically detect the deletion and redirect

    } catch (error) {
      console.error("[HOST] ❌ Error in kickPlayer:", error)
    } finally {
      setShowKickModal(false)
      setPlayerToKick(null)
    }
  }

  const endQuiz = async () => {
    if (hasFinishedGame.current) {
      return
    }

    // Set flag and update UI IMMEDIATELY (don't wait for database)
    hasFinishedGame.current = true
    setQuizStarted(false)
    setShowLeaderboard(true)
    setQuizManuallyEnded(true)

    // Update database in background (non-blocking)
    const updateDatabase = async () => {
      try {
        const endedAt = new Date().toISOString()

        if (isSupabaseBSession) {
          const { data: currentSession } = await supabaseB
            .from("sessions")
            .select("timestamps")
            .eq("id", gameId)
            .single()

          let currentTimestamps = currentSession?.timestamps || {}

          if (typeof currentTimestamps === 'string') {
            try {
              currentTimestamps = JSON.parse(currentTimestamps);
            } catch (e) {
              console.error("Error parsing timestamps in host end flow", e);
              currentTimestamps = {};
            }
          }

          await supabaseB
            .from("sessions")
            .update({
              status: 'finish',
              timestamps: {
                ...currentTimestamps,
                ended_at: endedAt,
              }
            })
            .eq("id", gameId)

          // Sync data to main database (background, non-blocking)
          if (gameId) syncGameToMainDatabase(gameId).catch(err =>
            console.error("[Host] Failed to sync to main database:", err)
          )
        } else {
          await supabase
            .from("game_sessions")
            .update({
              status: 'finished',
              ended_at: endedAt,
            })
            .eq("id", gameId)
        }
      } catch (error) {
        console.error("Failed to update database on end quiz:", error)
        // Don't show error toast since UI already updated successfully
      }
    }

    // Fire and forget - don't await
    updateDatabase()
  }

  const handleExitGame = async () => {
    isExitingRef.current = true // Set flag to prevent leaderboard flash
    router.push("/select-quiz") // Navigate to select quiz page

    if (gameId) {
      try {
        const endedAt = new Date().toISOString()

        if (isSupabaseBSession) {
          const { data: currentSession } = await supabaseB
            .from("sessions")
            .select("timestamps")
            .eq("id", gameId)
            .single()

          const currentTimestamps = currentSession?.timestamps || {}
          let parsedTimestamps = currentTimestamps;
          if (typeof parsedTimestamps === 'string') {
            try {
              parsedTimestamps = JSON.parse(parsedTimestamps);
              if (typeof parsedTimestamps === 'string') parsedTimestamps = JSON.parse(parsedTimestamps);
            } catch (e) {
              console.error("Failed to parse timestamps in exit-cleanup", e);
              if (typeof parsedTimestamps === 'string') parsedTimestamps = {};
            }
          }

          await supabaseB
            .from("sessions")
            .update({
              status: 'finish',
              timestamps: {
                ...parsedTimestamps,
                ended_at: endedAt,
              }
            })
            .eq("id", gameId)

          // Sync to main database before exit
          if (gameId) await syncGameToMainDatabase(gameId).catch(err =>
            console.error("[Host] Exit sync failed:", err)
          )
        } else {
          await supabase
            .from("game_sessions")
            .update({
              status: 'finished',
              ended_at: endedAt,
            })
            .eq("id", gameId)

          // Clear participants array
          await supabase
            .from("game_sessions")
            .update({ participants: [] })
            .eq("id", gameId)
        }
      } catch {
        // Silent fail - we're already navigating away
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const formatTimeMinutes = (minutes: number) => {
    // Convert minutes to MM:SS format (e.g., 5 minutes -> "05:00")
    return `${minutes.toString().padStart(2, "0")}:00`
  }

  const formatTimeText = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-400" />
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />
      default:
        return (
          <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-white/70">
            #{rank}
          </span>
        )
    }
  }

  // === RENDER STATES ===
  if (!gameCode) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center font-mono text-white">
        <div className="text-lg">Invalid game code</div>
      </div>
    )
  }

  if (loading)
    return (
      <div className="min-h-screen fixed inset-0 overflow-hidden flex items-center justify-center">
        {/* Cosmic background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a1a] via-[#1a1a3a] to-[#0a0a2a]" />

          {/* Galaxy background image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
            style={{
              backgroundImage: "url('/images/galaxy.webp')",
            }}
          />

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Animated stars background */}
        <div className="fixed inset-0 z-[1] overflow-hidden">
          {[...Array(25)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                scale: Math.random() * 0.5 + 0.5,
                opacity: 0
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1.5, 0.5],
              }}
              transition={{
                duration: Math.random() * 2 + 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              className="absolute w-1 h-1 bg-white rounded-full"
            />
          ))}
        </div>

        {/* Main content */}
        <div className="relative z-10 text-center">
          {/* Cosmic loader */}
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 mx-auto mb-8">
            {/* Outer ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-2 border-indigo-500/30"
            >
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-indigo-400 rounded-full shadow-lg shadow-indigo-400/50" />
            </motion.div>

            {/* Middle ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-5 rounded-full border-2 border-cyan-500/40"
            >
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50" />
            </motion.div>

            {/* Inner ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-10 rounded-full border-2 border-purple-500/50"
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50" />
            </motion.div>

            {/* Center glow */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-14 sm:inset-16 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-xl shadow-cyan-400/40"
            />

            {/* Rocket in center */}
            <motion.div
              animate={{
                y: [-3, 3, -3],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Play className="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-lg" />
            </motion.div>
          </div>

          {/* Text */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent mb-3"
          >
            {t('loadingQuiz', 'Loading Quiz...')}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-gray-400 text-sm sm:text-base mb-6"
          >
            Preparing game session...
          </motion.p>

          {/* Progress dots */}
          <div className="flex justify-center gap-3">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
                className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 shadow-lg shadow-cyan-400/30"
              />
            ))}
          </div>
        </div>
      </div>
    )

  if (!quiz)
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center font-mono text-white">
        {mounted && <StaticBackground />}
        <div className="absolute inset-0 bg-white/10 border-2 border-white/30 p-8 text-center font-mono text-white rounded-lg backdrop-blur-sm">
          <p className="mb-4">Quiz not found.</p>
          <PixelButton onClick={() => router.push("/")}>Back</PixelButton>
        </div>
      </div>
    )

  if (countdownLeft !== null && countdownLeft > 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
        {/* Galaxy background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a1a] via-[#1a1a3a] to-[#0a0a2a]" />
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
          style={{ backgroundImage: "url('/images/galaxy.webp')" }}
        />
        <div className="absolute inset-0 bg-black/50" />

        {/* Animated stars */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1.5, 0.5],
              }}
              transition={{
                duration: Math.random() * 2 + 1.5,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        {/* Main countdown container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="relative z-10"
        >
          {/* Glass card */}
          <div className="relative bg-gradient-to-br from-[#1a1a2e]/90 via-[#16213e]/90 to-[#0f0f23]/90 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 sm:p-12 md:p-16 shadow-2xl shadow-purple-900/40">
            {/* Gradient border lines */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent" />
            <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-purple-400/30 to-transparent" />

            {/* Corner glows */}
            <div className="absolute -top-4 -left-4 w-20 h-20 bg-cyan-500/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-purple-500/20 rounded-full blur-2xl" />

            {/* Content */}
            <div className="relative z-10 text-center">
              {/* Title with gradient */}
              <motion.h2
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8"
              >
                <span className="bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                  {t('quizStarting')}
                </span>
              </motion.h2>

              {/* Countdown number with orbital rings */}
              <div className="relative w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 mx-auto">
                {/* Outer orbital ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-cyan-500/30"
                >
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/60" />
                </motion.div>

                {/* Middle orbital ring */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-4 sm:inset-5 rounded-full border-2 border-purple-500/40"
                >
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-purple-400 rounded-full shadow-lg shadow-purple-400/60" />
                </motion.div>

                {/* Inner glow circle */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute inset-8 sm:inset-10 rounded-full bg-gradient-to-br from-purple-600/30 via-indigo-600/20 to-cyan-600/30 backdrop-blur-sm"
                />

                {/* Countdown number */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.span
                    key={countdownLeft}
                    initial={{ scale: 1.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
                    className="text-7xl sm:text-8xl md:text-9xl font-black bg-gradient-to-b from-yellow-300 via-orange-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-2xl"
                    style={{
                      textShadow: "0 0 40px rgba(251, 191, 36, 0.5), 0 0 80px rgba(251, 191, 36, 0.3)",
                      WebkitTextStroke: "1px rgba(251, 191, 36, 0.3)",
                    }}
                  >
                    {countdownLeft}
                  </motion.span>
                </div>
              </div>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-6 sm:mt-8 text-gray-400 text-sm sm:text-base font-medium"
              >
                Preparing the quiz for all players...
              </motion.p>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: "Press Start 2P",
            fontSize: "12px",
            background: "#222",
            color: "#fff",
            border: "2px solid #fff",
          },
        }}
      />
      <RulesDialog open={false} onOpenChange={() => { }} quiz={quiz} onStartGame={() => { }} />
      <QRCodeModal open={showQRModal} onOpenChange={setShowQRModal} joinUrl={joinUrl} />

      <div className="fixed inset-0 z-0 overflow-hidden bg-black">
        <div className="absolute inset-0">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
            <defs>
              <radialGradient id="galaxy1" cx="20%" cy="30%" r="80%">
                <stop offset="0%" stopColor="#4c1d95" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#1e1b4b" stopOpacity="0.2" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="galaxy2" cx="80%" cy="70%" r="65%">
                <stop offset="0%" stopColor="#701a75" stopOpacity="0.25" />
                <stop offset="50%" stopColor="#312e81" stopOpacity="0.15" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="galaxy3" cx="60%" cy="10%" r="55%">
                <stop offset="0%" stopColor="#064e3b" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#1e1b4b" stopOpacity="0.1" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="galaxy4" cx="10%" cy="80%" r="45%">
                <stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.15" />
                <stop offset="50%" stopColor="#312e81" stopOpacity="0.1" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="nebula1" cx="40%" cy="60%" r="90%">
                <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.1" />
                <stop offset="70%" stopColor="#0f0f23" stopOpacity="0.05" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="#000000" />
            <rect width="100%" height="100%" fill="url(#nebula1)" />
            <rect width="100%" height="100%" fill="url(#galaxy1)" />
            <rect width="100%" height="100%" fill="url(#galaxy2)" />
            <rect width="100%" height="100%" fill="url(#galaxy3)" />
            <rect width="100%" height="100%" fill="url(#galaxy4)" />
          </svg>
        </div>

        {Array.from({ length: 300 }).map((_, i) => {
          // Use deterministic values for static positioning
          const seed = i * 12345;
          const left = ((seed * 7) % 100) + (seed % 20);
          const top = ((seed * 11) % 100) + (seed % 15);
          const size = (seed % 12) / 10 + 0.3;
          const colorIndex = seed % 6;
          const opacity = (seed % 40) / 100 + 0.1;

          return (
            <div
              key={`distant-star-${i}`}
              className="absolute rounded-full"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                background: `${['#ffffff', '#fbbf24', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'][colorIndex]}`,
                opacity: opacity,
              }}
            />
          )
        })}

        {Array.from({ length: 50 }).map((_, i) => {
          // Use deterministic values for static positioning
          const seed = i * 67890;
          const left = ((seed * 13) % 100) + (seed % 25);
          const top = ((seed * 17) % 100) + (seed % 20);
          const size = (seed % 12) / 10 + 1;
          const colorIndex = seed % 8;
          const starColor = ['#ffffff', '#fbbf24', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'][colorIndex];
          const opacity = (seed % 40) / 100 + 0.4;

          return (
            <div
              key={`bright-star-${i}`}
              className="absolute rounded-full"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                background: starColor,
                opacity: opacity,
                boxShadow: `0 0 8px ${starColor}80, 0 0 16px ${starColor}40, 0 0 24px ${starColor}20`,
              }}
            />
          )
        })}

        {Array.from({ length: 5 }).map((_, i) => {
          // Use deterministic values for static positioning
          const seed = i * 11111;
          const left = ((seed * 19) % 100) + (seed % 30);
          const top = ((seed * 23) % 100) + (seed % 25);
          const width = (seed % 120) + 80;
          const colorIndex = seed % 5;
          const trailColor = ['#ffffff', '#fbbf24', '#8b5cf6', '#ec4899', '#06b6d4'][colorIndex];
          const rotation = seed % 360;

          return (
            <div
              key={`shooting-star-${i}`}
              className="absolute h-px opacity-70"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${width}px`,
                background: `linear-gradient(to right, ${trailColor}, transparent)`,
                transform: `rotate(${rotation}deg)`,
                filter: `blur(0.5px)`,
              }}
            />
          )
        })}

        {/* Floating cosmic particles */}
        {Array.from({ length: 20 }).map((_, i) => {
          // Use deterministic values for static positioning
          const seed = i * 22222;
          const left = ((seed * 29) % 100) + (seed % 35);
          const top = ((seed * 31) % 100) + (seed % 30);
          const size = (seed % 30) / 10 + 1;
          const colorIndex = seed % 4;
          const opacity = (seed % 40) / 100 + 0.2;

          return (
            <div
              key={`cosmic-particle-${i}`}
              className="absolute rounded-full"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                background: `radial-gradient(circle, ${['#fbbf24', '#8b5cf6', '#ec4899', '#06b6d4'][colorIndex]} 0%, transparent 70%)`,
                opacity: opacity,
              }}
            />
          )
        })}

        {/* Nebula clouds with drift animation */}
        {Array.from({ length: 5 }).map((_, i) => {
          // Use deterministic values for static positioning
          const seed = i * 33333;
          const left = ((seed * 37) % 100) + (seed % 40);
          const top = ((seed * 41) % 100) + (seed % 35);
          const width = (seed % 200) + 100;
          const height = (seed % 150) + 80;
          const colorIndex = seed % 4;

          return (
            <div
              key={`nebula-cloud-${i}`}
              className="absolute rounded-full blur-sm"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${width}px`,
                height: `${height}px`,
                background: `radial-gradient(ellipse, ${['rgba(139, 92, 246, 0.1)', 'rgba(236, 72, 153, 0.1)', 'rgba(6, 182, 212, 0.1)', 'rgba(251, 191, 36, 0.1)'][colorIndex]} 0%, transparent 70%)`,
              }}
            />
          )
        })}

        {/* Rotating cosmic rings */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`cosmic-ring-${i}`}
            className="absolute border border-white/10 rounded-full"
            style={{
              left: '50%',
              top: '50%',
              width: `${(i + 1) * 200}px`,
              height: `${(i + 1) * 200}px`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}

        {/* Additional galaxy elements */}
        {/* Colorful nebula swirls */}
        {Array.from({ length: 8 }).map((_, i) => {
          // Use deterministic values for static positioning
          const seed = i * 44444;
          const left = ((seed * 43) % 100) + (seed % 45);
          const top = ((seed * 47) % 100) + (seed % 40);
          const width = (seed % 300) + 150;
          const height = (seed % 250) + 120;
          const rotation = seed % 360;
          const colorIndex1 = seed % 5;
          const colorIndex2 = seed % 4;
          const opacity = (seed % 40) / 100 + 0.1;

          return (
            <div
              key={`nebula-swirl-${i}`}
              className="absolute rounded-full blur-md"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${width}px`,
                height: `${height}px`,
                background: `conic-gradient(from ${rotation}deg, ${['rgba(139, 92, 246, 0.08)', 'rgba(236, 72, 153, 0.08)', 'rgba(6, 182, 212, 0.08)', 'rgba(251, 191, 36, 0.08)', 'rgba(239, 68, 68, 0.08)'][colorIndex1]} 0deg, transparent 180deg, ${['rgba(16, 185, 129, 0.08)', 'rgba(245, 158, 11, 0.08)', 'rgba(139, 92, 246, 0.08)', 'rgba(236, 72, 153, 0.08)'][colorIndex2]} 360deg)`,
                opacity: opacity,
              }}
            />
          )
        })}

        {/* Pulsing cosmic orbs */}
        {Array.from({ length: 6 }).map((_, i) => {
          // Use deterministic values for static positioning
          const seed = i * 55555;
          const left = ((seed * 53) % 100) + (seed % 50);
          const top = ((seed * 59) % 100) + (seed % 45);
          const size = (seed % 80) + 40;
          const colorIndex = seed % 6;
          const opacity = (seed % 30) / 100 + 0.1;

          return (
            <div
              key={`cosmic-orb-${i}`}
              className="absolute rounded-full blur-sm"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                background: `radial-gradient(circle, ${['#fbbf24', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'][colorIndex]} 0%, transparent 70%)`,
                opacity: opacity,
              }}
            />
          )
        })}

        {/* Floating space debris */}
        {Array.from({ length: 15 }).map((_, i) => {
          // Use deterministic values for static positioning
          const seed = i * 66666;
          const left = ((seed * 61) % 100) + (seed % 55);
          const top = (seed * 67) % 100 + (seed % 50);
          const size = (seed % 40) / 10 + 2;
          const colorIndex = seed % 3;
          const opacity = (seed % 50) / 100 + 0.2;
          const rotation = seed % 360;

          return (
            <div
              key={`space-debris-${i}`}
              className="absolute"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                background: `linear-gradient(45deg, ${['#94a3b8', '#64748b', '#475569'][colorIndex]} 0%, transparent 50%, ${['#64748b', '#475569', '#334155'][colorIndex]} 100%)`,
                opacity: opacity,
                transform: `rotate(${rotation}deg)`,
              }}
            />
          )
        })}

        {/* Cosmic dust particles */}
        {Array.from({ length: 100 }).map((_, i) => {
          // Use deterministic values for static positioning
          const seed = i * 77777;
          const left = ((seed * 71) % 100) + (seed % 60);
          const top = (seed * 73) % 100 + (seed % 55);
          const size = (seed % 8) / 10 + 0.2;
          const colorIndex = seed % 5;
          const opacity = (seed % 30) / 100 + 0.1;

          return (
            <div
              key={`cosmic-dust-${i}`}
              className="absolute rounded-full"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                background: `${['#ffffff', '#fbbf24', '#8b5cf6', '#ec4899', '#06b6d4'][colorIndex]}`,
                opacity: opacity,
              }}
            />
          )
        })}

        {/* Energy waves */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`energy-wave-${i}`}
            className="absolute rounded-full border border-white/5"
            style={{
              left: '50%',
              top: '50%',
              width: `${(i + 1) * 300}px`,
              height: `${(i + 1) * 300}px`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto py-4 sm:py-8 min-h-screen font-mono text-white">
        {showLeaderboard && !isExitingRef.current ? (
          <PodiumLeaderboard
            players={playerProgress}
            onAnimationComplete={() => { }}
            onRestart={handleRestart}
            onHome={handleHome}
          />
        ) : !quizStarted ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              {/* Left Panel - QR Code & Game Info */}
              <div className="bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#16162a] border border-indigo-500/20 p-4 sm:p-6 rounded-2xl relative overflow-hidden">
                {/* Galaxy background effects */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  {/* Nebula gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/20 via-transparent to-blue-900/20"></div>
                  <div className="absolute inset-0 bg-gradient-to-bl from-pink-900/10 via-transparent to-indigo-900/15"></div>

                  {/* Twinkling stars */}
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-0.5 h-0.5 bg-white rounded-full"
                      style={{
                        left: `${8 + (i * 8)}%`,
                        top: `${5 + ((i * 17) % 90)}%`,
                      }}
                      animate={{
                        opacity: [0.2, 0.8, 0.2],
                      }}
                      transition={{
                        duration: 2 + (i * 0.2),
                        repeat: Infinity,
                        delay: i * 0.3,
                      }}
                    />
                  ))}

                  {/* Subtle shooting star */}
                  <motion.div
                    className="absolute w-16 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
                    style={{ top: '25%', left: '-5%' }}
                    animate={{ x: [0, 400], opacity: [0, 0.6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 4, repeatDelay: 6 }}
                  />
                </div>

                <div className="relative z-10 flex items-center justify-between mb-4">
                  <img
                    src="/images/logo/spacequizv2.webp"
                    alt="Space Quiz"
                    className="h-8 sm:h-10 md:h-12 w-auto object-contain"
                  />
                  <Image
                    src="/images/gameforsmartlogo.png"
                    alt="GameForSmart"
                    width={150}
                    height={60}
                    className="w-24 h-auto sm:w-28 md:w-32 lg:w-36 xl:w-40 opacity-90 hover:opacity-100 transition-opacity duration-300"
                    priority
                  />
                </div>

                <div className="relative z-10 flex flex-wrap gap-2 sm:gap-4 justify-center mb-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-cyan-500/10 border border-cyan-400/30 text-cyan-200 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="font-medium">{formatTimeMinutes(gameSettings.timeLimit)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-green-500/10 border border-green-400/30 text-green-200 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm">
                    <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="font-medium">{gameSettings.questionCount} {t('questions')}</span>
                  </div>
                </div>

                <div className="relative z-10 text-center">
                  {/* Game Code Display */}
                  <motion.div
                    className="relative inline-block w-full max-w-sm sm:max-w-md mb-4"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="relative bg-white rounded-xl py-4 sm:py-6 lg:py-8 px-6 sm:px-8 lg:px-12 w-full">
                      <span className="text-3xl sm:text-4xl lg:text-7xl font-mono font-bold tracking-widest text-slate-800">
                        {gameCode}
                      </span>
                      <motion.button
                        onClick={handleCopyCode}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="absolute top-2 right-2 p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        title="Copy game code"
                      >
                        {copied ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-slate-600" />
                        )}
                      </motion.button>
                    </div>
                  </motion.div>

                  {/* QR Code Display */}
                  <motion.div
                    className="relative inline-block w-full max-w-sm sm:max-w-md"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="bg-white rounded-xl py-4 sm:py-6 lg:py-8 px-4 sm:px-8 lg:px-12 w-full flex flex-col justify-center items-center relative">
                      <motion.button
                        onClick={() => setShowQRModal(true)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="absolute top-2 right-2 p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors z-10"
                        title="Click to enlarge QR code"
                      >
                        <Maximize2 className="w-5 h-5 text-slate-600" />
                      </motion.button>

                      <div className="mb-4 py-1">
                        <QRCodeSVG value={joinUrl} size={120} className="sm:w-[140px] sm:h-[140px] lg:w-[335px] lg:h-[335px]" />
                      </div>
                      <div className="w-full">
                        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-2 sm:p-3">
                          <span className="text-xs sm:text-sm font-mono break-all flex-1 text-slate-700">{joinUrl}</span>
                          <motion.button
                            onClick={handleCopyLink}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors flex-shrink-0"
                            title="Copy join link"
                          >
                            {linkCopied ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-slate-600" />
                            )}
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              {/* Right Panel - Players */}
              <div className="bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#16162a] border border-purple-500/20 p-4 sm:p-6 rounded-2xl relative overflow-hidden">
                {/* Galaxy background effects */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                  {/* Nebula gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-bl from-purple-900/20 via-transparent to-pink-900/15"></div>
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/15 via-transparent to-violet-900/20"></div>

                  {/* Twinkling stars */}
                  {[...Array(10)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-0.5 h-0.5 bg-white rounded-full"
                      style={{
                        right: `${5 + (i * 10)}%`,
                        top: `${8 + ((i * 13) % 85)}%`,
                      }}
                      animate={{
                        opacity: [0.2, 0.7, 0.2],
                      }}
                      transition={{
                        duration: 2.5 + (i * 0.15),
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-white">
                    <div className="w-8 h-8 bg-purple-500/20 border border-purple-400/30 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300" />
                    </div>
                    {t('playersLabel')}
                    <span className="text-purple-300">({players.length})</span>
                  </h2>
                  <div className="flex gap-2 sm:gap-3">
                    <PixelButton color="red" size="sm" onClick={() => setShowExitModal(true)}>
                      ❌ {t('exitGame')}
                    </PixelButton>
                    <PixelButton color="green" onClick={startQuiz} disabled={players.length === 0 || isStarting}>
                      <Play className="w-4 h-4 inline-block mr-2" /> {t('startQuiz')}
                    </PixelButton>
                  </div>
                </div>

                {players.length === 0 ? (
                  <motion.div
                    className="text-center py-12"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {/* Animated waiting icon */}
                    <motion.div
                      className="relative inline-block mb-4"
                      animate={{ y: [-5, 5, -5] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <div className="w-16 h-16 bg-purple-500/10 border border-purple-400/30 rounded-2xl flex items-center justify-center mx-auto">
                        <Users className="w-8 h-8 text-purple-300/70" />
                      </div>
                    </motion.div>

                    <p className="text-lg text-white/60 font-medium mb-4">{t('waitingForPlayersToJoin')}</p>

                    {/* Loading dots - simple */}
                    <motion.div
                      className="flex justify-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-purple-400/60"
                          animate={{
                            opacity: [0.3, 1, 0.3]
                          }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            delay: i * 0.2
                          }}
                        />
                      ))}
                    </motion.div>
                  </motion.div>
                ) : (
                  <>
                    <div className="relative overflow-hidden">
                      <AnimatePresence initial={false} custom={slideDirection} mode="wait">
                        <motion.div
                          key={currentPlayerPage}
                          custom={slideDirection}
                          variants={slideVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={slideTransition}
                          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4"
                        >
                          {getPaginatedPlayers(players, currentPlayerPage).map((player, index) => (
                            <motion.div
                              key={player.id}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ scale: 1.03 }}
                              className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-2 sm:p-3 md:p-4 flex flex-col items-center justify-between backdrop-blur-sm relative min-h-[110px] sm:min-h-[130px] border border-white/10 hover:border-cyan-400/30 transition-all duration-300"
                            >
                              {/* Kick Button */}
                              <motion.button
                                onClick={() => confirmKickPlayer(player.id, player.name)}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors duration-200 z-10 flex items-center justify-center"
                                style={{ width: '24px', height: '24px', padding: '0', minWidth: '24px', minHeight: '24px' }}
                                title={`Kick ${player.name}`}
                              >
                                <UserX size={12} style={{ width: '12px', height: '12px' }} />
                              </motion.button>

                              <div className="flex-shrink-0 mt-1">
                                <div className="relative">
                                  <div className="absolute -inset-1 bg-gradient-to-br from-cyan-500/30 to-purple-500/30 rounded-full blur-sm"></div>
                                  <Image
                                    src={player.avatar || "/placeholder.svg?height=48&width=48&text=Player"}
                                    alt={getFirstName(player.name)}
                                    width={48}
                                    height={48}
                                    className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full border-2 border-white/30 object-cover"
                                  />
                                </div>
                              </div>

                              <div className="text-center w-full px-1 mt-2 flex-shrink-0 pb-1">
                                <h3 className="font-bold text-sm sm:text-base md:text-lg text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] leading-tight break-words relative z-0">
                                  {(() => {
                                    const displayName = getDisplayName(player as any);
                                    return displayName ? (
                                      <SmartNameDisplay
                                        name={displayName}
                                        maxLength={15}
                                        className="text-white text-sm sm:text-base md:text-lg font-bold line-clamp-2"
                                        multilineClassName="text-white text-sm sm:text-base leading-tight"
                                      />
                                    ) : (
                                      <span className="text-white text-sm sm:text-base md:text-lg font-bold">Player</span>
                                    );
                                  })()}
                                </h3>
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <PaginationControls
                      currentPage={currentPlayerPage}
                      totalPages={getTotalPages(players.length)}
                      onPageChange={setCurrentPlayerPage}
                      onDirectionChange={setSlideDirection}
                    />
                  </>
                )}
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-8">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-white/10 border-2 border-white/20 p-3 sm:p-6 rounded-lg backdrop-blur-sm">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-2">
                      <img src="/images/logo/spacequizv2.webp" alt="Space Quiz" className="h-6 sm:h-8 w-auto object-contain" />
                      <span className="text-sm sm:text-lg">-</span>
                      <Image
                        src="/images/gameforsmartlogo.png"
                        alt="GameForSmart"
                        width={160}
                        height={64}
                        className="w-24 h-auto sm:w-28 md:w-32 lg:w-36 xl:w-40 opacity-90 hover:opacity-100 transition-opacity duration-300"
                        priority
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      <div className="flex items-center gap-1 sm:gap-2 bg-blue-100 text-blue-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                        <Timer className="w-3 h-3 sm:w-4 sm:h-4" />
                        {formatTimeMinutes(gameSettings.timeLimit)}
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                        <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        {gameSettings.questionCount} {t('questions')}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                    <div className="flex items-center gap-2 text-white">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-base sm:text-lg font-mono">{formatTimeText(quizTimeLeft)}</span>
                    </div>
                    <PixelButton color="red" onClick={() => setShowEndQuizModal(true)} className="w-full sm:w-auto text-xs sm:text-sm">
                      ⏹ {t('endQuiz')}
                    </PixelButton>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 border-2 border-white/20 rounded-lg p-4 sm:p-6 backdrop-blur-sm"
            >
              <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" /> Players
              </h2>

              {playerProgress.length === 0 ? (
                <div className="text-center py-8 text-white/60">
                  <UsersRound className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No players found.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                    {getPaginatedProgress(playerProgress, currentProgressPage).sort((a, b) => a.rank - b.rank)
                      .map((player, index) => (
                        <div
                          key={player.id}
                          className={`relative overflow-hidden rounded-lg p-3 sm:p-4 border-2 transition-all duration-300 ease-out ${player.rank === 1
                            ? "border-yellow-400/70 shadow-lg shadow-yellow-400/20"
                            : player.rank === 2
                              ? "border-gray-300/70 shadow-lg shadow-gray-300/20"
                              : player.rank === 3
                                ? "border-amber-600/70 shadow-lg shadow-amber-600/20"
                                : "border-white/30 shadow-md shadow-white/10"
                            } hover:scale-[1.02]`}
                        >
                          {/* Galaxy background with stars */}
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-indigo-900/25 rounded-lg" />

                          {/* Animated stars background - only for top 3 players to reduce performance impact */}
                          {player.rank <= 3 && (
                            <div className="absolute inset-0 overflow-hidden rounded-lg">
                              <div className="absolute top-1 left-2 w-0.5 h-0.5 bg-white/60 rounded-full animate-pulse" />
                              <div className="absolute top-3 right-2 w-0.5 h-0.5 bg-blue-300/70 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                              <div className="absolute bottom-2 left-3 w-0.5 h-0.5 bg-purple-300/60 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                              <div className="absolute bottom-3 right-1 w-0.5 h-0.5 bg-cyan-300/50 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
                            </div>
                          )}

                          {/* Nebula effect */}
                          <div className={`absolute inset-0 rounded-lg opacity-20 ${player.rank === 1
                            ? "bg-gradient-to-br from-yellow-400/20 via-orange-500/15 to-red-500/10"
                            : player.rank === 2
                              ? "bg-gradient-to-br from-gray-300/20 via-blue-400/15 to-purple-500/10"
                              : player.rank === 3
                                ? "bg-gradient-to-br from-amber-600/20 via-orange-500/15 to-red-600/10"
                                : "bg-gradient-to-br from-blue-400/15 via-purple-500/10 to-indigo-600/10"
                            }`} />

                          {/* Ranking change indicator */}
                          {player.rank <= 3 && (
                            <div className="absolute top-2 right-2 z-20">
                              <div className={`w-3 h-3 rounded-full ${player.rank === 1 ? 'bg-yellow-400' :
                                player.rank === 2 ? 'bg-gray-300' :
                                  'bg-amber-600'
                                } animate-pulse`} />
                            </div>
                          )}

                          {/* Content wrapper with backdrop blur */}
                          <div className="relative z-10 bg-black/20 backdrop-blur-sm rounded-lg p-2 -m-2">
                            {/* Header with rank and avatar */}
                            <div className="flex items-center gap-2 sm:gap-3 mb-3">
                              {/* Rank number */}
                              <div
                                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-sm sm:text-base font-bold transition-all duration-300 ${player.rank === 1
                                  ? "bg-yellow-400 text-black shadow-[0_0_15px_rgba(255,215,0,0.4)]"
                                  : player.rank === 2
                                    ? "bg-gray-300 text-black shadow-[0_0_10px_rgba(192,192,192,0.3)]"
                                    : player.rank === 3
                                      ? "bg-amber-600 text-white shadow-[0_0_10px_rgba(217,119,6,0.3)]"
                                      : "bg-white/20 text-white"
                                  }`}
                              >
                                {player.rank}
                              </div>

                              {/* Avatar */}
                              <Image
                                src={player.avatar || "/placeholder.svg"}
                                alt={getFirstName(player.name)}
                                width={32}
                                height={32}
                                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border-2 border-white/30"
                              />

                              {/* Player name and score */}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white text-xs sm:text-sm truncate">
                                  <SmartNameDisplay
                                    name={player.name}
                                    maxLength={16}
                                    className="text-xs sm:text-sm font-bold text-white line-clamp-1"
                                    multilineClassName="text-xs leading-tight"
                                  />
                                </h3>
                                <p
                                  className={`text-xs font-medium transition-colors duration-300 ${player.rank === 1
                                    ? "text-yellow-300"
                                    : player.rank === 2
                                      ? "text-gray-200"
                                      : player.rank === 3
                                        ? "text-amber-400"
                                        : "text-yellow-300"
                                    }`}
                                >
                                  {player.score}
                                </p>
                              </div>

                              {/* Rank icon */}
                              <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/10">
                                {getRankIcon(player.rank)}
                              </div>
                            </div>

                            {/* Progress section */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs text-white/70">
                                <span>{player.currentQuestion}/{player.totalQuestions}</span>
                                <span
                                  className={`font-bold font-mono transition-colors duration-300 ${player.totalQuestions > 0
                                    ? Math.round((player.currentQuestion / player.totalQuestions) * 100) >= 80
                                      ? "text-green-400"
                                      : Math.round((player.currentQuestion / player.totalQuestions) * 100) >= 50
                                        ? "text-yellow-400"
                                        : "text-orange-400"
                                    : "text-orange-400"
                                    }`}
                                >
                                  {player.totalQuestions > 0
                                    ? Math.round((player.currentQuestion / player.totalQuestions) * 100)
                                    : 0}%
                                </span>
                              </div>
                              <div className="w-full">
                                <StableProgressBar
                                  playerId={player.id}
                                  currentQuestion={player.currentQuestion}
                                  totalQuestions={player.totalQuestions}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  <PaginationControls
                    currentPage={currentProgressPage}
                    totalPages={getTotalPages(playerProgress.length)}
                    onPageChange={setCurrentProgressPage}
                    onDirectionChange={setSlideDirection}
                  />
                </>
              )}
            </motion.div>
          </div>
        )}

        <AnimatePresence>
          {showExitModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
              onClick={() => setShowExitModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="relative mx-4 w-full max-w-sm sm:max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Main Card */}
                <div className="relative bg-gradient-to-br from-[#1a1a2e]/95 via-[#16213e]/95 to-[#0f0f23]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-purple-900/30">

                  {/* Floating stars background */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: [0, 0.8, 0],
                          scale: [0.5, 1.2, 0.5],
                        }}
                        transition={{
                          duration: Math.random() * 2 + 2,
                          repeat: Infinity,
                          delay: Math.random() * 2,
                        }}
                        className="absolute w-1 h-1 bg-white rounded-full"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Gradient overlay lines */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />
                  </div>

                  {/* Content */}
                  <div className="relative z-10 p-6 sm:p-8">
                    {/* Close button */}
                    <button
                      onClick={() => setShowExitModal(false)}
                      className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">{tStatic('close')}</span>
                    </button>

                    <div className="mb-6">
                      {/* Cosmic Icon with orbital rings */}
                      <div className="mb-5 flex justify-center">
                        <div className="relative w-20 h-20">
                          {/* Outer ring */}
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 rounded-full border border-red-500/30"
                          >
                            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-400 rounded-full shadow-lg shadow-red-400/50" />
                          </motion.div>

                          {/* Middle ring */}
                          <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-2 rounded-full border border-orange-500/40"
                          >
                            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50" />
                          </motion.div>

                          {/* Center icon */}
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-4 rounded-full bg-gradient-to-br from-red-500 to-orange-600 shadow-xl shadow-orange-500/40 flex items-center justify-center"
                          >
                            <LogOut className="w-6 h-6 text-white" />
                          </motion.div>
                        </div>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-bold text-center">
                        <span className="bg-gradient-to-r from-red-300 via-orange-300 to-yellow-300 bg-clip-text text-transparent">
                          {t('exitGameQuestion')}
                        </span>
                      </h2>
                    </div>

                    <div className="space-y-6">
                      {/* Warning Message */}
                      <div className="text-center px-2">
                        <p className="text-white text-lg sm:text-xl font-medium leading-relaxed">
                          Are you sure? The game session will end.
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        {/* Cancel Button */}
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex-1"
                        >
                          <Button
                            onClick={() => setShowExitModal(false)}
                            variant="outline"
                            className="w-full h-11 sm:h-12 bg-white/5 backdrop-blur-lg border-white/20 text-white hover:bg-white/15 hover:border-white/30 transition-all duration-300 rounded-xl font-medium"
                          >
                            <Sparkles className="w-4 h-4 mr-2 text-cyan-400" />
                            {tStatic('cancel')}
                          </Button>
                        </motion.div>

                        {/* Logout Button */}
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex-1"
                        >
                          <Button
                            onClick={handleExitGame}
                            className="w-full h-11 sm:h-12 bg-gradient-to-r from-red-600 via-orange-600 to-red-600 hover:from-red-500 hover:via-orange-500 hover:to-red-500 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden group"
                          >
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                            <Rocket className="w-4 h-4 group-hover:-rotate-45 transition-transform duration-300" />
                            <span className="relative z-10">{tStatic('endSession')}</span>
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* End Quiz Confirmation Modal */}
        <AnimatePresence>
          {showEndQuizModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
              onClick={() => setShowEndQuizModal(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white/10 border-2 border-white/20 font-mono text-white p-4 sm:p-8 rounded-lg backdrop-blur-sm max-w-sm sm:max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <h2 className="text-lg sm:text-2xl mb-3 font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                    {t('endQuizQuestion')}
                  </h2>

                  <p className="text-sm sm:text-base mb-6 text-white/80">
                    Yakin ingin meninggalkan halaman?
                  </p>

                  {/* Decorative divider */}
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <div className="h-px w-12 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                    <div className="w-2 h-2 rounded-full bg-purple-400/60" />
                    <div className="h-px w-12 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                    <PixelButton
                      color="gray"
                      onClick={() => setShowEndQuizModal(false)}
                      className="text-xs sm:text-sm"
                    >
                      {tStatic('cancel')}
                    </PixelButton>
                    <PixelButton
                      color="red"
                      onClick={() => {
                        setShowEndQuizModal(false)
                        endQuiz()
                      }}
                      className="text-xs sm:text-sm"
                    >
                      ⏹ {tStatic('confirmEndQuiz')}
                    </PixelButton>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Kick Player Confirmation Modal */}
        <AnimatePresence>
          {showKickModal && playerToKick && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
              onClick={() => {
                setShowKickModal(false)
                setPlayerToKick(null)
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="relative mx-4 w-full max-w-sm sm:max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Main Card */}
                <div className="relative bg-gradient-to-br from-[#1a1a2e]/95 via-[#16213e]/95 to-[#0f0f23]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-red-900/30">

                  {/* Floating stars background */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: [0, 0.8, 0],
                          scale: [0.5, 1.2, 0.5],
                        }}
                        transition={{
                          duration: Math.random() * 2 + 2,
                          repeat: Infinity,
                          delay: Math.random() * 2,
                        }}
                        className="absolute w-1 h-1 bg-white rounded-full"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Gradient overlay lines */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-400/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-400/30 to-transparent" />
                  </div>

                  {/* Content */}
                  <div className="relative z-10 p-6 sm:p-8">
                    {/* Close button */}
                    <button
                      onClick={() => {
                        setShowKickModal(false)
                        setPlayerToKick(null)
                      }}
                      className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">{tStatic('close')}</span>
                    </button>

                    <div className="mb-6">
                      {/* Cosmic Icon with orbital rings */}
                      <div className="mb-5 flex justify-center">
                        <div className="relative w-20 h-20">
                          {/* Outer ring */}
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 rounded-full border border-red-500/30"
                          >
                            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-400 rounded-full shadow-lg shadow-red-400/50" />
                          </motion.div>

                          {/* Middle ring */}
                          <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-2 rounded-full border border-orange-500/40"
                          >
                            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50" />
                          </motion.div>

                          {/* Center icon */}
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-4 rounded-full bg-gradient-to-br from-red-500 to-orange-600 shadow-xl shadow-orange-500/40 flex items-center justify-center"
                          >
                            <UserX className="w-6 h-6 text-white" />
                          </motion.div>
                        </div>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-bold text-center">
                        <span className="bg-gradient-to-r from-red-300 via-orange-300 to-yellow-300 bg-clip-text text-transparent">
                          Kick Player?
                        </span>
                      </h2>
                    </div>

                    <div className="space-y-6">
                      {/* Warning Message */}
                      <div className="text-center px-2">
                        <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                          Are you sure you want to kick <span className="font-bold text-red-400">{playerToKick.name}</span> from the game?
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        {/* Cancel Button */}
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex-1"
                        >
                          <Button
                            onClick={() => {
                              setShowKickModal(false)
                              setPlayerToKick(null)
                            }}
                            variant="outline"
                            className="w-full h-11 sm:h-12 bg-white/5 backdrop-blur-lg border-white/20 text-white hover:bg-white/15 hover:border-white/30 transition-all duration-300 rounded-xl font-medium"
                          >
                            <Sparkles className="w-4 h-4 mr-2 text-cyan-400" />
                            {tStatic('cancel')}
                          </Button>
                        </motion.div>

                        {/* Kick Button */}
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex-1"
                        >
                          <Button
                            onClick={executeKickPlayer}
                            className="w-full h-11 sm:h-12 bg-gradient-to-r from-red-600 via-orange-600 to-red-600 hover:from-red-500 hover:via-orange-500 hover:to-red-500 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden group"
                          >
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                            <UserX className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                            <span className="relative z-10">Kick Player</span>
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

// === STATIC BACKGROUND ===
const StaticBackground = () => (
  <div className="fixed inset-0 z-0 overflow-hidden bg-black">
    <div className="absolute inset-0">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="galaxy1" cx="20%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#4c1d95" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#1e1b4b" stopOpacity="0.2" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="galaxy2" cx="80%" cy="70%" r="65%">
            <stop offset="0%" stopColor="#701a75" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#312e81" stopOpacity="0.15" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="galaxy3" cx="60%" cy="10%" r="55%">
            <stop offset="0%" stopColor="#064e3b" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#1e1b4b" stopOpacity="0.1" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="galaxy4" cx="10%" cy="80%" r="45%">
            <stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#312e81" stopOpacity="0.1" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nebula1" cx="40%" cy="60%" r="90%">
            <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.1" />
            <stop offset="70%" stopColor="#0f0f23" stopOpacity="0.05" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="#000000" />
        <rect width="100%" height="100%" fill="url(#nebula1)" />
        <rect width="100%" height="100%" fill="url(#galaxy1)" />
        <rect width="100%" height="100%" fill="url(#galaxy2)" />
        <rect width="100%" height="100%" fill="url(#galaxy3)" />
        <rect width="100%" height="100%" fill="url(#galaxy4)" />
      </svg>
    </div>

    {Array.from({ length: 300 }).map((_, i) => (
      <div
        key={`distant-star-${i}`}
        className="absolute bg-white rounded-full"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${Math.random() * 1.5 + 0.3}px`,
          height: `${Math.random() * 1.5 + 0.3}px`,
          opacity: Math.random() * 0.4 + 0.1,
        }}
      />
    ))}

    {Array.from({ length: 50 }).map((_, i) => (
      <div
        key={`bright-star-${i}`}
        className="absolute bg-white rounded-full"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${Math.random() * 2 + 1}px`,
          height: `${Math.random() * 2 + 1}px`,
          opacity: Math.random() * 0.6 + 0.4,
          boxShadow: "0 0 8px rgba(255, 255, 255, 0.6), 0 0 16px rgba(255, 255, 255, 0.3)",
        }}
      />
    ))}

    {Array.from({ length: 3 }).map((_, i) => (
      <div
        key={`shooting-star-${i}`}
        className="absolute bg-gradient-to-r from-white to-transparent h-px opacity-70"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${Math.random() * 100 + 50}px`,
          transform: `rotate(${Math.random() * 360}deg)`,
          animation: `shooting-star ${Math.random() * 8 + 4}s infinite linear`,
          animationDelay: `${Math.random() * 5}s`,
        }}
      />
    ))}
  </div>
)

// === PIXEL BUTTON ===
function PixelButton({
  color = "blue",
  size = "md",
  className,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  color?: string
  size?: string
}) {
  const colorStyles: Record<string, string> = {
    red: "bg-red-500 border-red-700 text-white hover:bg-red-600 active:bg-red-700",
    green: "bg-green-500 border-green-700 text-white hover:bg-green-600 active:bg-green-700",
    blue: "bg-blue-500 border-blue-700 text-white hover:bg-blue-600 active:bg-blue-700",
    yellow: "bg-yellow-400 border-yellow-600 text-black hover:bg-yellow-500 active:bg-yellow-600",
    gray: "bg-gray-500 border-gray-700 text-white hover:bg-gray-600 active:bg-gray-700",
  }
  const sizeStyles: Record<string, string> = {
    sm: "px-3 py-2 text-xs",
    md: "px-4 py-3 text-sm",
    lg: "px-6 py-4 text-base",
  }
  return (
    <button
      className={`border-2 font-mono uppercase tracking-wide shadow-[4px_4px_0px_rgba(0,0,0,0.8)] active:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:translate-x-[2px] active:translate-y-[2px] transition-all ${colorStyles[color]} ${sizeStyles[size]} ${disabled ? "opacity-50 cursor-not-allowed hover:bg-opacity-100" : ""} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}