"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Play, Users, Gamepad2, Sparkles, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { JoinGameDialog } from "@/components/join-game-dialog"
import { TutorialModal } from "@/components/tutorial-modal"
import { AppMenu } from "@/components/app-menu"
import { UserProfile } from "@/components/auth/user-profile"
import { AuthGuard } from "@/components/auth/auth-guard"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"
import { useGameStore } from "@/lib/store"

function GameCodeHandler({ onGameCodeDetected }: { onGameCodeDetected: (code: string) => void }) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const codeParam = searchParams.get("code")
    if (codeParam) {
      // Validasi ketat: hanya terima kode yang panjangnya persis 6 digit (game code)
      // Abaikan kode OAuth yang biasanya lebih panjang (biasanya 40+ karakter)
      const trimmedCode = codeParam.trim().toUpperCase()

      // Validasi: hanya terima jika panjangnya persis 6 karakter dan alphanumeric
      const isValidGameCode = trimmedCode.length === 6 && /^[A-Z0-9]{6}$/.test(trimmedCode)

      if (isValidGameCode) {

        onGameCodeDetected(trimmedCode)

        // Hapus parameter code dari URL agar tidak terdeteksi lagi
        const newUrl = window.location.pathname
        window.history.replaceState(null, "", newUrl)
      } else {
        // Jika bukan kode 6 digit, abaikan (kemungkinan kode OAuth atau invalid)

        // Hapus parameter code dari URL meskipun tidak valid untuk mencegah masalah
        const newUrl = window.location.pathname
        window.history.replaceState(null, "", newUrl)
      }
    }
  }, [searchParams, onGameCodeDetected])

  return null
}

function HomePageContent() {
  const { t } = useLanguage()
  const { user, profile } = useAuth()
  const { resetGame, setGameMode } = useGameStore()
  const [showJoinGame, setShowJoinGame] = useState(false)
  const [gameCodeFromUrl, setGameCodeFromUrl] = useState("")
  const router = useRouter()
  const [showTutorial, setShowTutorial] = useState(false)
  const [hasUserClickedJoin, setHasUserClickedJoin] = useState(false)
  const [hasShownTutorial, setHasShownTutorial] = useState(false)

  // Reset game state when user returns to landing page
  useEffect(() => {
    resetGame()
    // Clear any stored game session references
    localStorage.removeItem('current-game-id')
  }, [resetGame])

  // Auto trigger join dialog with pending game code after login
  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      const pendingCode = localStorage.getItem('pending-game-code')

      if (pendingCode) {

        localStorage.removeItem('pending-game-code')

        // Set game code and trigger join dialog
        setGameCodeFromUrl(pendingCode)
        setShowJoinGame(true)
        setShowTutorial(false)

        // Clear URL parameter if exists
        const url = new URL(window.location.href)
        url.searchParams.delete('code')
        window.history.replaceState(null, '', url.toString())
      }
    }
  }, [user])

  const handleGameCodeDetected = (code: string) => {


    setGameCodeFromUrl(code)

    // Reset state untuk memastikan tutorial muncul
    setShowJoinGame(false)
    setShowTutorial(false)

    // Selalu tampilkan tutorial untuk user baru dari link join
    if (!hasShownTutorial) {

      setShowTutorial(true)
      setHasShownTutorial(true)
    } else {

      // Untuk user yang sudah pernah lihat, tetap tampilkan tutorial
      setShowTutorial(true)
    }


  }

  const handleHostGame = () => {
    setGameMode("host")
    router.push("/select-quiz")
  }

  // Handle tutorial close
  const handleTutorialClose = (closedByX: boolean = false) => {

    setShowTutorial(false)

    // Jika ditutup dengan tombol X, jangan buka dialog join
    if (closedByX) {

      setGameCodeFromUrl("") // Reset gameCodeFromUrl
      setHasUserClickedJoin(false) // Reset hasUserClickedJoin
      return
    }

    // Jika ada game code dari URL, langsung buka dialog join
    if (gameCodeFromUrl) {

      setShowJoinGame(true)
    } else if (hasUserClickedJoin) {
      // Jika user klik tombol JOIN (bukan dari URL), buka dialog join

      setShowJoinGame(true)
    }
  }

  // Handle tutorial confirm (user selesai tutorial)
  const handleTutorialConfirm = () => {

    setShowTutorial(false)
    // Jika ada game code dari URL, langsung buka dialog join
    if (gameCodeFromUrl) {

      setShowJoinGame(true)
    } else if (hasUserClickedJoin) {
      // Jika user klik tombol JOIN (bukan dari URL), buka dialog join

      setShowJoinGame(true)
    }
  }

  // Handle closing of JoinGameDialog
  const handleJoinGameDialogClose = (open: boolean) => {
    setShowJoinGame(open)
    if (!open) {
      // Reset showTutorial when closing JoinGameDialog
      setShowTutorial(false)
      setGameCodeFromUrl("") // Reset gameCodeFromUrl to prevent re-trigger
      setHasUserClickedJoin(false) // Reset hasUserClickedJoin when closing dialog
    }
  }

  useEffect(() => {
    if (!showJoinGame && gameCodeFromUrl && !showTutorial) {
      const url = new URL(window.location.href)
      url.searchParams.delete("code")
      window.history.replaceState(null, "", url.toString())
      setGameCodeFromUrl("")
    }
  }, [showJoinGame, gameCodeFromUrl, showTutorial])

  // Debug effect untuk memantau state changes
  useEffect(() => {
  }, [showJoinGame, showTutorial, gameCodeFromUrl, hasUserClickedJoin])

  return (
    <div className="fixed inset-0 overflow-hidden">
      <Suspense fallback={null}>
        <GameCodeHandler onGameCodeDetected={handleGameCodeDetected} />
      </Suspense>

      <AppMenu />

      {/* Auth Components - User is guaranteed to be logged in here */}
      <UserProfile />

      <div className="fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/galaxy.webp')",
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center">
          {/* Inner orbit planets - responsive sizing */}
          <div className="absolute orbit-inner">
            <div className="w-[1vw] h-[1vw] min-w-[12px] min-h-[12px] max-w-[16px] max-h-[16px] bg-gradient-to-br from-orange-400 to-red-500 rounded-full shadow-lg shadow-orange-400/60 border border-orange-300/30">
              <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/20"></div>
            </div>
          </div>
          <div className="absolute orbit-inner" style={{ animationDelay: "-10s" }}>
            <div className="w-[0.8vw] h-[0.8vw] min-w-[10px] min-h-[10px] max-w-[14px] max-h-[14px] bg-gradient-to-br from-gray-400 to-gray-600 rounded-full shadow-lg shadow-gray-400/50 border border-gray-300/30">
              <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/30"></div>
            </div>
          </div>

          {/* Middle orbit planets - responsive sizing */}
          <div className="absolute orbit-middle">
            <div className="w-[1.5vw] h-[1.5vw] min-w-[18px] min-h-[18px] max-w-[24px] max-h-[24px] bg-gradient-to-br from-blue-400 to-blue-600 rounded-full shadow-lg shadow-blue-400/70 border border-blue-300/40 relative">
              <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/25"></div>
              <div className="absolute top-[0.2vw] left-[0.2vw] w-[0.2vw] h-[0.2vw] min-w-[2px] min-h-[2px] max-w-[4px] max-h-[4px] bg-green-300 rounded-full opacity-60"></div>
              <div className="absolute bottom-[0.3vw] right-[0.2vw] w-[0.2vw] h-[0.1vw] min-w-[2px] min-h-[1px] max-w-[4px] max-h-[2px] bg-green-400 rounded-full opacity-40"></div>
            </div>
          </div>
          <div className="absolute orbit-middle" style={{ animationDelay: "-17s" }}>
            <div className="w-[1.2vw] h-[1.2vw] min-w-[16px] min-h-[16px] max-w-[20px] max-h-[20px] bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full shadow-lg shadow-yellow-300/60 border border-yellow-200/40">
              <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/20"></div>
            </div>
          </div>

          {/* Outer orbit planets - responsive sizing */}
          <div className="absolute orbit-outer">
            <div className="w-[2vw] h-[2vw] min-w-[24px] min-h-[24px] max-w-[32px] max-h-[32px] bg-gradient-to-br from-orange-300 to-red-600 rounded-full shadow-lg shadow-orange-400/80 border border-orange-200/50 relative">
              <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/20"></div>
              <div className="absolute top-[0.5vw] left-[0.5vw] w-[0.3vw] h-[0.1vw] min-w-[4px] min-h-[2px] max-w-[6px] max-h-[2px] bg-red-800 rounded-full opacity-70"></div>
              <div className="absolute bottom-[0.3vw] right-[0.5vw] w-[0.2vw] h-[0.1vw] min-w-[3px] min-h-[2px] max-w-[4px] max-h-[2px] bg-red-700 rounded-full opacity-50"></div>
            </div>
          </div>
          <div className="absolute orbit-outer" style={{ animationDelay: "-25s" }}>
            <div className="w-[1.8vw] h-[1.8vw] min-w-[22px] min-h-[22px] max-w-[28px] max-h-[28px] bg-gradient-to-br from-red-400 to-red-700 rounded-full shadow-lg shadow-red-400/70 border border-red-300/40">
              <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/15"></div>
            </div>
          </div>

          {/* Far orbit planets with Saturn rings - responsive sizing */}
          <div className="absolute orbit-far">
            <div className="relative">
              <div className="w-[2.5vw] h-[2.5vw] min-w-[30px] min-h-[30px] max-w-[40px] max-h-[40px] bg-gradient-to-br from-yellow-200 to-amber-400 rounded-full shadow-lg shadow-yellow-300/80 border border-yellow-100/50">
                <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/25"></div>
              </div>
              {/* Saturn's rings - responsive */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[3.5vw] h-[3.5vw] min-w-[42px] min-h-[42px] max-w-[56px] max-h-[56px] border border-yellow-200/30 rounded-full"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[4vw] h-[4vw] min-w-[48px] min-h-[48px] max-w-[64px] max-h-[64px] border border-yellow-100/20 rounded-full"></div>
              </div>
            </div>
          </div>
          <div className="absolute orbit-far" style={{ animationDelay: "-35s" }}>
            <div className="w-[1.5vw] h-[1.5vw] min-w-[18px] min-h-[18px] max-w-[24px] max-h-[24px] bg-gradient-to-br from-purple-300 to-indigo-500 rounded-full shadow-lg shadow-purple-400/60 border border-purple-200/40">
              <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/20"></div>
            </div>
          </div>

          {/* Central sun - responsive sizing */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[3vw] h-[3vw] min-w-[36px] min-h-[36px] max-w-[48px] max-h-[48px] bg-gradient-to-br from-yellow-200 via-orange-300 to-red-400 rounded-full shadow-lg shadow-yellow-300/90 border border-yellow-100/60 animate-pulse">
              <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/40"></div>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center cosmic-ring-slow">
          <div className="w-[80vw] h-[80vw] min-w-[320px] min-h-[320px] max-w-[500px] max-h-[500px] border border-purple-300/10 rounded-full"></div>
        </div>

        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ animation: "cosmic-ring-orbit 120s linear infinite" }}
        >
          <div className="w-[100vw] h-[100vw] min-w-[400px] min-h-[400px] max-w-[700px] max-h-[700px] border border-blue-300/8 rounded-full"></div>
        </div>

        {/* Dark Overlay for text readability */}
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 min-h-screen flex flex-col justify-center items-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8 sm:mb-12"
        >


          {/* Logo Image */}
          <div className="relative mb-3 sm:mb-4">
            <img
              src="/images/logo/spacequiz.webp"
              alt="Space Quiz"
              className="h-auto w-[130px] sm:w-[320px] md:w-[380px] lg:w-[390px] mx-auto object-contain drop-shadow-2xl"
              style={{
                filter: "drop-shadow(0 0 20px rgba(147, 197, 253, 0.5)) drop-shadow(0 0 40px rgba(168, 85, 247, 0.3))",
              }}
            />
          </div>
          <p
            className="text-base sm:text-lg md:text-xl text-cyan-100 max-w-2xl mx-auto px-4"
            style={{
              textShadow: "0 0 10px rgba(34, 211, 238, 0.3)",
              fontFamily: "monospace",
            }}
          >
            {t('subtitle', 'Play a quiz game and with your friends!')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 w-full max-w-3xl px-4"
        >
          <motion.div whileHover={{ scale: 1.05, y: -10 }} whileTap={{ scale: 0.95 }} className="group">
            <Button
              onClick={handleHostGame}
              className="w-full h-32 sm:h-36 md:h-40 bg-gradient-to-br from-red-500 to-pink-600 border-2 border-red-400/50 hover:from-red-400 hover:to-pink-500 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-300 flex flex-col items-center justify-center space-y-2 sm:space-y-3 md:space-y-4 text-white font-mono shadow-lg shadow-red-500/30 relative overflow-hidden"
              style={{ imageRendering: "pixelated" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-pink-400/20 animate-pulse"></div>
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-yellow-400 to-orange-500 border-2 border-yellow-300/60 rounded-md flex items-center justify-center group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-yellow-400/40 relative z-10"
                style={{ imageRendering: "pixelated" }}
              >
                <Play className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-red-600" />
              </div>
              <div className="text-center relative z-10">
                <h2 className="text-xl sm:text-xl md:text-2xl font-bold mb-1">{t('host', 'HOST')}</h2>
              </div>
              <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05, y: -10 }} whileTap={{ scale: 0.95 }} className="group">
            <Button
              onClick={() => {

                setHasUserClickedJoin(true)
                setShowTutorial(true)
              }}
              className="w-full h-32 sm:h-36 md:h-40 bg-gradient-to-br from-cyan-500 to-blue-600 border-2 border-cyan-400/50 hover:from-cyan-400 hover:to-blue-500 hover:shadow-xl hover:shadow-cyan-500/40 transition-all duration-300 flex flex-col items-center justify-center space-y-2 sm:space-y-3 md:space-y-4 text-white font-mono shadow-lg shadow-cyan-500/30 relative overflow-hidden"
              style={{ imageRendering: "pixelated" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 animate-pulse"></div>
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-yellow-400 to-orange-500 border-2 border-yellow-300/60 rounded-md flex items-center justify-center group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-yellow-400/40 relative z-10"
                style={{ imageRendering: "pixelated" }}
              >
                <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-cyan-600" />
              </div>
              <div className="text-center relative z-10">
                <h2 className="text-xl sm:text-xl md:text-2xl font-bold mb-1">{t('join', 'JOIN')}</h2>
              </div>
              <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <JoinGameDialog open={showJoinGame} onOpenChange={handleJoinGameDialogClose} initialGameCode={gameCodeFromUrl} />
      {showTutorial && (
        <TutorialModal
          open={showTutorial}
          onClose={handleTutorialClose}
          onConfirm={handleTutorialConfirm}
        />
      )}
    </div>
  )
}

export default function HomePage() {
  return (
    <AuthGuard requireAuth={true}>
      <HomePageContent />
    </AuthGuard>
  )
}