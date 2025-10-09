"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence, type Transition } from "framer-motion"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useGameStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"
import { generateXID } from "@/lib/id-generator"
import { Input } from "@/components/ui/input"
import { Search, Play, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react"
import { RulesDialog } from "@/components/rules-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useLanguage } from "@/contexts/language-context"
import { Quiz, Question, Answer, GameSettings } from "@/lib/types"


// Function to get appropriate image based on quiz title
const getQuizImage = (title: string): string => {
  const titleLower = title.toLowerCase()
  
  // Mapping quiz titles to appropriate images
  if (titleLower.includes('angka') || titleLower.includes('berhitung') || titleLower.includes('matematika')) {
    return '/images/1-buku.png'
  } else if (titleLower.includes('hewan') || titleLower.includes('binatang') || titleLower.includes('animal')) {
    return '/images/kucing-lucu.png'
  } else if (titleLower.includes('buah') || titleLower.includes('fruit')) {
    return '/images/apel-merah.png'
  } else if (titleLower.includes('warna') || titleLower.includes('color')) {
    return '/images/5-bola-warna-warni.png'
  } else if (titleLower.includes('bentuk') || titleLower.includes('shape') || titleLower.includes('geometri')) {
    return '/images/persegi-biru.png'
  } else if (titleLower.includes('huruf') || titleLower.includes('alphabet') || titleLower.includes('kata')) {
    return '/images/1-buku.png'
  } else if (titleLower.includes('transportasi') || titleLower.includes('kendaraan') || titleLower.includes('mobil')) {
    return '/images/1-mobil.png'
  } else if (titleLower.includes('alam') || titleLower.includes('nature') || titleLower.includes('tumbuhan')) {
    return '/images/7-bunga.png'
  } else if (titleLower.includes('makanan') || titleLower.includes('food') || titleLower.includes('sayuran')) {
    return '/images/wortel-oranye.png'
  } else if (titleLower.includes('benda') || titleLower.includes('objek') || titleLower.includes('object')) {
    return '/images/jam-dinding-bulat.png'
  } else {
    // Default image for general knowledge or other topics
    return '/images/gambar-tutor.png'
  }
}

export default function SelectQuizPage() {
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState<number | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [showRulesDialog, setShowRulesDialog] = useState(false)
  const [expandedQuizId, setExpandedQuizId] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedLevel, setSelectedLevel] = useState<string>("all")
  const itemsPerPage = 15

  const router = useRouter()
  const { setQuizId, setGameCode, setGameId, setIsHost, gameMode } = useGameStore()

  // Debug log for gameMode
  console.log("SelectQuizPage - Current gameMode:", gameMode)

  const difficultyLevels = [
    { value: "all", label: t('allCategory') },
    { value: "general", label: "General" },
    { value: "technology", label: "Technology" },
  ]

  const fetchQuizzes = useCallback(async () => {
    try {
      console.log("========================================")
      console.log("QUIZ FETCH DEBUG INFO")
      console.log("========================================")
      console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log("Supabase Key exists:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      console.log("Selected Level:", selectedLevel)
      console.log("Supabase client:", supabase)
      
      let query = supabase
        .from("quizzes")
        .select("*")
      
      // Apply level filter only if not "all"
      if (selectedLevel !== "all") {
        query = query.eq("category", selectedLevel)
      }
      
      console.log("Executing simple SELECT * query...")
      const { data, error } = await query.order("created_at", { ascending: false })
      
      console.log("Query completed!")

      if (error) {
        console.error("Error fetching quizzes:", error)
        console.error("Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        // Show user-friendly error message
        alert(`Failed to load quizzes: ${error.message}`)
        return
      }

      if (data) {
        console.log("Successfully fetched quizzes:", data.length)
        console.log("Quiz data:", data)
        setQuizzes(data as Quiz[])
      } else {
        console.warn("No quiz data returned from database")
        setQuizzes([])
      }
    } catch (err) {
      console.error("Unexpected error fetching quizzes:", err)
      alert("An unexpected error occurred while loading quizzes")
    }
  }, [selectedLevel])

  useEffect(() => {
    fetchQuizzes()
  }, [selectedLevel, fetchQuizzes])

  const handleStartGame = (quiz: Quiz) => {
    setSelectedQuiz(quiz)
    setShowRulesDialog(true)
  }

  const handleTryoutGame = (quiz: Quiz) => {
    router.push(`/tryout-settings/${quiz.id}`)
  }


  const handleCreateGame = async (settings: GameSettings) => {
    if (!selectedQuiz) return

    setIsLoading(parseInt(selectedQuiz.id))
    try {
      if (!selectedQuiz.questions || selectedQuiz.questions.length === 0) {
        throw new Error("Selected quiz has no questions")
      }

      if (settings.questionCount > selectedQuiz.questions.length) {
        throw new Error(
          `Cannot select ${settings.questionCount} questions from a quiz with only ${selectedQuiz.questions.length} questions`,
        )
      }

      const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      const gameId = generateXID()

      const { data, error } = await supabase
        .from("game_sessions")
        .insert({
          id: gameId,
          game_pin: gameCode,
          quiz_id: selectedQuiz.id,
          host_id: "01mdpz2b00100000000p", // Use existing profile ID
          status: "waiting",
          total_time_minutes: settings.timeLimit,
          question_limit: settings.questionCount.toString(),
          participants: [],
          responses: [],
          chat_messages: [],
          current_questions: [],
          application: "space-quiz"
        })
        .select()
        .single()

      if (error) {
        console.error("Supabase error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        throw new Error(`Database error: ${error.message}`)
      }

      if (!data) {
        throw new Error("No data returned from game creation")
      }

      setQuizId(selectedQuiz.id)
      setGameCode(gameCode)
      setGameId(data.id)
      setIsHost(true)

      router.push(`/host/${gameCode}`)
      setShowRulesDialog(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      console.error("Error creating game:", {
        error: errorMessage,
        selectedQuiz: selectedQuiz?.id,
        settings,
        timestamp: new Date().toISOString(),
      })

      alert(`Failed to create game: ${errorMessage}`)
    } finally {
      setIsLoading(null)
    }
  }

  const handleSearch = () => {
    setIsSearching(true)
    setIsTyping(false)
    // Simulate search delay for better UX
    setTimeout(() => {
      setAppliedSearchQuery(searchQuery)
      setCurrentPage(1)
      setIsSearching(false)
    }, 500)
  }

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    
    if (value.trim() !== "") {
      setIsTyping(true)
    } else {
      setIsTyping(false)
      setAppliedSearchQuery("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const filteredQuizzes = quizzes.filter(
    (quiz) =>
      quiz.title.toLowerCase().includes(appliedSearchQuery.toLowerCase()) ||
      (quiz.description || "").toLowerCase().includes(appliedSearchQuery.toLowerCase()),
  )

  const totalPages = Math.ceil(filteredQuizzes.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentQuizzes = filteredQuizzes.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [appliedSearchQuery])

  const cardSpringTransition: Transition = { type: "spring", stiffness: 100, damping: 10 }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: cardSpringTransition },
    hover: { scale: 1.03, boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.1)" },
    tap: { scale: 0.98 },
  }

  const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  }

  return (
    <>
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/galaxy.webp')",
          }}
        />
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      <div className="relative z-10 container mx-auto px-1 xs:px-2 sm:px-4 py-3 xs:py-4 sm:py-8 min-h-screen flex flex-col max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 xs:gap-4 lg:gap-6 mb-4 xs:mb-6 lg:mb-8"
        >
          <div className="flex items-center gap-1 xs:gap-2 sm:gap-4">
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              size="sm"
              className="bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20 transition-all duration-300 text-xs sm:text-sm px-2 xs:px-3"
            >
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden xs:inline">Back</span>
            </Button>
            <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-transparent bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text leading-tight">
              {t('selectQuiz')}
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 xs:gap-3 sm:gap-4 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial sm:min-w-[180px] md:min-w-[200px] lg:min-w-[250px]">
              <Search className="absolute left-2 xs:left-3 top-1/2 -translate-y-1/2 h-3 w-3 xs:h-4 xs:w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={t('searchQuizzes')}
                value={searchQuery}
                onChange={handleSearchInputChange}
                onKeyPress={handleKeyPress}
                className="pl-8 xs:pl-10 pr-10 xs:pr-12 rounded-lg bg-white/10 backdrop-blur-lg border-white/20 text-white placeholder:text-gray-300 focus:bg-white/20 focus:border-purple-400 transition-all duration-300 text-xs xs:text-sm sm:text-base w-full h-9 xs:h-10"
              />
              {/* Search Button Icon */}
              <button
                onClick={handleSearch}
                className="absolute right-2 xs:right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-purple-300 transition-colors duration-200"
                title={t('searchQuizzes')}
              >
                <Search className="h-3 w-3 xs:h-4 xs:w-4" />
              </button>
            </div>

            {/* Level Selector */}
            <div className="relative flex-shrink-0">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-2 xs:px-3 sm:px-4 py-2 rounded-lg bg-white/10 backdrop-blur-lg border border-white/20 text-white focus:bg-white/20 focus:border-purple-400 transition-all duration-300 cursor-pointer text-xs xs:text-sm sm:text-base w-full sm:w-auto h-9 xs:h-10"
              >
                {difficultyLevels.map((level) => (
                  <option key={level.value} value={level.value} className="bg-gray-800 text-white">
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Konten utama */}
        <div className="flex-grow">
          {/* Search Results Info */}
          {appliedSearchQuery && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-4 sm:mb-6 text-center px-2"
            >
              <p className="text-gray-300 text-sm sm:text-base md:text-lg">
                Showing {filteredQuizzes.length} quiz{filteredQuizzes.length !== 1 ? 'es' : ''} for &quot;{appliedSearchQuery}&quot;
              </p>
            </motion.div>
          )}

          {/* Loading State - Show when searching or typing */}
          {(isSearching || isTyping) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20"
            >
              <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-purple-400 mb-3 sm:mb-4"></div>
              <p className="text-gray-300 text-sm sm:text-base md:text-lg text-center px-4">
                {isSearching ? "Searching for quizzes..." : "Loading. . ."}
              </p>
            </motion.div>
          )}
          
          {/* Quiz Grid - Only show when not searching and not typing */}
          {!isSearching && !isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-4 gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6"
            >
            <TooltipProvider>
              {currentQuizzes.map((quiz, index) => (
                <motion.div
                  key={quiz.id}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  whileTap="tap"
                  variants={cardVariants}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="cursor-pointer transition-all duration-300 hover:shadow-purple-100 relative bg-white/10 backdrop-blur-lg border-white/20 text-white overflow-hidden h-full flex flex-col">
                    {/* Quiz Image */}
                    <div className="relative h-24 sm:h-28 md:h-32 w-full overflow-hidden flex-shrink-0">
                      <Image
                        src={getQuizImage(quiz.title)}
                        alt={quiz.title}
                        fill
                        className="object-cover transition-transform duration-300 hover:scale-110"
                        sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                        onError={() => {
                          // Fallback handled in the getQuizImage function
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
                    </div>
                    <CardHeader className="pb-2 sm:pb-3 relative -mt-2 sm:-mt-4 z-20 flex-shrink-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CardTitle
                                className={`text-sm sm:text-base md:text-lg hover:text-purple-300 transition-colors duration-200 leading-tight ${expandedQuizId === parseInt(quiz.id) ? "" : "truncate"}`}
                              >
                                {quiz.title}
                              </CardTitle>
                            </TooltipTrigger>
                            <TooltipContent className="bg-purple-600 text-white border-none shadow-lg rounded-md p-2 max-w-xs">
                              <p>{quiz.title}</p>
                            </TooltipContent>
                          </Tooltip>
                          <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs flex-shrink-0">
                            {quiz.category || "Unknown"} Level
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedQuizId(expandedQuizId === parseInt(quiz.id) ? null : parseInt(quiz.id))
                          }}
                          className="text-gray-300 hover:text-purple-300 transition-colors flex-shrink-0 p-1"
                        >
                          {expandedQuizId === parseInt(quiz.id) ? (
                            <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                          ) : (
                            <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                          )}
                        </button>
                      </div>

                      <AnimatePresence>
                        {expandedQuizId === parseInt(quiz.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <CardDescription className="text-xs sm:text-sm mt-1 sm:mt-2 text-gray-300 leading-relaxed">{quiz.description}</CardDescription>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardHeader>
                    <CardContent className="pb-3 sm:pb-4 flex-1 flex flex-col justify-end">
                      <div className="flex items-center justify-between gap-2 sm:gap-3">
                        <span className="text-xs sm:text-sm text-gray-300">{quiz.questions?.length || 0} {t('questions')}</span>
                        <div className="flex gap-1.5 sm:gap-2">
                          {/* Show Tryout button only when mode is not "host" */}
                          {gameMode !== "host" && (
                            <motion.div whileHover="hover" whileTap="tap" variants={buttonVariants}>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  console.log("Tryout button clicked, gameMode:", gameMode)
                                  handleTryoutGame(quiz)
                                }}
                                disabled={isLoading === parseInt(quiz.id)}
                                size="sm"
                                variant="outline"
                                className="bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20 transition-all duration-300 flex items-center gap-1 text-xs sm:text-sm"
                              >
                                Tryout
                              </Button>
                            </motion.div>
                          )}
                          {/* Show Start button only when mode is not "tryout" */}
                          {gameMode !== "tryout" && (
                            <motion.div whileHover="hover" whileTap="tap" variants={buttonVariants}>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStartGame(quiz)
                                }}
                                disabled={isLoading === parseInt(quiz.id)}
                                size="sm"
                                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg shadow-md disabled:opacity-50 flex items-center gap-1 text-xs sm:text-sm"
                              >
                                {isLoading === parseInt(quiz.id) ? (
                                  <span className="truncate">{t('starting')}</span>
                                ) : (
                                  <>
                                    <Play className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{t('start')}</span>
                                  </>
                                )}
                              </Button>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
                         </TooltipProvider>
           </motion.div>
          )}

          {filteredQuizzes.length === 0 && appliedSearchQuery && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-center py-8 sm:py-12 px-4"
            >
              <p className="text-gray-300 text-sm sm:text-base md:text-lg mb-4">No quizzes found matching &quot;{appliedSearchQuery}&quot;.</p>
              <Button
                onClick={() => {
                  setSearchQuery("")
                  setAppliedSearchQuery("")
                  setIsTyping(false)
                }}
                variant="outline"
                size="sm"
                className="bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20 transition-all duration-300 text-sm sm:text-base"
              >
                Clear Search
              </Button>
            </motion.div>
          )}
        </div>

        {/* ✅ Pagination selalu di bawah tengah */}
        {!isSearching && !isTyping && filteredQuizzes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex justify-center mt-8 sm:mt-12"
          >
            <Pagination>
              <PaginationContent className="bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl p-2 sm:p-3 flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={`text-white font-semibold px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition text-sm sm:text-base ${
                      currentPage === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-white/30 cursor-pointer"
                    }`}
                  />
                </PaginationItem>

                {/* Show page numbers with responsive display */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show all pages on mobile if totalPages <= 5, otherwise show smart pagination
                  const shouldShow = totalPages <= 5 || 
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1) ||
                    (currentPage <= 3 && page <= 4) ||
                    (currentPage >= totalPages - 2 && page >= totalPages - 3)
                  
                  if (!shouldShow) {
                    // Show ellipsis for hidden pages
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <PaginationItem key={`ellipsis-${page}`}>
                          <span className="text-white px-2 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base">...</span>
                        </PaginationItem>
                      )
                    }
                    return null
                  }

                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className={`cursor-pointer font-semibold px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition text-sm sm:text-base ${
                          currentPage === page
                            ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
                            : "text-white hover:bg-white/30"
                        }`}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    className={`text-white font-semibold px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition text-sm sm:text-base ${
                      currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-white/30 cursor-pointer"
                    }`}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </motion.div>
        )}
      </div>

      <RulesDialog
        open={showRulesDialog}
        onOpenChange={setShowRulesDialog}
        quiz={selectedQuiz}
        onStartGame={handleCreateGame}
      />

    </>
  )
}