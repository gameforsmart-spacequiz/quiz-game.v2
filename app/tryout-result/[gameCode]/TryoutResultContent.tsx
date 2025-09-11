"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, RotateCcw, Home, Star } from "lucide-react"
import { useGameStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"

interface TryoutResultContentProps {
  gameCode: string
}

export default function TryoutResultContent({ gameCode }: TryoutResultContentProps) {
  const router = useRouter()
  const { score, correctAnswers, resetGame, resetGameKeepMode, setGameMode } = useGameStore()
  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState<any>(null)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [playerName, setPlayerName] = useState("")
  const [isRestarting, setIsRestarting] = useState(false)

  useEffect(() => {
    const fetchResults = async () => {
      try {
        // Get game and quiz info
        const { data: gameData } = await supabase
          .from("games")
          .select("quiz_id, question_count")
          .eq("code", gameCode.toUpperCase())
          .single()

        if (gameData) {
          setTotalQuestions(gameData.question_count)

          const { data: quizData } = await supabase
            .from("quizzes")
            .select("title, description")
            .eq("id", gameData.quiz_id)
            .single()

          if (quizData) {
            setQuiz(quizData)
          }

        }

        // Get player name
        const { data: playerData } = await supabase
          .from("players")
          .select("name")
          .eq("game_id", gameCode)
          .single()

        if (playerData) {
          setPlayerName(playerData.name)
        }
      } catch (error) {
        console.error("Error fetching results:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [gameCode])

  const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

  const getPerformanceMessage = () => {
    if (percentage >= 90) return "Excellent! 🌟"
    if (percentage >= 80) return "Great job! 🎉"
    if (percentage >= 70) return "Good work! 👍"
    if (percentage >= 60) return "Not bad! 😊"
    return "Keep practicing! 💪"
  }

  const getPerformanceColor = () => {
    if (percentage >= 90) return "text-yellow-400"
    if (percentage >= 80) return "text-green-400"
    if (percentage >= 70) return "text-blue-400"
    if (percentage >= 60) return "text-orange-400"
    return "text-red-400"
  }

  const handleRestart = async () => {
    if (!quiz) {
      alert("Quiz not found")
      return
    }

    setIsRestarting(true)
    try {
      // Get current game settings
      const { data: currentGame } = await supabase
        .from("games")
        .select("time_limit, question_count, quiz_id")
        .eq("code", gameCode.toUpperCase())
        .single()

      if (!currentGame) {
        throw new Error("Current game settings not found")
      }

      if (!currentGame.quiz_id) {
        throw new Error("Quiz ID not found in current game")
      }

      // Create new game with same settings
      const newGameCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      const { data, error } = await supabase
        .from("games")
        .insert({
          code: newGameCode,
          quiz_id: currentGame.quiz_id,
          status: "playing",
          time_limit: currentGame.time_limit,
          question_count: currentGame.question_count,
          is_started: true,
          quiz_start_time: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      if (!data) {
        throw new Error("No data returned from restart creation")
      }

      // Reset game state and set new game info
      resetGame()
      
      // Navigate directly to the new tryout play page
      router.push(`/tryout-play/${newGameCode}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      console.error("Error restarting tryout:", errorMessage)
      alert(`Failed to restart tryout: ${errorMessage}`)
    } finally {
      setIsRestarting(false)
    }
  }


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
            <p className="text-white text-sm sm:text-base md:text-lg">Loading results...</p>
          </div>
        </div>
      </div>
    );
  }

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
      <div className="relative z-10 min-h-screen flex items-center justify-center p-2 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl"
        >
          <Card className="bg-black/20 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader className="text-center pb-3 sm:pb-4 p-4 sm:p-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mx-auto mb-3 sm:mb-4"
              >
                <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-400" />
              </motion.div>
              <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text">
                Tryout Complete!
              </CardTitle>
              {quiz && (
                <p className="text-gray-300 mt-1 sm:mt-2 text-sm sm:text-base">{quiz.title}</p>
              )}
            </CardHeader>

            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
              {/* Player Name */}
              {playerName && (
                <div className="text-center">
                  <p className="text-white text-sm sm:text-base md:text-lg">
                    <span className="text-gray-400">Player:</span> {playerName}
                  </p>
                </div>
              )}

              {/* Score Display */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 text-center">
                <div className="bg-white/10 rounded-lg p-3 sm:p-4">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-300">{score}</div>
                  <div className="text-xs sm:text-sm text-gray-300">Total Score</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3 sm:p-4">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-300">{correctAnswers}/{totalQuestions}</div>
                  <div className="text-xs sm:text-sm text-gray-300">Correct Answers</div>
                </div>
              </div>

              {/* Percentage */}
              <div className="text-center">
                <div className={`text-2xl sm:text-3xl md:text-4xl font-bold ${getPerformanceColor()}`}>
                  {percentage}%
                </div>
                <div className="text-sm sm:text-base md:text-lg text-gray-300 mt-1 sm:mt-2">
                  {getPerformanceMessage()}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-3 sm:h-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className={`h-3 sm:h-4 rounded-full ${
                    percentage >= 90 ? 'bg-yellow-400' :
                    percentage >= 80 ? 'bg-green-400' :
                    percentage >= 70 ? 'bg-blue-400' :
                    percentage >= 60 ? 'bg-orange-400' : 'bg-red-400'
                  }`}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-3 sm:pt-4">
                <Button
                  onClick={handleRestart}
                  disabled={isRestarting}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold flex items-center justify-center gap-2 text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3"
                >
                  {isRestarting ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                      <span className="hidden sm:inline">Restarting...</span>
                      <span className="sm:hidden">Restarting</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                      Restart
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    resetGameKeepMode() // Reset game but keep tryout mode
                    setGameMode("tryout") // Explicitly ensure tryout mode is set
                    router.push("/select-quiz")
                  }}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold flex items-center justify-center gap-2 text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3"
                >
                  <Home className="w-3 h-3 sm:w-4 sm:h-4" />
                  Back to Quizzes
                </Button>
              </div>

            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}
