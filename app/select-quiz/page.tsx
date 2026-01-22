"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, type Transition } from "framer-motion"
import { useRouter } from "next/navigation"
import Image from "next/image"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useGameStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"
import { generateXID } from "@/lib/id-generator"
import { createGameSession } from "@/lib/sessions-api"
import { generateGameCode } from "@/lib/game-utils"
import { Input } from "@/components/ui/input"
import {
  Search,
  Play,
  ArrowLeft,
  Heart,
  User,
  FlaskConical,
  Calculator,
  History,
  Globe,
  Languages,
  Cpu,
  Dumbbell,
  Film,
  Building2,
  LayoutGrid,
  Check,
  ChevronDown,
  Rocket
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
// Lazy load RulesDialog for better initial page performance
const RulesDialog = dynamic(() => import("@/components/rules-dialog").then(mod => ({ default: mod.RulesDialog })), {
  ssr: false,
  loading: () => null,
})
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Quiz, Question, Answer, GameSettings } from "@/lib/types"

// Function to get default image based on category
const getCategoryDefaultImage = (category: string | undefined): string | null => {
  if (!category) return null;

  const categoryImages: Record<string, string> = {
    general: "https://images.unsplash.com/photo-1707926310424-f7b837508c40?q=80&w=1632&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    science: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    math: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    history: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800&h=600&fit=crop&crop=entropy&auto=format&q=80",
    geography: "https://images.unsplash.com/photo-1592252032050-34897f779223?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    language: "https://images.unsplash.com/photo-1620969427101-7a2bb6d83273?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    technology: "https://plus.unsplash.com/premium_photo-1661963874418-df1110ee39c1?q=80&w=1086&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    sports: "https://images.unsplash.com/photo-1556817411-31ae72fa3ea0?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    entertainment: "https://images.unsplash.com/photo-1470020618177-f49a96241ae7?q=80&w=688&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    business: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&h=600&fit=crop&crop=entropy&auto=format&q=80",
  };

  return categoryImages[category.toLowerCase()] || null;
}

// Function to get icon color based on category
const getCategoryIconColor = (category: string): string => {
  const colorMap: Record<string, string> = {
    all: "text-blue-500",
    general: "text-gray-500",
    science: "text-green-500",
    math: "text-blue-500",
    history: "text-yellow-600",
    geography: "text-teal-500",
    language: "text-red-500",
    technology: "text-purple-500",
    sports: "text-orange-500",
    entertainment: "text-pink-500",
    business: "text-indigo-500",
  }
  return colorMap[category.toLowerCase()] || "text-gray-500"
}

type QuizTab = "public" | "my" | "favorite"

export default function SelectQuizPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState<number | null>(null)
  const [isCreatingGame, setIsCreatingGame] = useState(false)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [showRulesDialog, setShowRulesDialog] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedLevel, setSelectedLevel] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<QuizTab>("public")
  const [favoriteQuizIds, setFavoriteQuizIds] = useState<string[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(false)
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [isFetchingQuizzes, setIsFetchingQuizzes] = useState(true)
  const itemsPerPage = 15
  const skipNextFetchRef = useRef(false)

  const router = useRouter()
  const { setQuizId, setGameCode, setGameId, setIsHost, gameMode } = useGameStore()



  const categories = [
    { value: "all", labelKey: "categoryAll" as const, icon: LayoutGrid },
    { value: "general", labelKey: "categoryGeneral" as const, icon: LayoutGrid },
    { value: "science", labelKey: "categoryScience" as const, icon: FlaskConical },
    { value: "math", labelKey: "categoryMath" as const, icon: Calculator },
    { value: "history", labelKey: "categoryHistory" as const, icon: History },
    { value: "geography", labelKey: "categoryGeography" as const, icon: Globe },
    { value: "language", labelKey: "categoryLanguage" as const, icon: Languages },
    { value: "technology", labelKey: "categoryTechnology" as const, icon: Cpu },
    { value: "sports", labelKey: "categorySports" as const, icon: Dumbbell },
    { value: "entertainment", labelKey: "categoryEntertainment" as const, icon: Film },
    { value: "business", labelKey: "categoryBusiness" as const, icon: Building2 },
  ]

  const selectedCategory = categories.find(c => c.value === selectedLevel) || categories[0]

  // Helper function to get translation key from database category value
  const getCategoryTranslationKey = (category: string | undefined): string => {
    if (!category) return t('categoryUnknown')
    const categoryMap: Record<string, string> = {
      'all': t('categoryAll'),
      'general': t('categoryGeneral'),
      'science': t('categoryScience'),
      'math': t('categoryMath'),
      'history': t('categoryHistory'),
      'geography': t('categoryGeography'),
      'language': t('categoryLanguage'),
      'technology': t('categoryTechnology'),
      'sports': t('categorySports'),
      'entertainment': t('categoryEntertainment'),
      'business': t('categoryBusiness'),
    }
    return categoryMap[category.toLowerCase()] || t('categoryUnknown')
  }

  const fetchFavoriteQuizIds = useCallback(async () => {
    if (!profile?.id) {
      setFavoriteQuizIds([])
      return
    }

    try {
      setLoadingFavorites(true)
      const { data, error } = await supabase
        .from("profiles")
        .select("favorite_quiz")
        .eq("id", profile.id)
        .single()

      if (error) {
        console.error("Error fetching favorites:", error)
        return
      }

      if (data?.favorite_quiz?.favorites) {
        setFavoriteQuizIds(data.favorite_quiz.favorites || [])
      } else {
        setFavoriteQuizIds([])
      }
    } catch (err) {
      console.error("Unexpected error fetching favorites:", err)
    } finally {
      setLoadingFavorites(false)
    }
  }, [profile?.id])

  const fetchQuizzes = useCallback(async () => {
    try {
      setIsFetchingQuizzes(true)

      let query = supabase
        .from("quizzes")
        .select("*")

      if (activeTab === "public") {
        query = query.eq("is_public", true)
      } else if (activeTab === "my") {
        if (profile?.id) {
          query = query.eq("creator_id", profile.id)
        } else {
          setQuizzes([])
          return
        }
      } else if (activeTab === "favorite") {
        if (favoriteQuizIds.length > 0) {
          query = query.in("id", favoriteQuizIds)
        } else {
          setQuizzes([])
          return
        }
      }

      if (selectedLevel !== "all") {
        query = query.eq("category", selectedLevel)
      }

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching quizzes:", error)
        alert(`Failed to load quizzes: ${error.message}`)
        return
      }

      if (data) {
        setQuizzes(data as Quiz[])
      } else {
        setQuizzes([])
      }
    } catch (err) {
      console.error("Unexpected error fetching quizzes:", err)
      alert("An unexpected error occurred while loading quizzes")
    } finally {
      setIsFetchingQuizzes(false)
    }
  }, [selectedLevel, activeTab, profile?.id, favoriteQuizIds])

  useEffect(() => {
    fetchFavoriteQuizIds()
  }, [profile?.id, fetchFavoriteQuizIds])

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false
      return
    }
    fetchQuizzes()
  }, [selectedLevel, activeTab, profile?.id, fetchQuizzes])

  const toggleFavorite = async (quizId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!profile?.id) {
      toast({
        title: "Login Required",
        description: "Please login to add quizzes to favorites",
        variant: "destructive",
      })
      return
    }

    try {
      const isFavorite = favoriteQuizIds.includes(quizId)
      let newFavorites: string[]

      if (isFavorite) {
        newFavorites = favoriteQuizIds.filter((id) => id !== quizId)
      } else {
        newFavorites = [...favoriteQuizIds, quizId]
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          favorite_quiz: { favorites: newFavorites },
        })
        .eq("id", profile.id)

      if (error) {
        console.error("Error updating favorites:", error)
        toast({
          title: "Error",
          description: "Failed to update favorites",
          variant: "destructive",
        })
        return
      }

      if (activeTab === "favorite" && isFavorite) {
        skipNextFetchRef.current = true
        setQuizzes((prev) => prev.filter((q) => q.id !== quizId))
      }

      setFavoriteQuizIds(newFavorites)

      toast({
        title: isFavorite ? "Removed from Favorites" : "Added to Favorites",
        duration: 3000,
      })

      if (activeTab !== "favorite" || !isFavorite) {
        setTimeout(() => fetchQuizzes(), 100)
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const handleStartGame = (quiz: Quiz) => {
    setSelectedQuiz(quiz)
    setShowRulesDialog(true)
  }

  const handleTryoutGame = (quiz: Quiz) => {
    router.push(`/tryout-settings/${quiz.id}`)
  }

  const handleCreateGame = async (settings: GameSettings) => {
    if (!selectedQuiz) return

    setIsCreatingGame(true)
    setIsLoading(parseInt(selectedQuiz.id))
    try {
      if (!selectedQuiz.questions || selectedQuiz.questions.length === 0) {
        throw new Error("Selected quiz has no questions")
      }

      if (settings.questionCount > selectedQuiz.questions.length) {
        throw new Error(`Cannot select ${settings.questionCount} questions from a quiz with only ${selectedQuiz.questions.length} questions`)
      }

      // Generate game code and ID
      const gameCode = generateGameCode()
      const gameId = generateXID()

      // Shuffle questions and limit based on questionCount
      const allQuestions = [...selectedQuiz.questions]
      const shuffled = allQuestions.sort(() => Math.random() - 0.5)
      const questionsToUse = shuffled.slice(0, settings.questionCount)

      // Create session in Supabase B (sessions table) with current_questions
      const session = await createGameSession({
        id: gameId,
        game_pin: gameCode,
        quiz_id: selectedQuiz.id,
        quiz_title: selectedQuiz.title,
        host_id: profile?.id || generateXID(), // Use authenticated user ID or generate one
        status: "waiting",
        settings: {
          timeLimit: settings.timeLimit,
          questionCount: settings.questionCount,
          application: "space-quiz"
        },
        timestamps: {
          created_at: new Date().toISOString()
        },
        current_questions: questionsToUse // Shuffled questions saved here
      })

      if (!session) {
        throw new Error("Failed to create game session in Supabase B")
      }

      setQuizId(selectedQuiz.id)
      setGameCode(session.game_pin)
      setGameId(session.id)
      setIsHost(true)

      router.push(`/host/${session.game_pin}`)
      setShowRulesDialog(false)
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      alert(`Failed to create game: ${msg}`)
    } finally {
      setIsCreatingGame(false)
      setIsLoading(null)
    }
  }

  const handleSearch = () => {
    setIsSearching(true)
    setIsTyping(false)
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
    if (e.key === 'Enter') handleSearch()
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

  useEffect(() => setCurrentPage(1), [appliedSearchQuery])

  // Optimized animation settings for better performance
  const cardSpringTransition: Transition = {
    type: "tween",
    duration: 0.2,
    ease: "easeOut"
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: cardSpringTransition },
    hover: { scale: 1.02 },
    tap: { scale: 0.99 },
  }

  const buttonVariants = {
    hover: { scale: 1.03 },
    tap: { scale: 0.97 },
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
        {/* Tabs and Search Row */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 xs:gap-4 mb-4 xs:mb-6"
        >
          {/* Back Button and Tabs */}
          <div className="flex items-center gap-2 xs:gap-3">
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              size="sm"
              className="bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20 transition-all duration-300 text-xs sm:text-sm px-2 xs:px-3"
            >
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden xs:inline">{t('back')}</span>
            </Button>

            <div className="w-px h-6 bg-white/20 hidden sm:block" />

            <Button
              onClick={() => { setActiveTab("public"); setCurrentPage(1) }}
              variant={activeTab === "public" ? "default" : "outline"}
              className={`transition-all duration-300 text-xs xs:text-sm sm:text-base ${activeTab === "public"
                ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                : "bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20"
                }`}
            >
              {t('quizzes')}
            </Button>
            <Button
              onClick={() => { setActiveTab("my"); setCurrentPage(1) }}
              variant={activeTab === "my" ? "default" : "outline"}
              disabled={!profile?.id}
              size="icon"
              className={`transition-all duration-300 ${activeTab === "my"
                ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                : "bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20"
                } ${!profile?.id ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button
              onClick={() => { setActiveTab("favorite"); setCurrentPage(1) }}
              variant={activeTab === "favorite" ? "default" : "outline"}
              disabled={!profile?.id}
              size="icon"
              className={`transition-all duration-300 ${activeTab === "favorite"
                ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                : "bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20"
                } ${!profile?.id ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === "favorite" ? "fill-white" : ""}`} />
            </Button>
          </div>

          {/* Search and Category */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 xs:gap-3 sm:gap-4">
            <div className="flex items-center flex-1 sm:flex-initial sm:min-w-[180px] md:min-w-[200px] lg:min-w-[280px]">
              <div className="relative flex-1">
                <Search className="absolute left-2 xs:left-3 top-1/2 -translate-y-1/2 h-3 w-3 xs:h-4 xs:w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder={t('searchQuizzes')}
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onKeyPress={handleKeyPress}
                  className="pl-8 xs:pl-10 pr-3 rounded-l-lg rounded-r-none bg-white/10 backdrop-blur-lg border-white/20 border-r-0 text-white placeholder:text-gray-300 focus:bg-white/20 focus:border-purple-400 transition-all duration-300 text-xs xs:text-sm sm:text-base w-full h-9 xs:h-10"
                />
              </div>
              <button
                onClick={handleSearch}
                className="h-9 xs:h-10 px-3 xs:px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-r-lg transition-all duration-300 flex items-center justify-center shadow-lg shadow-purple-500/20"
                title={t('searchQuizzes')}
              >
                <Search className="h-4 w-4 xs:h-5 xs:w-5" />
              </button>
            </div>

            <DropdownMenu open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="px-3 xs:px-4 sm:px-5 py-2 rounded-lg bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20 focus:bg-white/20 focus:border-purple-400 transition-all duration-300 cursor-pointer text-xs xs:text-sm sm:text-base w-full sm:w-auto h-9 xs:h-10 flex items-center gap-2 justify-between min-w-[140px] sm:min-w-[180px]"
                >
                  <div className="flex items-center gap-2">
                    <selectedCategory.icon className="h-4 w-4 text-cyan-400" />
                    <span className="truncate">{t(selectedCategory.labelKey)}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 opacity-70 transition-transform duration-200 ${isCategoryOpen ? "rotate-180" : ""}`} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-60 bg-white/10 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 p-2 max-h-[400px] overflow-y-auto"
                align="end"
              >
                <DropdownMenuLabel className="text-gray-300 text-sm font-medium px-3 py-2">
                  {t('selectCategory')}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                {categories.map((category) => {
                  const IconComponent = category.icon
                  const isSelected = selectedLevel === category.value
                  return (
                    <DropdownMenuItem
                      key={category.value}
                      onClick={() => setSelectedLevel(category.value)}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg mx-1 my-0.5 transition-all duration-200 ${isSelected
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                        : "text-gray-200 hover:bg-white/10"
                        }`}
                    >
                      <IconComponent className={`h-5 w-5 ${isSelected ? "text-white" : getCategoryIconColor(category.value)
                        }`} />
                      <span className="flex-1 text-sm font-medium">{t(category.labelKey)}</span>
                      {isSelected && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>

        <div className="flex-grow">

          {(isSearching || isTyping || isFetchingQuizzes) && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 md:py-24">
              {/* Simplified Loader - CSS-based for better performance */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6">
                {/* Single rotating ring with CSS animation */}
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
                <div
                  className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 border-r-indigo-500 animate-spin"
                  style={{ animationDuration: '1s' }}
                />
                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Rocket className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
              </div>

              {/* Loading text - no delay animation */}
              <p className="text-white/70 text-sm sm:text-base font-medium mb-4">
                {isSearching ? t('searching') : t('loadingQuizzes')}
              </p>
            </div>
          )}

          {/* NO QUIZZES FOUND */}
          {!isSearching && !isTyping && !isFetchingQuizzes && filteredQuizzes.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center py-20 sm:py-28 md:py-32"
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
                className="mb-6"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <Search className="w-7 h-7 sm:w-9 sm:h-9 text-purple-400/70" />
                </div>
              </motion.div>

              {/* Title */}
              <h3 className="text-lg sm:text-xl font-semibold text-white/90 mb-2">
                {t('noQuizzesFound')}
              </h3>

              {/* Subtitle */}
              <p className="text-gray-400 text-sm sm:text-base text-center max-w-sm px-4 mb-6">
                {appliedSearchQuery
                  ? t('tryDifferentSearch')
                  : activeTab === "my"
                    ? t('createFirstQuiz')
                    : activeTab === "favorite"
                      ? t('addToFavorites')
                      : t('adjustFilters')}
              </p>

              {/* Clear Button */}
              {(appliedSearchQuery || selectedLevel !== "all") && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSearchQuery("")
                    setAppliedSearchQuery("")
                    setSelectedLevel("all")
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all duration-300 shadow-lg shadow-purple-500/20"
                >
                  {t('clearFilters')}
                </motion.button>
              )}
            </motion.div>
          )}

          {/* QUIZ GRID DENGAN TOOLTIP YANG TIDAK TERPOTONG */}
          {!isSearching && !isTyping && !isFetchingQuizzes && filteredQuizzes.length > 0 && (
            <TooltipProvider delayDuration={200}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6"
              >
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
                    <Card className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 relative bg-slate-900/80 border-white/10 text-white overflow-hidden h-full flex flex-col rounded-2xl group">
                      {/* Image Section - More Prominent */}
                      <div className="relative h-36 sm:h-40 md:h-44 w-full overflow-hidden flex-shrink-0 rounded-t-2xl">
                        {(quiz.cover_image || quiz.image_url || getCategoryDefaultImage(quiz.category)) ? (
                          <>
                            <Image
                              src={quiz.cover_image || quiz.image_url || getCategoryDefaultImage(quiz.category) || ''}
                              alt={quiz.title}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 25vw"
                              loading={index < 4 ? 'eager' : 'lazy'}
                              priority={index < 2}
                              placeholder="empty"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/50 z-10" />
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-blue-900/50" />
                        )}

                        {/* Favorite Icon - Top Right */}
                        {profile?.id && (
                          <button
                            onClick={(e) => toggleFavorite(quiz.id, e)}
                            className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors duration-200 border border-white/10"
                            aria-label={favoriteQuizIds.includes(quiz.id) ? "Remove from favorites" : "Add to favorites"}
                          >
                            <Heart
                              className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-200 ${favoriteQuizIds.includes(quiz.id)
                                ? "fill-red-500 text-red-500"
                                : "text-white/80 hover:text-red-400"
                                }`}
                            />
                          </button>
                        )}
                      </div>

                      {/* Content Section - Optimized Background */}
                      <div className="flex flex-col flex-1 p-4 bg-slate-800/90">
                        {/* Title with Tooltip */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <h3 className="text-base sm:text-lg font-bold text-white hover:text-purple-300 transition-colors duration-200 leading-snug line-clamp-2 mb-3 cursor-pointer">
                              {quiz.title}
                            </h3>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            align="center"
                            sideOffset={12}
                            avoidCollisions={true}
                            collisionPadding={16}
                          >
                            <p className="leading-relaxed">{quiz.title}</p>
                          </TooltipContent>
                        </Tooltip>

                        {/* Bottom Section */}
                        <div className="mt-auto flex items-end justify-between gap-2">
                          {/* Left: Questions Count & Category Badge */}
                          <div className="flex flex-col gap-2">
                            {/* Questions Count */}
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl sm:text-3xl font-bold text-white">{quiz.questions?.length || 0}</span>
                              <span className="text-xs sm:text-sm text-gray-400 uppercase tracking-wide">Questions</span>
                            </div>

                            {/* Category Badge */}
                            <span className="inline-flex items-center bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full text-xs font-medium capitalize border border-cyan-500/30 w-fit">
                              {getCategoryTranslationKey(quiz.category)}
                            </span>
                          </div>

                          {/* Right: Action Buttons */}
                          <div className="flex flex-col gap-2">
                            {gameMode !== "tryout" && (
                              <motion.div whileHover="hover" whileTap="tap" variants={buttonVariants}>
                                <Button
                                  onClick={(e) => { e.stopPropagation(); handleStartGame(quiz) }}
                                  disabled={isLoading === parseInt(quiz.id)}
                                  size="sm"
                                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-full shadow-lg shadow-purple-500/30 disabled:opacity-50 flex items-center gap-1.5 px-4 py-2 text-sm"
                                >
                                  {isLoading === parseInt(quiz.id) ? (
                                    <span>{t('starting')}</span>
                                  ) : (
                                    <>
                                      <Play className="h-4 w-4 fill-white" />
                                      <span>{t('start')}</span>
                                    </>
                                  )}
                                </Button>
                              </motion.div>
                            )}
                            {gameMode !== "host" && (
                              <motion.div whileHover="hover" whileTap="tap" variants={buttonVariants}>
                                <Button
                                  onClick={(e) => { e.stopPropagation(); handleTryoutGame(quiz) }}
                                  disabled={isLoading === parseInt(quiz.id)}
                                  size="sm"
                                  variant="outline"
                                  className="bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20 transition-all duration-300 flex items-center gap-1 text-xs rounded-full px-3 py-1.5"
                                >
                                  Tryout
                                </Button>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </TooltipProvider>
          )}

          {/* Empty States & Pagination tetap sama seperti kode asli kamu */}
          {/* ... (tidak saya ubah karena tidak perlu diubah) */}
        </div>

        {/* Pagination */}
        {!isSearching && !isTyping && !isFetchingQuizzes && filteredQuizzes.length > 0 && (
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
                    className={`text-white font-semibold px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition text-sm sm:text-base ${currentPage === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-white/30 cursor-pointer"}`}
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  const shouldShow = totalPages <= 5 ||
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1) ||
                    (currentPage <= 3 && page <= 4) ||
                    (currentPage >= totalPages - 2 && page >= totalPages - 3)

                  if (!shouldShow && (page === currentPage - 2 || page === currentPage + 2)) {
                    return (
                      <PaginationItem key={`ellipsis-${page}`}>
                        <span className="text-white px-2 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base">...</span>
                      </PaginationItem>
                    )
                  }
                  if (!shouldShow) return null

                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className={`cursor-pointer font-semibold px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition text-sm sm:text-base ${currentPage === page
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
                    className={`text-white font-semibold px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition text-sm sm:text-base ${currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-white/30 cursor-pointer"}`}
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
        isLoading={isCreatingGame}
      />
    </>
  )
}