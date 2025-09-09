"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Clock, Hash, Play, ArrowLeft, Settings, Sparkles, Star, Gamepad2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useGameStore } from "@/lib/store"

interface Quiz {
  id: number
  title: string
  description: string
  questions: any[]
}

interface TryoutSettings {
  timeLimit: number
  questionCount: number
}

export default function TryoutSettingsPage() {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [timeLimit, setTimeLimit] = useState(600) // 10 minutes default
  const [questionCount, setQuestionCount] = useState(9)

  const router = useRouter()
  const params = useParams()
  const { setQuizId, setGameCode, setGameId, setIsHost } = useGameStore()

  const quizId = params.quizId as string

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const { data, error } = await supabase
          .from("quizzes")
          .select(`
            *,
            questions (
              id,
              question,
              choices (
                id,
                choice_text,
                is_correct
              )
            )
          `)
          .eq("id", quizId)
          .single()

        if (error) {
          console.error("Error fetching quiz:", {
            message: error.message || "Unknown error",
            details: error.details || "No details available",
            hint: error.hint || "No hint available",
            code: error.code || "No code available",
            fullError: error
          })
          router.push("/select-quiz")
          return
        }

        if (data) {
          setQuiz(data as Quiz)
          // Set default question count based on available questions
          const maxQuestions = data.questions?.length || 0
          if (maxQuestions > 0) {
            setQuestionCount(Math.min(9, maxQuestions))
          }
        } else {
          console.error("No quiz data returned for ID:", quizId)
          router.push("/select-quiz")
        }
      } catch (error) {
        console.error("Error fetching quiz:", {
          error: error instanceof Error ? error.message : "Unknown error occurred",
          quizId,
          timestamp: new Date().toISOString(),
          fullError: error
        })
        router.push("/select-quiz")
      } finally {
        setIsLoading(false)
      }
    }

    if (quizId) {
      fetchQuiz()
    }
  }, [quizId, router])

  const handleStartTryout = async () => {
    if (!quiz) {
      alert("Quiz not found")
      return
    }

    setIsStarting(true)
    try {
      if (!quiz.questions || quiz.questions.length === 0) {
        throw new Error("Selected quiz has no questions")
      }

      if (questionCount > quiz.questions.length) {
        throw new Error(
          `Cannot select ${questionCount} questions from a quiz with only ${quiz.questions.length} questions`,
        )
      }

      const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      const { data, error } = await supabase
        .from("games")
        .insert({
          code: gameCode,
          quiz_id: quiz.id,
          status: "playing", // Use valid status value for tryout
          time_limit: timeLimit,
          question_count: questionCount,
        })
        .select()
        .single()

      if (error) {
        console.error("Supabase error details:", {
          message: error.message || "Unknown error",
          details: error.details || "No details available",
          hint: error.hint || "No hint available",
          code: error.code || "No code available",
        })
        throw new Error(`Database error: ${error.message || "Unknown database error"}`)
      }

      if (!data) {
        throw new Error("No data returned from tryout creation")
      }

      // Update the game to mark it as started for tryout mode
      const { error: updateError } = await supabase
        .from("games")
        .update({
          is_started: true,
          quiz_start_time: new Date().toISOString(),
        })
        .eq("id", data.id)

      if (updateError) {
        console.warn("Warning: Could not update game start status:", updateError.message)
        // Continue anyway as the game was created successfully
      }


      setQuizId(quiz.id)
      setGameCode(gameCode)
      setGameId(data.id)
      setIsHost(false) // Set to false for tryout mode

      router.push(`/tryout-play/${gameCode}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      console.error("Error creating tryout:", {
        error: errorMessage,
        quiz: quiz?.id,
        timestamp: new Date().toISOString(),
        fullError: error,
      })

      alert(`Failed to create tryout: ${errorMessage}`)
    } finally {
      setIsStarting(false)
    }
  }

  const timeOptions = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]

  const getQuestionOptions = () => {
    const maxQuestions = quiz?.questions?.length || 0
    const options: number[] = []
    for (let i = 3; i <= maxQuestions; i += 3) options.push(i)
    if (maxQuestions > 0 && maxQuestions % 3 !== 0) options.push(maxQuestions)
    return options
  }

  if (isLoading) {
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
    )
  }

  if (!quiz) {
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
            <p className="text-white text-sm sm:text-base md:text-lg mb-4">Quiz not found</p>
            <Button
              onClick={() => router.push("/select-quiz")}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3"
            >
              Back to Quiz Selection
            </Button>
          </div>
        </div>
      </div>
    )
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
      
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-2 sm:p-4 lg:p-8">
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl">
          {/* Header */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-transparent bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text leading-tight">
              {quiz.title}
            </h1>
            <p className="text-gray-300 text-xs sm:text-sm md:text-base mt-1 sm:mt-2 max-w-full">
              {quiz.description}
            </p>
          </div>

          {/* Main Card */}
          <Card className="bg-black/20 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardContent className="p-4 sm:p-6 md:p-8">
              {/* Settings Form */}
              <div className="space-y-4 sm:space-y-6 md:space-y-8">

                {/* Time Settings */}
                <div className="space-y-2 sm:space-y-3">
                  <Label className="text-sm sm:text-base font-semibold text-cyan-100 flex items-center gap-2">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-400 flex-shrink-0" />
                    <span className="text-xs sm:text-sm md:text-base">Total time limit (1-60 minutes)</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={timeLimit / 60}
                    onChange={(e) => setTimeLimit(Number(e.target.value) * 60)}
                    className="w-full bg-black/30 border-cyan-400/30 text-white placeholder:text-cyan-200/60 backdrop-blur-sm focus:border-cyan-400 focus:ring-cyan-400/20 text-sm sm:text-base h-8 sm:h-10"
                  />
                </div>

                {/* Question Count Settings */}
                <div className="space-y-2 sm:space-y-3">
                  <Label className="text-sm sm:text-base font-semibold text-cyan-100 flex items-center gap-2">
                    <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-400 flex-shrink-0" />
                    <span className="text-xs sm:text-sm md:text-base">Number of Questions</span>
                  </Label>
                  <Select
                    value={String(questionCount)}
                    onValueChange={(value) => setQuestionCount(Number(value))}
                  >
                    <SelectTrigger className="w-full bg-black/30 border-cyan-400/30 text-white placeholder:text-cyan-200/60 backdrop-blur-sm focus:border-cyan-400 focus:ring-cyan-400/20 h-8 sm:h-10 text-sm sm:text-base">
                      <SelectValue placeholder="Select number of questions" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-cyan-400/30 backdrop-blur-xl max-h-48 sm:max-h-60 overflow-y-auto z-50">
                      {getQuestionOptions().map((count) => (
                        <SelectItem key={count} value={String(count)} className="text-cyan-100 hover:bg-cyan-400/30 hover:text-white focus:bg-cyan-400/30 focus:text-white text-sm sm:text-base">
                          {count} Questions
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-4 sm:pt-6">
                  <Button
                    variant="outline"
                    onClick={() => router.push("/select-quiz")}
                    className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2 sm:py-3 bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20 transition-all duration-300 text-sm sm:text-base"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleStartTryout}
                    disabled={isStarting}
                    className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2 sm:py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30 border border-cyan-400/30 backdrop-blur-sm text-sm sm:text-base"
                  >
                    {isStarting ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                        <span className="hidden sm:inline">Starting...</span>
                        <span className="sm:hidden">Starting</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                        Start
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
