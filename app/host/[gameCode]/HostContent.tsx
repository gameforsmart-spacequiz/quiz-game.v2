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
} from "lucide-react"
import { useGameStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"
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
interface PlayerProgress {
  id: string
  name: string
  avatar: string
  score: number
  currentQuestion: number
  totalQuestions: number
  isActive: boolean
  rank: number
}

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

// === SMART NAME DISPLAY ===
const SmartNameDisplay = React.memo(({
  name,
  maxLength = 12,
  className = "",
  multilineClassName = ""
}: {
  name: string;
  maxLength?: number;
  className?: string;
  multilineClassName?: string;
}) => {
  const { displayName, isBroken } = formatDisplayName(name, maxLength)

  if (isBroken) {
    return (
      <span className={`${className} ${multilineClassName} whitespace-pre-line leading-tight`}>
        {displayName}
      </span>
    )
  }

  return (
    <span className={className}>
      {displayName}
    </span>
  )
})
SmartNameDisplay.displayName = "SmartNameDisplay"

// === STABLE SCORE DISPLAY ===
const StableScoreDisplay = React.memo(({
  score,
  playerId
}: {
  score: number;
  playerId: string;
}) => {
  const [displayScore, setDisplayScore] = useState(score)

  useEffect(() => {
    // Only update if score actually increased (prevents flickering to 0)
    if (score > displayScore) {
      setDisplayScore(score)
    }
  }, [score, displayScore])

  return (
    <span className="font-bold">
      {displayScore}
    </span>
  )
})
StableScoreDisplay.displayName = "StableScoreDisplay"

// === MAGNIFICENT PODIUM LEADERBOARD ===
const PodiumLeaderboard = React.memo(
  ({ players, onAnimationComplete, onRestart, onHome }: {
    players: PlayerProgress[];
    onAnimationComplete: () => void;
    onRestart?: () => void;
    onHome?: () => void;
  }) => {
    const router = useRouter()
    const [hasAnimated, setHasAnimated] = useState(false)
    const [showFireworks, setShowFireworks] = useState(false)

    useEffect(() => {
      if (!hasAnimated) {
        setHasAnimated(true)
        setShowFireworks(true)
        onAnimationComplete()
        // Hide fireworks after animation
        setTimeout(() => setShowFireworks(false), 3000)
      }
    }, [hasAnimated, onAnimationComplete])

    const sorted = [...players].sort((a, b) => b.score - a.score)

    // Fireworks animation component
    const Fireworks = () => (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: window.innerHeight,
              scale: 0,
              opacity: 1,
            }}
            animate={{
              y: Math.random() * window.innerHeight * 0.3,
              scale: [0, 1, 0],
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              delay: Math.random() * 2,
              ease: "easeOut",
            }}
          />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute text-2xl"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 50}%`,
            }}
            initial={{ scale: 0, rotate: 0, opacity: 0 }}
            animate={{
              scale: [0, 1.5, 1, 0],
              rotate: [0, 180, 360],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 3,
              delay: Math.random() * 1.5,
              ease: "easeInOut",
            }}
          >
            ⭐
          </motion.div>
        ))}
      </div>
    )

    // 1 player - Grand Champion
    if (sorted.length === 1) {
      const [onlyPlayer] = sorted
      return (
        <div className="min-h-screen relative overflow-hidden">
          {showFireworks && <Fireworks />}

          {/* Spotlight effect */}
          <div className="absolute inset-0 bg-gradient-radial from-yellow-400/20 via-transparent to-black/40" />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
            className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 lg:p-8 font-mono text-white relative z-10"
          >
            {/* Home button - Left center */}
            <motion.button
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 2 }}
              onClick={onHome || (() => router.push("/"))}
              className="fixed left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300 hover:scale-110"
              aria-label="Back to Dashboard"
            >
              <Home className="w-6 h-6 sm:w-7 sm:h-7" />
            </motion.button>

            {/* Restart button - Right center */}
            <motion.button
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 2 }}
              onClick={onRestart}
              className="fixed right-4 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all duration-300 hover:scale-110"
              aria-label="Restart Game"
            >
              <RotateCw className="w-6 h-6 sm:w-7 sm:h-7" />
            </motion.button>

            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex items-center justify-center gap-3 mb-2 sm:mb-4"
            >
              <img
                src="/images/logo/spacequiz.webp"
                alt="Space Quiz"
                className="h-8 sm:h-10 md:h-12 lg:h-14 w-auto object-contain"
              />
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white/80">-</span>
              <Image
                src="/images/gameforsmartlogo.png"
                alt="GameForSmart"
                width={280}
                height={112}
                className="w-32 h-auto sm:w-36 md:w-40 lg:w-44 xl:w-48 2xl:w-52 opacity-90 hover:opacity-100 transition-opacity duration-300"
                priority
              />
            </motion.div>

            <motion.h1
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.8, delay: 0.8, type: "spring" }}
              className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 sm:mb-8 lg:mb-12 text-center bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,215,0,0.5)] px-2"
              style={{ textShadow: "0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.4)" }}
            >
              CHAMPIONS
            </motion.h1>

            {/* Champion pedestal */}
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1, delay: 1.2 }}
              className="relative"
            >
              {/* Pedestal base */}
              <div className="relative bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 rounded-t-2xl sm:rounded-t-3xl p-1 shadow-[0_0_30px_rgba(255,215,0,0.6)] sm:shadow-[0_0_50px_rgba(255,215,0,0.6)]">
                <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-t-2xl sm:rounded-t-3xl p-4 sm:p-8 lg:p-12">

                  {/* Glowing ring around avatar */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 blur-lg opacity-75 animate-pulse" />
                    <div className="relative">
                      <Image
                        src={onlyPlayer.avatar || "/placeholder.svg"}
                        alt={getFirstName(onlyPlayer.name)}
                        width={200}
                        height={200}
                        className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-full border-4 sm:border-6 lg:border-8 border-yellow-400 object-cover relative z-10 shadow-[0_0_20px_rgba(255,215,0,0.8)] sm:shadow-[0_0_40px_rgba(255,215,0,0.8)]"
                      />
                    </div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1.5 }}
                    className="text-center mt-6"
                  >
                    <h2 className="font-bold text-lg sm:text-2xl md:text-3xl lg:text-4xl mb-2 text-yellow-300 drop-shadow-lg text-center">
                      <SmartNameDisplay
                        name={onlyPlayer.name}
                        maxLength={10}
                        className="font-bold text-lg sm:text-2xl md:text-3xl lg:text-4xl text-yellow-300 drop-shadow-lg"
                        multilineClassName="text-base sm:text-xl md:text-2xl lg:text-3xl"
                      />
                    </h2>
                    <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-3 sm:px-6 py-2 sm:py-3 rounded-full font-bold text-base sm:text-xl lg:text-2xl shadow-lg">
                      <StableScoreDisplay score={onlyPlayer.score} playerId={onlyPlayer.id} /> POINTS
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Pedestal steps */}
              <div className="bg-gradient-to-b from-yellow-600 to-yellow-700 h-6 sm:h-8 w-full rounded-b-lg shadow-lg" />
              <div className="bg-gradient-to-b from-yellow-700 to-yellow-800 h-4 sm:h-6 w-[110%] -ml-[5%] rounded-b-lg shadow-lg" />
              <div className="bg-gradient-to-b from-yellow-800 to-yellow-900 h-3 sm:h-4 w-[120%] -ml-[10%] rounded-b-lg shadow-lg" />
            </motion.div>
          </motion.div>
        </div>
      )
    }

    // 2 players - Victory Duo
    if (sorted.length === 2) {
      const [first, second] = sorted
      return (
        <div className="min-h-screen relative overflow-hidden">
          {showFireworks && <Fireworks />}

          {/* Home button - Left center */}
          <motion.button
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 1.8 }}
            onClick={onHome || (() => router.push("/"))}
            className="fixed left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300 hover:scale-110"
            aria-label="Back to Dashboard"
          >
            <Home className="w-6 h-6 sm:w-7 sm:h-7" />
          </motion.button>

          {/* Restart button - Right center */}
          <motion.button
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 1.8 }}
            onClick={onRestart}
            className="fixed right-4 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all duration-300 hover:scale-110"
            aria-label="Restart Game"
          >
            <RotateCw className="w-6 h-6 sm:w-7 sm:h-7" />
          </motion.button>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 lg:p-8 font-mono text-white relative z-10"
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex items-center justify-center gap-3 mb-2 sm:mb-4"
            >
              <img
                src="/images/logo/spacequiz.webp"
                alt="Space Quiz"
                className="h-8 sm:h-10 md:h-12 lg:h-14 w-auto object-contain"
              />
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white/80">-</span>
              <Image
                src="/images/gameforsmartlogo.png"
                alt="GameForSmart"
                width={280}
                height={112}
                className="w-32 h-auto sm:w-36 md:w-40 lg:w-44 xl:w-48 2xl:w-52 opacity-90 hover:opacity-100 transition-opacity duration-300"
                priority
              />
            </motion.div>

            <motion.h1
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-8 sm:mb-12 text-center bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent px-2"
              style={{ textShadow: "0 0 20px rgba(255, 215, 0, 0.6)" }}
            >
              🏆 CHAMPIONS 🏆
            </motion.h1>

            <div className="flex items-end justify-center gap-4 sm:gap-8 lg:gap-12">
              {/* Second Place */}
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="flex flex-col items-center"
              >
                {/* Silver Podium */}
                <div className="relative">
                  <div className="bg-gradient-to-b from-gray-300 via-gray-400 to-gray-500 rounded-t-xl sm:rounded-t-2xl p-1 shadow-[0_0_20px_rgba(192,192,192,0.5)] sm:shadow-[0_0_30px_rgba(192,192,192,0.5)]">
                    <div className="bg-gradient-to-b from-gray-700 to-gray-800 rounded-t-xl sm:rounded-t-2xl p-3 sm:p-6 lg:p-8">
                      <div className="relative flex justify-center">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-300 to-gray-400 blur-md opacity-60 animate-pulse" />
                        <Image
                          src={second.avatar || "/placeholder.svg"}
                          alt={getFirstName(second.name)}
                          width={120}
                          height={120}
                          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full border-4 sm:border-6 border-gray-300 object-cover relative z-10 shadow-[0_0_15px_rgba(192,192,192,0.6)] sm:shadow-[0_0_25px_rgba(192,192,192,0.6)]"
                        />
                      </div>
                      <div className="text-center mt-2 sm:mt-4">
                        <div className="text-lg sm:text-2xl mb-1 sm:mb-2">🥈</div>
                        <h3 className="font-bold text-sm sm:text-lg lg:text-xl text-gray-300 text-center">
                          <SmartNameDisplay
                            name={second.name}
                            maxLength={7}
                            className="text-sm sm:text-lg lg:text-xl text-gray-300"
                            multilineClassName="text-xs sm:text-base lg:text-lg"
                          />
                        </h3>
                        <div className="bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 px-2 sm:px-4 py-1 sm:py-2 rounded-full font-bold text-xs sm:text-sm lg:text-base mt-1 sm:mt-2">
                          {second.score} PTS
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-b from-gray-500 to-gray-600 h-12 sm:h-16 w-full rounded-b-lg" />
                  <div className="bg-gradient-to-b from-gray-600 to-gray-700 h-3 sm:h-4 w-[110%] -ml-[5%] rounded-b-lg" />
                </div>
              </motion.div>

              {/* First Place */}
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                className="flex flex-col items-center"
              >
                {/* Gold Podium */}
                <div className="relative">
                  <div className="bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 rounded-t-2xl sm:rounded-t-3xl p-1 shadow-[0_0_30px_rgba(255,215,0,0.7)] sm:shadow-[0_0_40px_rgba(255,215,0,0.7)]">
                    <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-t-2xl sm:rounded-t-3xl p-4 sm:p-8 lg:p-10">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 blur-lg opacity-70 animate-pulse" />
                        <Image
                          src={first.avatar || "/placeholder.svg"}
                          alt={getFirstName(first.name)}
                          width={160}
                          height={160}
                          className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full border-4 sm:border-6 lg:border-8 border-yellow-400 object-cover relative z-10 shadow-[0_0_25px_rgba(255,215,0,0.8)] sm:shadow-[0_0_35px_rgba(255,215,0,0.8)]"
                        />
                      </div>
                      <div className="text-center mt-2 sm:mt-4">
                        <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">🥇</div>
                        <h3 className="font-bold text-base sm:text-xl lg:text-2xl text-yellow-300 text-center">
                          <SmartNameDisplay
                            name={first.name}
                            maxLength={8}
                            className="text-base sm:text-xl lg:text-2xl text-yellow-300"
                            multilineClassName="text-sm sm:text-lg lg:text-xl"
                          />
                        </h3>
                        <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-3 sm:px-6 py-2 sm:py-3 rounded-full font-bold text-sm sm:text-base lg:text-lg mt-1 sm:mt-2">
                          <StableScoreDisplay score={first.score} playerId={first.id} /> PTS
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-b from-yellow-600 to-yellow-700 h-16 sm:h-20 w-full rounded-b-lg" />
                  <div className="bg-gradient-to-b from-yellow-700 to-yellow-800 h-4 sm:h-6 w-[110%] -ml-[5%] rounded-b-lg" />
                  <div className="bg-gradient-to-b from-yellow-800 to-yellow-900 h-3 sm:h-4 w-[120%] -ml-[10%] rounded-b-lg" />
                </div>
              </motion.div>
            </div>

          </motion.div>
        </div>
      )
    }

    // 3+ players - Grand Podium
    const [first, second, third] = [
      sorted[0] || { name: "No Player", score: 0, avatar: "/placeholder.svg" },
      sorted[1] || { name: "No Player", score: 0, avatar: "/placeholder.svg" },
      sorted[2] || { name: "No Player", score: 0, avatar: "/placeholder.svg" },
    ]
    const rest = sorted.slice(3)

    return (
      <div className="min-h-screen relative overflow-hidden">
        {showFireworks && <Fireworks />}

        {/* Epic background effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-radial from-purple-900/30 via-blue-900/20 to-black/60" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-yellow-400/10 via-transparent to-transparent" />
        </div>

        {/* Home button - Left center */}
        <motion.button
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 2.5 }}
          onClick={onHome || (() => router.push("/"))}
          className="fixed left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300 hover:scale-110"
          aria-label="Back to Dashboard"
        >
          <Home className="w-6 h-6 sm:w-7 sm:h-7" />
        </motion.button>

        {/* Restart button - Right center */}
        <motion.button
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 2.5 }}
          onClick={onRestart}
          className="fixed right-4 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all duration-300 hover:scale-110"
          aria-label="Restart Game"
        >
          <RotateCw className="w-6 h-6 sm:w-7 sm:h-7" />
        </motion.button>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
          className="min-h-screen flex items-center justify-center p-2 sm:p-4 lg:p-8 relative z-10"
        >
          <div className="text-center w-full max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex items-center justify-center gap-3 mb-2 sm:mb-4"
            >
              <img
                src="/images/logo/spacequiz.webp"
                alt="Space Quiz"
                className="h-8 sm:h-10 md:h-12 lg:h-14 w-auto object-contain"
              />
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white/80">-</span>
              <Image
                src="/images/gameforsmartlogo.png"
                alt="GameForSmart"
                width={280}
                height={112}
                className="w-32 h-auto sm:w-36 md:w-40 lg:w-44 xl:w-48 2xl:w-52 opacity-90 hover:opacity-100 transition-opacity duration-300"
                priority
              />
            </motion.div>

            <motion.h1
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 1, delay: 0.3, type: "spring", bounce: 0.3 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-8xl font-bold mb-8 sm:mb-12 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent px-2"
              style={{ textShadow: "0 0 40px rgba(255, 215, 0, 0.8)" }}
            >
              🏆 CHAMPIONS 🏆
            </motion.h1>

            {/* Main Podium */}
            <div className="flex items-end justify-center gap-2 sm:gap-4 md:gap-6 lg:gap-8 xl:gap-12 mb-6 sm:mb-8">
              {/* Third Place */}
              <motion.div
                initial={{ x: -200, y: 100, opacity: 0 }}
                animate={{ x: 0, y: 0, opacity: 1 }}
                transition={{ duration: 1, delay: 0.8, type: "spring" }}
                className="flex flex-col items-center"
              >
                <div className="relative">
                  <div className="bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 rounded-t-xl sm:rounded-t-2xl p-1 shadow-[0_0_15px_rgba(217,119,6,0.5)] sm:shadow-[0_0_25px_rgba(217,119,6,0.5)]">
                    <div className="bg-gradient-to-b from-gray-700 to-gray-800 rounded-t-xl sm:rounded-t-2xl p-2 sm:p-4 lg:p-6">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 blur-md opacity-50 animate-pulse" />
                        <Image
                          src={third.avatar || "/placeholder.svg"}
                          alt={getFirstName(third.name)}
                          width={100}
                          height={100}
                          className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full border-2 sm:border-3 border-amber-600 object-cover relative z-10 shadow-[0_0_10px_rgba(217,119,6,0.6)] sm:shadow-[0_0_15px_rgba(217,119,6,0.6)]"
                        />
                      </div>
                      <div className="text-center mt-2 sm:mt-3">
                        <div className="text-base sm:text-xl lg:text-2xl mb-1">🥉</div>
                        <h3 className="font-bold text-xs sm:text-sm lg:text-base text-amber-300 text-center">
                          <SmartNameDisplay
                            name={third.name}
                            maxLength={6}
                            className="text-xs sm:text-sm lg:text-base text-amber-300"
                            multilineClassName="text-xs sm:text-xs lg:text-sm"
                          />
                        </h3>
                        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-2 sm:px-3 py-1 rounded-full font-bold text-xs mt-1">
                          <StableScoreDisplay score={third.score} playerId={third.id} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-b from-amber-800 to-amber-900 h-8 sm:h-12 lg:h-16 w-full rounded-b-lg" />
                  <div className="bg-gradient-to-b from-amber-900 to-amber-950 h-2 sm:h-3 w-[110%] -ml-[5%] rounded-b-lg" />
                </div>
              </motion.div>

              {/* First Place - The Champion */}
              <motion.div
                initial={{ y: 150, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, delay: 1.2, type: "spring", bounce: 0.2 }}
                className="flex flex-col items-center relative"
              >


                <div className="relative">
                  <div className="bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 rounded-t-2xl sm:rounded-t-3xl p-1 sm:p-2 shadow-[0_0_30px_rgba(255,215,0,0.8)] sm:shadow-[0_0_50px_rgba(255,215,0,0.8)]">
                    <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-t-2xl sm:rounded-t-3xl p-3 sm:p-6 lg:p-10">
                      <div className="relative">
                        {/* Multiple glowing rings */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 blur-xl opacity-60 animate-pulse" />
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-300 to-yellow-400 blur-lg opacity-40 animate-pulse" style={{ animationDelay: "0.5s" }} />
                        <div className="relative">
                          <Image
                            src={first.avatar || "/placeholder.svg"}
                            alt={getFirstName(first.name)}
                            width={200}
                            height={200}
                            className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-full border-3 sm:border-4 lg:border-6 border-yellow-400 object-cover relative z-10 shadow-[0_0_20px_rgba(255,215,0,0.9)] sm:shadow-[0_0_30px_rgba(255,215,0,0.9)]"
                          />
                        </div>
                      </div>
                      <div className="text-center mt-2 sm:mt-4">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="text-2xl sm:text-4xl lg:text-5xl mb-1 sm:mb-2"
                        >
                          🥇
                        </motion.div>
                        <h3 className="font-bold text-sm sm:text-xl lg:text-2xl xl:text-3xl text-yellow-300 mb-1 sm:mb-2 text-center">
                          <SmartNameDisplay
                            name={first.name}
                            maxLength={8}
                            className="text-sm sm:text-xl lg:text-2xl xl:text-3xl text-yellow-300"
                            multilineClassName="text-xs sm:text-lg lg:text-xl xl:text-2xl"
                          />
                        </h3>
                        <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-3 sm:px-6 py-2 sm:py-3 rounded-full font-bold text-sm sm:text-lg lg:text-xl shadow-[0_0_15px_rgba(255,215,0,0.5)] sm:shadow-[0_0_20px_rgba(255,215,0,0.5)]">
                          {first.score} PTS
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-b from-yellow-600 to-yellow-700 h-16 sm:h-20 lg:h-24 w-full rounded-b-lg" />
                  <div className="bg-gradient-to-b from-yellow-700 to-yellow-800 h-4 sm:h-6 w-[110%] -ml-[5%] rounded-b-lg" />
                  <div className="bg-gradient-to-b from-yellow-800 to-yellow-900 h-3 sm:h-4 w-[120%] -ml-[10%] rounded-b-lg" />
                </div>
              </motion.div>

              {/* Second Place */}
              <motion.div
                initial={{ x: 200, y: 100, opacity: 0 }}
                animate={{ x: 0, y: 0, opacity: 1 }}
                transition={{ duration: 1, delay: 1.0, type: "spring" }}
                className="flex flex-col items-center"
              >
                <div className="relative">
                  <div className="bg-gradient-to-b from-gray-300 via-gray-400 to-gray-500 rounded-t-xl sm:rounded-t-2xl p-1 shadow-[0_0_20px_rgba(192,192,192,0.6)] sm:shadow-[0_0_30px_rgba(192,192,192,0.6)]">
                    <div className="bg-gradient-to-b from-gray-700 to-gray-800 rounded-t-xl sm:rounded-t-2xl p-2 sm:p-5 lg:p-7">
                      <div className="relative flex justify-center">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-300 to-gray-400 blur-md opacity-60 animate-pulse" />
                        <Image
                          src={second.avatar || "/placeholder.svg"}
                          alt={getFirstName(second.name)}
                          width={120}
                          height={120}
                          className="w-10 h-10 sm:w-16 sm:h-16 md:w-18 md:h-18 lg:w-22 lg:h-22 rounded-full border-2 sm:border-3 lg:border-4 border-gray-300 object-cover relative z-10 shadow-[0_0_12px_rgba(192,192,192,0.7)] sm:shadow-[0_0_20px_rgba(192,192,192,0.7)]"
                        />
                      </div>
                      <div className="text-center mt-2 sm:mt-3">
                        <div className="text-lg sm:text-2xl lg:text-3xl mb-1">🥈</div>
                        <h3 className="font-bold text-xs sm:text-base lg:text-lg text-gray-300 text-center">
                          <SmartNameDisplay
                            name={second.name}
                            maxLength={7}
                            className="text-xs sm:text-base lg:text-lg text-gray-300"
                            multilineClassName="text-xs sm:text-sm lg:text-base"
                          />
                        </h3>
                        <div className="bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 px-2 sm:px-4 py-1 sm:py-2 rounded-full font-bold text-xs sm:text-sm lg:text-base mt-1 sm:mt-2">
                          {second.score} PTS
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-b from-gray-500 to-gray-600 h-10 sm:h-16 lg:h-20 w-full rounded-b-lg" />
                  <div className="bg-gradient-to-b from-gray-600 to-gray-700 h-2 sm:h-4 w-[110%] -ml-[5%] rounded-b-lg" />
                </div>
              </motion.div>
            </div>

            {/* Other players */}
            {rest.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.8 }}
                className="mt-4 sm:mt-6 lg:mt-8"
              >

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 max-w-5xl mx-auto px-2">
                  {rest.map((p, idx) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 2 + idx * 0.1 }}
                      className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-lg sm:rounded-xl p-2 sm:p-4 backdrop-blur-sm hover:border-purple-400/50 transition-all duration-300"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm">
                          {idx + 4}
                        </div>
                        <Image
                          src={p.avatar || "/placeholder.svg"}
                          alt={getFirstName(p.name)}
                          width={40}
                          height={40}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-purple-400 object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-xs sm:text-sm">
                            <SmartNameDisplay
                              name={p.name}
                              maxLength={8}
                              className="text-xs sm:text-sm text-white"
                              multilineClassName="text-xs leading-tight"
                            />
                          </p>
                          <p className="text-purple-300 text-xs sm:text-sm font-semibold">{p.score} pts</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

          </div>
        </motion.div>
      </div>
    )
  },
)
PodiumLeaderboard.displayName = "PodiumLeaderboard"

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
      const newGameCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      const newGameId = generateXID()

      // Create new game session with same settings
      const { data, error } = await supabase
        .from("game_sessions")
        .insert({
          id: newGameId,
          game_pin: newGameCode,
          quiz_id: quiz.id,
          host_id: hostId || "01mdpz2b00100000000p",
          status: "waiting",
          total_time_minutes: gameSettings.timeLimit,
          question_limit: gameSettings.questionCount.toString(),
          participants: [],
          responses: [],
          current_questions: [],
          application: "space-quiz"
        })
        .select()
        .single()

      if (error) {

        toast.error(`Failed to create new game: ${error.message}`)
        return
      }

      if (!data) {
        toast.error("Failed to create new game session")
        return
      }

      // Update store with new game code
      setGameCode(newGameCode)
      setGameId(newGameId)
      setQuizId(quiz.id)

      // Navigate to new game host page
      router.push(`/host/${newGameCode}`)
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
      // Get game session data with participants and responses
      const { data: gameSession, error: gameError } = await supabase
        .from("game_sessions")
        .select("participants, responses")
        .eq("id", gameId)
        .single()

      if (gameError) {

        return
      }

      const participants = gameSession.participants || []
      const responses = gameSession.responses || []

      // Filter out mini-game responses
      const answers = responses.filter((r: any) => r.question_id !== 'mini-game')
      const playersData = participants

      const progressMap = new Map<string, PlayerProgress>()

      playersData.forEach((player: any) => {
        const playerAnswers = answers.filter((a: any) => a.player_id === player.id)

        const uniqueQuestionIds = new Set(playerAnswers.map((a: any) => a.question_id))
        const answeredQuestions = uniqueQuestionIds.size
        const totalQuestions = gameSettings.questionCount || 10

        const calculatedScore = playerAnswers.reduce((sum: number, a: any) => sum + (a.points_earned || 0), 0)
        // Prevent score from flickering to 0 by using the higher value
        const score = Math.max(player.score || 0, calculatedScore)

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
          const quizStartTime = await supabase
            .from("game_sessions")
            .select("started_at")
            .eq("id", gameId)
            .single()

          if (quizStartTime.data?.started_at) {
            const startTime = new Date(quizStartTime.data.started_at).getTime()
            const currentTime = Date.now()
            const quizDuration = currentTime - startTime

            // Only auto-finish if quiz has been running for at least 30 seconds
            if (quizDuration > 30000) { // 30 seconds

              await supabase.from("game_sessions").update({ status: 'finished', ended_at: new Date().toISOString() }).eq("id", gameId)
              setShowLeaderboard(true)

            } else {

            }
          } else {

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
  }, [gameId, quiz, showLeaderboard, gameSettings.questionCount, quizStarted])

  const fetchPlayers = useCallback(async () => {
    if (!gameId) return

    try {

      // Get game session data with participants and responses
      const { data: gameSession, error: gameError } = await supabase
        .from("game_sessions")
        .select("participants, responses")
        .eq("id", gameId)
        .single()

      if (gameError) {

        return
      }

      const playersResult = { data: gameSession.participants || [] }
      const answersResult = { data: (gameSession.responses || []).filter((r: any) => r.question_id !== 'mini-game') }

      const playersData = playersResult.data || []
      const answers = answersResult.data || []


      setPlayers(playersData || [])
      if (playersData) {
        const progressMap = new Map<string, PlayerProgress>()
        playersData.forEach((player: Player) => {
          // Calculate actual progress from answers
          const playerAnswers = answers.filter((a: any) => a.player_id === player.id && a.question_index >= 0)
          const uniqueQuestionIndices = new Set(playerAnswers.map((a: any) => a.question_index))
          const answeredQuestions = uniqueQuestionIndices.size



          progressMap.set(player.id, {
            id: player.id,
            name: player.name,
            avatar: player.avatar || "/placeholder.svg?height=40&width=40&text=Player",
            score: player.score || 0,
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

    }
  }, [gameId, gameSettings.questionCount])

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

    const gameSubscription = supabase
      .channel("game_status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${gameId}` },
        (payload) => {

          const newStatus = payload.new.status;

          // Use if/else if to ensure state transitions are mutually exclusive.
          // This prevents a 'finished' status from being immediately overwritten by an 'active' or 'countdown' check.
          if (newStatus === 'finished') {
            setQuizStarted(false)
            setShowLeaderboard(true)
          } else if (newStatus === 'active') {
            setQuizStarted(true)
            setShowLeaderboard(false)
            if (payload.new.started_at) {
              setStartedAt(payload.new.started_at)
            }
          } else if (payload.new.countdown_started_at) {
            // This handles the UI change for the pre-start countdown.
            setQuizStarted(true)
            setShowLeaderboard(false)
          }
        },
      )
      .subscribe()

    const playersSubscription = supabase
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

        }
      })

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
      supabase.removeChannel(gameSubscription)
      supabase.removeChannel(playersSubscription)
      supabase.removeChannel(responsesSubscription)

      // Cleanup debounced update
      if (debouncedUpdateProgress.current) {
        clearTimeout(debouncedUpdateProgress.current)
      }
    }
  }, [gameId, fetchPlayers, updatePlayerProgress])

  useEffect(() => {
    if (!quizStarted || !gameSettings?.timeLimit) return

    let unsub = () => { }

    // Start timer logic when startedAt is available
    const startTimer = async () => {
      if (!startedAt) return

      // Get server time offset to sync with player timer
      const serverNow = await syncServerTime()
      const clientOffset = serverNow - Date.now()

      const start = new Date(startedAt).getTime()
      const limitMs = gameSettings.timeLimit * 60 * 1000 // Convert minutes to milliseconds

      const tick = async () => {
        const now = Date.now() + clientOffset
        const remain = Math.max(0, start + limitMs - now)
        setQuizTimeLeft(Math.floor(remain / 1000))

        if (remain <= 0 && !hasFinishedGame.current) {
          hasFinishedGame.current = true
          setIsTimerActive(false)


          // Update game status to finished
          try {
            const { error } = await supabase
              .from("game_sessions")
              .update({
                status: 'finished',
                ended_at: new Date().toISOString()
              })
              .eq("id", gameId)

            if (error) {

            } else {

              // Show leaderboard on host page (no navigation)
              setQuizStarted(false)
              setShowLeaderboard(true)
            }
          } catch (err) {

          }
        }
      }

      tick()
      const iv = setInterval(tick, 1000)
      unsub = () => {
        clearInterval(iv)
      }
    }

    startTimer()

    return unsub
  }, [quizStarted, gameSettings?.timeLimit, gameId, startedAt])

  useEffect(() => {
    if (!quizStarted || !gameId) return

    const tick = async () => {
      try {
        const { data } = await supabase.from("game_sessions").select("countdown_started_at, started_at").eq("id", gameId).single()
        if (!data?.countdown_started_at) return

        const start = new Date(data.countdown_started_at).getTime()
        const serverTime = await syncServerTime()
        const elapsed = Math.floor((serverTime - start) / 1000)
        const left = Math.max(0, 10 - elapsed)

        if (left >= 0 && left <= 10) {
          setCountdownLeft(left)
        } else {
          setCountdownLeft(0)
        }

        // Set started_at when countdown finishes (left === 0) and it hasn't been set yet
        if (left === 0 && !data.started_at) {

          const startedAt = new Date(serverTime).toISOString()
          await supabase
            .from("game_sessions")
            .update({ started_at: startedAt, status: 'active' })
            .eq("id", gameId)
        }
      } catch (error) {
        console.error("[HOST] Error in countdown tick:", error)
        setCountdownLeft(0)
      }
    }

    tick()
    const iv = setInterval(tick, 200)
    return () => clearInterval(iv)
  }, [quizStarted, gameId])

  const handleCopyCode = () => {
    navigator.clipboard.writeText(joinUrl)
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
      await supabase
        .from("game_sessions")
        .update({
          status: 'active',
          countdown_started_at: startAt,
          // started_at will be set after countdown finishes
        })
        .eq("id", gameId)
      toast.success("🚀 Quiz started!")
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

    try {
      hasFinishedGame.current = true // Set flag to prevent loops
      await supabase
        .from("game_sessions")
        .update({
          status: 'finished',
          ended_at: new Date().toISOString(),
        })
        .eq("id", gameId)

      setQuizStarted(false)
      setShowLeaderboard(true)
      setQuizManuallyEnded(true) // Mark quiz as manually ended
    } catch {
      toast.error("❌ Failed to end quiz")
    }
  }

  const handleExitGame = async () => {
    isExitingRef.current = true // Set flag to prevent leaderboard flash
    router.push("/select-quiz") // Navigate to select quiz page

    if (gameId) {
      try {
        await supabase
          .from("game_sessions")
          .update({
            status: 'finished',
            ended_at: new Date().toISOString(),
          })
          .eq("id", gameId)

        // Clear participants array
        await supabase
          .from("game_sessions")
          .update({ participants: [] })
          .eq("id", gameId)
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
      <div className="fixed inset-0 bg-black flex items-center justify-center font-mono text-white">
        {mounted && <StaticBackground />}
        <div className="relative z-10 text-white font-mono text-lg">Loading quiz...</div>
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-black/90 border-4 border-white p-12 rounded-lg text-center font-mono text-white"
        >
          <p className="text-3xl mb-4 font-bold">{t('quizStarting')}</p>
          <motion.div
            key={countdownLeft}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, type: "spring" }}
            className="text-9xl font-bold text-yellow-300"
            style={{ textShadow: "4px 4px 0px #000" }}
          >
            {countdownLeft}
          </motion.div>
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

      <div className="relative z-10 container mx-auto px-2 sm:px-4 py-4 sm:py-8 min-h-screen font-mono text-white">
        {showLeaderboard && !isExitingRef.current ? (
          <PodiumLeaderboard
            players={playerProgress}
            onAnimationComplete={() => { }}
            onRestart={handleRestart}
            onHome={handleHome}
          />
        ) : !quizStarted ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <div className="bg-white/10 border-2 border-white/20 p-4 sm:p-6 rounded-lg backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <img
                    src="/images/logo/spacequiz.webp"
                    alt="Space Quiz"
                    className="h-16 sm:h-20 md:h-24 w-auto object-contain"
                  />
                  {/* GameForSmart Logo */}
                  <Image
                    src="/images/gameforsmartlogo.png"
                    alt="GameForSmart"
                    width={150}
                    height={60}
                    className="w-24 h-auto sm:w-28 md:w-32 lg:w-36 xl:w-40 opacity-90 hover:opacity-100 transition-opacity duration-300"
                    priority
                  />
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-4 justify-center mb-4">
                  <div className="flex items-center gap-1 sm:gap-2 bg-blue-100 text-blue-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                    <Timer className="w-3 h-3 sm:w-4 sm:h-4" />
                    {formatTimeMinutes(gameSettings.timeLimit)}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                    <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                    {gameSettings.questionCount} {t('questions')}
                  </div>
                </div>

                <div className="text-center">
                  <div className="relative inline-block w-full max-w-sm sm:max-w-md">
                    <div className="text-2xl sm:text-3xl lg:text-7xl font-mono font-bold bg-white text-black rounded-lg py-4 sm:py-6 lg:py-8 px-6 sm:px-8 lg:px-12 mb-1 pr-8 sm:pr-12 lg:pr-16 w-full">
                      {gameCode}
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="absolute top-2 right-2 p-2 hover:bg-gray-100 rounded transition-colors"
                      title="Copy game code"
                    >
                      {copied ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  </div>

                  <div className="relative inline-block mb-4 w-full max-w-sm sm:max-w-md">
                    <div className="bg-white text-black rounded-lg py-4 sm:py-6 lg:py-8 px-4 sm:px-8 lg:px-12 w-full flex flex-col justify-center items-center relative">
                      {/* Maximize button in top-right corner */}
                      <button
                        onClick={() => setShowQRModal(true)}
                        className="absolute top-2 right-2 p-2 hover:bg-gray-100 rounded transition-colors z-10"
                        title="Click to enlarge QR code"
                      >
                        <Maximize2 className="w-5 h-5 text-gray-600" />
                      </button>

                      <div className="mb-4 py-1">
                        <QRCodeSVG value={joinUrl} size={120} className="sm:w-[140px] sm:h-[140px] lg:w-[335px] lg:h-[335px]" />
                      </div>
                      <div className="w-full">

                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2 sm:p-3">
                          <span className="text-xs sm:text-sm font-mono break-all flex-1 text-gray-900">{joinUrl}</span>
                          <button
                            onClick={handleCopyLink}
                            className="p-2 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                            title="Copy join link"
                          >
                            {linkCopied ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="bg-white/10 border-2 border-white/20 p-4 sm:p-6 rounded-lg backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" /> {t('playersLabel')} ({players.length})
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
                  <div className="text-center py-12 text-white/60">
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">{t('waitingForPlayersToJoin')}</p>
                  </div>
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
                              className="bg-white/10 rounded-lg p-2 sm:p-3 md:p-4 flex flex-col items-center justify-between backdrop-blur-sm relative min-h-[110px] sm:min-h-[130px]"
                            >
                              {/* Kick Button - Made smaller */}
                              <button
                                onClick={() => confirmKickPlayer(player.id, player.name)}
                                className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors duration-200 z-10 flex items-center justify-center"
                                style={{ width: '24px', height: '24px', padding: '0', minWidth: '24px', minHeight: '24px' }}
                                title={`Kick ${player.name}`}
                              >
                                <UserX size={12} style={{ width: '12px', height: '12px' }} />
                              </button>

                              <div className="flex-shrink-0 mt-1">
                                <Image
                                  src={player.avatar || "/placeholder.svg?height=48&width=48&text=Player"}
                                  alt={getFirstName(player.name)}
                                  width={48}
                                  height={48}
                                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full border-2 border-white/30 object-cover"
                                />
                              </div>

                              <div className="text-center w-full px-1 mt-2 flex-shrink-0 pb-1">
                                <h3 className="font-bold text-sm sm:text-base md:text-lg text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] leading-tight break-words relative z-0">
                                  {(() => {
                                    const displayName = getDisplayName(player as any);
                                    return displayName ? (
                                      <SmartNameDisplay
                                        name={displayName}
                                        maxLength={15}
                                        className="text-white text-sm sm:text-base md:text-lg font-bold"
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
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                      <img src="/images/logo/spacequiz.webp" alt="Space Quiz" className="h-6 sm:h-8 w-auto object-contain" />
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                    {getPaginatedProgress(playerProgress, currentProgressPage).sort((a, b) => a.rank - b.rank)
                      .map((player, index) => (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, y: 20, scale: 0.9 }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1
                          }}
                          exit={{ opacity: 0, y: -20, scale: 0.9 }}
                          transition={{
                            duration: 0.6,
                            delay: Math.min(index * 0.05, 1.0),
                            ease: [0.25, 0.46, 0.45, 0.94]
                          }}
                          whileHover={{
                            scale: 1.02,
                            transition: { duration: 0.2 }
                          }}
                          className={`relative overflow-hidden rounded-lg p-3 sm:p-4 border-2 transition-all duration-500 ${player.rank === 1
                            ? "border-yellow-400/70 shadow-lg shadow-yellow-400/20"
                            : player.rank === 2
                              ? "border-gray-300/70 shadow-lg shadow-gray-300/20"
                              : player.rank === 3
                                ? "border-amber-600/70 shadow-lg shadow-amber-600/20"
                                : "border-white/30 shadow-md shadow-white/10"
                            }`}
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
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0 }}
                              transition={{ duration: 0.5, delay: 0.2 }}
                              className="absolute top-2 right-2 z-20"
                            >
                              <div className={`w-3 h-3 rounded-full ${player.rank === 1 ? 'bg-yellow-400' :
                                player.rank === 2 ? 'bg-gray-300' :
                                  'bg-amber-600'
                                } animate-pulse`} />
                            </motion.div>
                          )}

                          {/* Content wrapper with backdrop blur */}
                          <div className="relative z-10 bg-black/20 backdrop-blur-sm rounded-lg p-2 -m-2">
                            {/* Header with rank and avatar */}
                            <div className="flex items-center gap-2 sm:gap-3 mb-3">
                              {/* Rank number */}
                              <motion.div
                                key={`${player.id}-rank-${player.rank}`}
                                initial={{ scale: 0.8, rotate: -10 }}
                                animate={{
                                  scale: 1,
                                  rotate: 0,
                                  boxShadow: player.rank <= 3 ? "0 0 20px rgba(255, 215, 0, 0.5)" : "0 0 10px rgba(255, 255, 255, 0.2)"
                                }}
                                transition={{
                                  duration: 0.6,
                                  ease: "easeOut",
                                  boxShadow: { duration: 0.3 }
                                }}
                                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-sm sm:text-base font-bold ${player.rank === 1
                                  ? "bg-yellow-400 text-black"
                                  : player.rank === 2
                                    ? "bg-gray-300 text-black"
                                    : player.rank === 3
                                      ? "bg-amber-600 text-white"
                                      : "bg-white/20 text-white"
                                  }`}
                              >
                                {player.rank}
                              </motion.div>

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
                                    maxLength={6}
                                    className="text-xs sm:text-sm font-bold text-white"
                                    multilineClassName="text-xs leading-tight"
                                  />
                                </h3>
                                <motion.p
                                  key={`${player.id}-${player.score}`}
                                  initial={{ scale: 1.3, opacity: 0.8 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.5, ease: "easeOut" }}
                                  className={`text-xs font-medium ${player.rank === 1
                                    ? "text-yellow-300"
                                    : player.rank === 2
                                      ? "text-gray-200"
                                      : player.rank === 3
                                        ? "text-amber-400"
                                        : "text-yellow-300"
                                    }`}
                                >
                                  {player.score} points
                                </motion.p>
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
                                <motion.span
                                  key={`${player.id}-progress-${player.currentQuestion}`}
                                  initial={{ scale: 1.2, opacity: 0.7 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.4, ease: "easeOut" }}
                                  className={`font-bold font-mono ${player.totalQuestions > 0
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
                                </motion.span>
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
                        </motion.div>
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
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-[#1a1a2e] border-4 border-white font-mono text-white p-4 sm:p-8 rounded-lg shadow-[8px_8px_0px_#000] max-w-sm sm:max-w-md w-full mx-4 backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <div className="text-2xl sm:text-4xl mb-4">⚠️</div>
                  <h2 className="text-lg sm:text-xl mb-4 font-bold">{t('exitGameQuestion')}</h2>
                  <p className="text-xs sm:text-sm mb-6 text-white/80">
                    {tStatic('exitGameWarning')}
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
                    <PixelButton color="gray" onClick={() => setShowExitModal(false)} className="text-xs sm:text-sm">
                      {tStatic('cancel')}
                    </PixelButton>
                    <PixelButton color="red" onClick={handleExitGame} className="text-xs sm:text-sm">
                      {tStatic('endSession')}
                    </PixelButton>
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
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-[#1a1a2e] border-4 border-white font-mono text-white p-4 sm:p-8 rounded-lg shadow-[8px_8px_0px_#000] max-w-sm sm:max-w-md w-full mx-4 backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <div className="text-2xl sm:text-4xl mb-4">🚫</div>
                  <h2 className="text-lg sm:text-xl mb-4 font-bold">Kick Player?</h2>
                  <p className="text-xs sm:text-sm mb-6 text-white/80">
                    Are you sure you want to kick <span className="font-bold text-red-400">{playerToKick.name}</span> from the game?
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
                    <PixelButton
                      color="gray"
                      onClick={() => {
                        setShowKickModal(false)
                        setPlayerToKick(null)
                      }}
                      className="text-xs sm:text-sm"
                    >
                      {tStatic('cancel')}
                    </PixelButton>
                    <PixelButton color="red" onClick={executeKickPlayer} className="text-xs sm:text-sm">
                      🚫 Kick Player
                    </PixelButton>
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