"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import { motion } from "framer-motion"
import { Gamepad2, Sparkles, Star, Rocket } from "lucide-react"

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
            <Rocket className="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-lg" />
          </motion.div>
        </div>

        {/* Text */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent mb-3"
        >
          {t('checkingAuth', 'Launching...')}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-gray-400 text-sm sm:text-base mb-6"
        >
          Preparing your space adventure...
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
}

