"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Clock, CircleHelp, Play, ArrowLeft, Gamepad2, Sparkles, Star, Settings, Loader2 } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { Quiz, GameSettings } from "@/lib/types"

interface RulesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quiz: Quiz | null
  onStartGame: (settings: GameSettings) => void
  isLoading?: boolean
}

export function RulesDialog({ open, onOpenChange, quiz, onStartGame, isLoading = false }: RulesDialogProps) {
  const { t } = useLanguage()
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(5) // 5 minutes
  const timeLimit = timeLimitMinutes // Already in minutes for database
  const [questionCount, setQuestionCount] = useState(5) // Default 5 questions

  // Reset to default values when dialog opens
  useEffect(() => {
    if (open) {
      setTimeLimitMinutes(5) // Reset to default 5 minutes
      setQuestionCount(5) // Reset to default 5 questions
    }
  }, [open])

  const handleStartGame = () => {
    onStartGame({ timeLimit, questionCount })
  }

  const dialogVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  const minTime = 5 // minimum 5 minutes
  const maxTime = 30 // maximum 30 minutes

  const getQuestionOptions = () => {
    const maxQuestions = quiz?.questions?.length || 0
    const options: number[] = []

    // Default options: 5, 10, 20 (maksimal 20)
    // Only show options that are available in the quiz (max 20)
    const maxAllowed = Math.min(maxQuestions, 20)

    if (maxAllowed >= 5) {
      options.push(5)
    }
    if (maxAllowed >= 10) {
      options.push(10)
    }
    if (maxAllowed >= 20) {
      options.push(20)
    }

    // If quiz has less than 5 questions, show only what's available
    if (maxQuestions > 0 && maxQuestions < 5) {
      return [maxQuestions]
    }

    // If no questions, return default options
    if (options.length === 0) {
      return [5, 10, 20]
    }

    return options
  }

  const getTimeLimitOptions = () => {
    const options: number[] = []
    // Time limit options: 5, 10, 15, 20, 25, 30 minutes (kelipatan 5, maksimal 30)
    for (let i = 5; i <= maxTime; i += 5) {
      options.push(i)
    }
    return options
  }

  if (!quiz) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={dialogVariants}
            transition={{ duration: 0.3 }}
          >
            <DialogContent className="max-w-md p-0 border-0 bg-transparent">
              {/* Space Background */}
              <div className="fixed inset-0 z-0 overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage: "url('/images/galaxy.webp')",
                  }}
                />

                {/* Animated space elements */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute orbit-inner">
                    <div className="w-2 h-2 bg-gradient-to-br from-orange-400 to-red-500 rounded-full shadow-lg shadow-orange-400/60 border border-orange-300/30">
                      <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/20"></div>
                    </div>
                  </div>
                  <div className="absolute orbit-middle">
                    <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full shadow-lg shadow-blue-400/70 border border-blue-300/40 relative">
                      <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/25"></div>
                      <div className="absolute top-1 left-1 w-1 h-1 bg-green-300 rounded-full opacity-60"></div>
                    </div>
                  </div>
                  <div className="absolute orbit-outer">
                    <div className="w-4 h-4 bg-gradient-to-br from-purple-300 to-indigo-500 rounded-full shadow-lg shadow-purple-400/60 border border-purple-200/40">
                      <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/20"></div>
                    </div>
                  </div>
                </div>

                {/* Cosmic rings */}
                <div className="absolute inset-0 flex items-center justify-center cosmic-ring-slow">
                  <div className="w-80 h-80 border border-purple-300/10 rounded-full"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center" style={{ animation: "cosmic-ring-orbit 120s linear infinite" }}>
                  <div className="w-96 h-96 border border-blue-300/8 rounded-full"></div>
                </div>

                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/40"></div>
              </div>

              {/* Glass morphism dialog content */}
              <div className="relative z-10 bg-black/20 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
                <DialogHeader className="mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
                    className="mb-4 flex justify-center"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500/30 to-cyan-500/30 backdrop-blur-xl rounded-2xl flex items-center justify-center border-2 border-white/40 shadow-lg shadow-purple-500/20 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-cyan-400/10 animate-pulse"></div>
                      <Settings className="w-8 h-8 text-white relative z-10" />
                      <Sparkles className="absolute top-1 right-1 w-3 h-3 text-cyan-300 animate-pulse" />
                      <Star className="absolute bottom-1 left-1 w-2 h-2 text-purple-300 animate-pulse" style={{ animationDelay: "1s" }} />
                    </div>
                  </motion.div>

                  <DialogTitle
                    className="text-2xl font-bold text-center text-transparent bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text flex items-center justify-center gap-2"
                    style={{
                      textShadow: "0 0 20px rgba(147, 197, 253, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)",
                      fontFamily: "monospace",
                      imageRendering: "pixelated",
                    }}
                  >
                    <Clock className="h-6 w-6 text-cyan-400" />
                    {t('gameRules')}
                  </DialogTitle>
                  <DialogDescription id="rules-description" className="sr-only">
                    {t('gameRules')}
                  </DialogDescription>
                </DialogHeader>

                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="mb-6 bg-black/30 border-cyan-400/30 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-cyan-100 font-mono">{quiz.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-cyan-200/80 mb-4 font-mono">{quiz.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  transition={{ delay: 0.2 }}
                  className="space-y-6"
                >
                  {/* Settings Grid - Side by Side */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Time Settings - Left */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-cyan-100 flex items-center gap-2 font-mono">
                        <Clock className="h-4 w-4 text-cyan-400" />
                        {t('timeLimit')}
                      </Label>
                      <Select
                        value={String(timeLimitMinutes)}
                        onValueChange={(value) => setTimeLimitMinutes(Number(value))}
                      >
                        <SelectTrigger className="w-full bg-black/30 border-cyan-400/30 text-white placeholder:text-cyan-200/60 backdrop-blur-sm focus:border-cyan-400 focus:ring-cyan-400/20 font-mono text-sm">
                          <SelectValue placeholder={t('selectTimeLimit')} />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-cyan-400/30 backdrop-blur-xl">
                          {getTimeLimitOptions().map((minutes) => (
                            <SelectItem key={minutes} value={String(minutes)} className="text-cyan-100 hover:bg-cyan-400/30 hover:text-white focus:bg-cyan-400/30 focus:text-white font-mono transition-all duration-200 cursor-pointer">
                              {minutes} {t('minutes')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Question Count Settings - Right */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-cyan-100 flex items-center gap-2 font-mono">
                        <CircleHelp className="h-4 w-4 text-cyan-400" />
                        {t('numberOfQuestions')}
                      </Label>
                      <Select
                        value={String(questionCount)}
                        onValueChange={(value) => setQuestionCount(Number(value))}
                      >
                        <SelectTrigger className="w-full bg-black/30 border-cyan-400/30 text-white placeholder:text-cyan-200/60 backdrop-blur-sm focus:border-cyan-400 focus:ring-cyan-400/20 font-mono text-sm">
                          <SelectValue placeholder={t('selectNumberOfQuestions')} />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-cyan-400/30 backdrop-blur-xl">
                          {getQuestionOptions().map((count) => (
                            <SelectItem key={count} value={String(count)} className="text-cyan-100 hover:bg-cyan-400/30 hover:text-white focus:bg-cyan-400/30 focus:text-white font-mono transition-all duration-200 cursor-pointer">
                              {count} {t('questions')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between pt-4">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="flex items-center gap-2 bg-black/30 border-cyan-400/30 text-cyan-100 hover:bg-cyan-500/30 hover:border-cyan-400 hover:text-white backdrop-blur-sm font-mono px-6 transition-all duration-200"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        {t('back')}
                      </Button>
                    </motion.div>
                    <motion.div whileHover={!isLoading ? { scale: 1.02 } : {}} whileTap={!isLoading ? { scale: 0.98 } : {}}>
                      <Button
                        onClick={handleStartGame}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-cyan-500/30 border border-cyan-400/30 backdrop-blur-sm font-mono relative overflow-hidden px-6 disabled:opacity-70 disabled:cursor-not-allowed"
                        style={{ imageRendering: "pixelated" }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 animate-pulse"></div>
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 relative z-10 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 relative z-10" />
                        )}
                        <span className="relative z-10">{isLoading ? t('creating') : t('startGame')}</span>
                        {!isLoading && <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>}
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </DialogContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  )
}