"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Chrome, Sparkles, Eye, EyeOff, Mail, Lock, Loader2, Rocket } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import { AuthGuard } from "@/components/auth/auth-guard"

function LoginPageContent() {
  const { t } = useLanguage()
  const { signInWithGoogle, signInWithEmail, loading, error, clearError } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Save game code from URL when user lands on login page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const gameCode = urlParams.get('code')

      // Validate game code (6 characters, alphanumeric) - ignore OAuth codes
      if (gameCode && gameCode.length === 6 && /^[A-Z0-9]{6}$/i.test(gameCode)) {
        localStorage.setItem('pending-game-code', gameCode.toUpperCase())
      }
    }
  }, [])

  // Reset signing in state when component mount or user returns to page
  useEffect(() => {
    setIsSigningIn(false)

    // Reset when page visibility changes (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setIsSigningIn(false)
      }
    }

    // Reset when user presses back button
    const handlePopState = () => {
      setIsSigningIn(false)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('popstate', handlePopState)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true)
      clearError()
      await signInWithGoogle()
      // AuthGuard will handle redirect automatically after successful login
    } catch (error) {
      console.error('Sign in error:', error)
    } finally {
      setIsSigningIn(false)
    }
  }


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }))
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.email.trim()) {
      errors.email = t('emailRequired', 'Email is required')
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = t('emailInvalid', 'Please enter a valid email')
    }

    if (!formData.password) {
      errors.password = t('passwordRequired', 'Password is required')
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setIsSigningIn(true)
      clearError()

      await signInWithEmail(formData.email, formData.password)

      // AuthGuard will handle redirect automatically
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden overflow-y-auto">
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


        <div className="absolute inset-0 bg-black/30"></div>
      </div>


      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 py-8 sm:py-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md px-2 sm:px-0"
        >
          {/* Content without card */}
          <div className="relative">
            {/* Logo - Fully Responsive */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
              className="text-center mb-4 sm:mb-6 md:mb-8"
            >
              <div className="w-30 h-24 sm:w-36 sm:h-32 md:w-48 md:h-40 lg:w-80 lg:h-64 xl:w-96 xl:h-80 mx-auto mb-10 sm:mb-2 md:mb-4 lg:mb-4 xl:mb-6 relative">
                <img
                  draggable={false}
                  src="/images/logo/spacequizv2.webp"
                  alt="Space Quiz Logo"
                  className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(112,82,255,0.4)] lg:drop-shadow-[0_0_25px_rgba(112,82,255,0.5)]"
                />
              </div>
            </motion.div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-300 text-sm mb-6 text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Google Sign In Button */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 20 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading || isSigningIn}
                className="w-full bg-[#4285F4] hover:bg-[#3367d6] active:scale-[0.98] text-white font-semibold py-5 sm:py-6 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 border-none relative overflow-hidden mb-5 sm:mb-8 group transition-all duration-300"
              >
                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                <div className="flex items-center justify-center space-x-3 relative z-10">
                  {loading || isSigningIn ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="relative"
                    >
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                      <div className="absolute inset-0 w-5 h-5 border-2 border-transparent border-t-cyan-300 rounded-full animate-pulse" />
                    </motion.div>
                  ) : (
                    <motion.div
                      className="bg-white rounded-full p-1 shadow-md"
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <Chrome className="w-4 h-4 text-[#4285F4]" />
                    </motion.div>
                  )}
                  <span className="text-base font-medium">{t('signInWithGoogle', 'Sign in with Google')}</span>
                </div>

                {/* Decorative stars */}
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute top-3 right-3 w-1.5 h-1.5 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50"
                />
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                  className="absolute bottom-3 left-4 w-1 h-1 bg-cyan-300 rounded-full"
                />
              </Button>
            </motion.div>

            {/* Divider with animation */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="relative mb-5 sm:mb-8"
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-400/40"></div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="relative flex justify-center text-xs sm:text-sm uppercase tracking-widest"
              >
                <span className="px-4 text-gray-300 font-semibold bg-transparent">
                  <Sparkles className="inline w-3 h-3 mr-1 text-yellow-400" />
                  {t('or', 'OR')}
                  <Sparkles className="inline w-3 h-3 ml-1 text-yellow-400" />
                </span>
              </motion.div>
            </motion.div>

            {/* Email/Password Login Form */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onSubmit={handleEmailPasswordLogin}
              className="space-y-4 sm:space-y-5"
            >
              {/* Email */}
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onFocus={(e) => {
                      // Scroll form ke view saat keyboard muncul di mobile
                      setTimeout(() => {
                        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }, 300)
                    }}
                    className="bg-white/90 border-transparent text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 h-11 sm:h-12 rounded-2xl text-sm sm:text-base pl-11 sm:pl-12 pr-4 transition-all"
                    placeholder={t('enterEmail', 'Enter your email')}
                  />
                </div>
                {formErrors.email && (
                  <p className="text-red-400 text-xs ml-1">{formErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    onFocus={(e) => {
                      // Scroll form ke view saat keyboard muncul di mobile
                      setTimeout(() => {
                        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }, 300)
                    }}
                    className="bg-white/90 border-transparent text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 h-11 sm:h-12 rounded-2xl text-sm sm:text-base pl-11 sm:pl-12 pr-11 sm:pr-12 transition-all"
                    placeholder={t('enterPasswordLogin', 'Enter your password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-indigo-600 active:text-indigo-700 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-red-400 text-xs ml-1">{formErrors.password}</p>
                )}

              </div>

              {/* Login Button - Enhanced */}
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="mt-3 sm:mt-4"
              >
                <Button
                  type="submit"
                  disabled={loading || isSigningIn}
                  className="w-full bg-gradient-to-r from-[#7052ff] via-[#9052ff] to-[#00c6ff] hover:from-[#6042ef] hover:via-[#8042ef] hover:to-[#00b6ef] text-white font-bold h-11 sm:h-12 rounded-2xl shadow-lg shadow-indigo-500/40 hover:shadow-indigo-500/60 border-none relative overflow-hidden transition-all duration-300 group"
                >
                  {/* Animated gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                  <div className="relative z-10 flex items-center justify-center gap-2">
                    {loading || isSigningIn ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                          className="relative"
                        >
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </motion.div>
                        <motion.span
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="text-sm sm:text-base"
                        >
                          {t('signingIn', 'Signing in...')}
                        </motion.span>
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                        <span className="text-sm sm:text-base tracking-wide font-semibold">{t('signIn', 'Sign In')}</span>
                      </>
                    )}
                  </div>

                  {/* Decorative elements */}
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute top-2 right-3 w-1.5 h-1.5 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
                    className="absolute bottom-2 left-4 w-1 h-1 bg-cyan-300 rounded-full"
                  />
                </Button>
              </motion.div>
            </motion.form>

            {/* Sign Up Link */}
            <div className="mt-6 sm:mt-8 mb-4 sm:mb-0 text-center">
              <p className="text-gray-500 text-xs sm:text-sm">
                {t('noAccount', "Don't have an account?")}{" "}
                <a href="/auth/register" className="text-[#7052ff] hover:text-[#00c6ff] active:text-[#00b6ef] font-semibold transition-colors">
                  {t('createOne', 'Create one now')}
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <AuthGuard requireAuth={false}>
      <LoginPageContent />
    </AuthGuard>
  )
}
