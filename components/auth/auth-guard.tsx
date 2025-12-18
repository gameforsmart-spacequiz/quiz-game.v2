"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import { motion } from "framer-motion"
import { Gamepad2, Sparkles, Star } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function AuthGuard({
  children,
  requireAuth = true,
  redirectTo = "/auth/login"
}: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { t } = useLanguage()
  const [isChecking, setIsChecking] = useState(true)

  // Timeout fallback to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isChecking) {

        setIsChecking(false)
      }
    }, 5000) // 5 second timeout

    return () => clearTimeout(timeout)
  }, [isChecking])

  useEffect(() => {


    // If still loading, wait
    if (loading) {

      return
    }

    // If user is logged in and we require auth, show content
    if (requireAuth && user) {

      setIsChecking(false)
      return
    }

    // If user is not logged in and we require auth, redirect to login
    if (requireAuth && !user) {


      // Save game code from URL to localStorage before redirecting
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        const gameCode = urlParams.get('code')

        // Validate game code (6 characters, alphanumeric) - ignore OAuth codes
        if (gameCode && gameCode.length === 6 && /^[A-Z0-9]{6}$/i.test(gameCode)) {

          localStorage.setItem('pending-game-code', gameCode.toUpperCase())
        }
      }

      router.push(redirectTo)
      return
    }

    // If user is logged in but we don't require auth, redirect to homepage
    if (!requireAuth && user) {

      router.push("/")
      return
    }

    // If no auth required and no user, show content
    if (!requireAuth && !user) {

      setIsChecking(false)
    }
  }, [user, loading, requireAuth, redirectTo, router])

  // Show loading while checking auth
  if (loading || isChecking) {
    return <AuthLoadingScreen />
  }

  // If we reach here, auth state is correct
  return <>{children}</>
}

function AuthLoadingScreen() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
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
            <div className="w-[1vw] h-[1vw] min-w-[12px] min-h-[12px] max-w-[16px] max-h-[16px] bg-gradient-to-br from-orange-400 to-red-500 rounded-full shadow-lg shadow-orange-400/60 border border-orange-300/30">
              <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/20"></div>
            </div>
          </div>
          <div className="absolute orbit-inner" style={{ animationDelay: "-10s" }}>
            <div className="w-[0.8vw] h-[0.8vw] min-w-[10px] min-h-[10px] max-w-[14px] max-h-[14px] bg-gradient-to-br from-gray-400 to-gray-600 rounded-full shadow-lg shadow-gray-400/50 border border-gray-300/30">
              <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/30"></div>
            </div>
          </div>

          <div className="absolute orbit-middle">
            <div className="w-[1.5vw] h-[1.5vw] min-w-[18px] min-h-[18px] max-w-[24px] max-h-[24px] bg-gradient-to-br from-blue-400 to-blue-600 rounded-full shadow-lg shadow-blue-400/70 border border-blue-300/40 relative">
              <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/25"></div>
              <div className="absolute top-[0.2vw] left-[0.2vw] w-[0.2vw] h-[0.2vw] min-w-[2px] min-h-[2px] max-w-[4px] max-h-[4px] bg-green-300 rounded-full opacity-60"></div>
            </div>
          </div>
          <div className="absolute orbit-middle" style={{ animationDelay: "-17s" }}>
            <div className="w-[1.2vw] h-[1.2vw] min-w-[16px] min-h-[16px] max-w-[20px] max-h-[20px] bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full shadow-lg shadow-yellow-300/60 border border-yellow-200/40">
              <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/20"></div>
            </div>
          </div>

          <div className="absolute orbit-outer">
            <div className="w-[2vw] h-[2vw] min-w-[24px] min-h-[24px] max-w-[32px] max-h-[32px] bg-gradient-to-br from-orange-300 to-red-600 rounded-full shadow-lg shadow-orange-400/80 border border-orange-200/50 relative">
              <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/20"></div>
            </div>
          </div>
          <div className="absolute orbit-outer" style={{ animationDelay: "-25s" }}>
            <div className="w-[1.8vw] h-[1.8vw] min-w-[22px] min-h-[22px] max-w-[28px] max-h-[28px] bg-gradient-to-br from-red-400 to-red-700 rounded-full shadow-lg shadow-red-400/70 border border-red-300/40">
              <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/15"></div>
            </div>
          </div>

          <div className="absolute orbit-far">
            <div className="relative">
              <div className="w-[2.5vw] h-[2.5vw] min-w-[30px] min-h-[30px] max-w-[40px] max-h-[40px] bg-gradient-to-br from-yellow-200 to-amber-400 rounded-full shadow-lg shadow-yellow-300/80 border border-yellow-100/50">
                <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/25"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[3.5vw] h-[3.5vw] min-w-[42px] min-h-[42px] max-w-[56px] max-h-[56px] border border-yellow-200/30 rounded-full"></div>
              </div>
            </div>
          </div>

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

        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Loading Content */}
      <div className="relative z-10 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
          className="mb-8"
        >
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-500/30 to-cyan-500/30 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-6 border-2 border-white/40 shadow-lg shadow-purple-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-cyan-400/10 animate-pulse"></div>
            <Gamepad2 className="w-12 h-12 text-white relative z-10 animate-pulse" />
            <Sparkles className="absolute top-2 right-2 w-4 h-4 text-cyan-300 animate-pulse" />
            <Star
              className="absolute bottom-2 left-2 w-3 h-3 text-purple-300 animate-pulse"
              style={{ animationDelay: "1s" }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h1
            className="text-2xl font-bold text-transparent bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text mb-4"
            style={{
              textShadow: "0 0 20px rgba(147, 197, 253, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)",
              fontFamily: "monospace",
              imageRendering: "pixelated",
            }}
          >
            {t('checkingAuth', 'Checking Authentication...')}
          </h1>

          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-cyan-300 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
            <div className="w-2 h-2 bg-pink-300 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

