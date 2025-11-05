"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Chrome, Sparkles, Star, Gamepad2, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import { AuthGuard } from "@/components/auth/auth-guard"

function LoginPageContent() {
  const { t } = useLanguage()
  const { signInWithGoogle, signInWithEmail, loading, error, clearError } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Reset redirecting state ketika komponen mount atau user kembali ke halaman
  useEffect(() => {
    setIsRedirecting(false)
    setIsSigningIn(false)
    
    // Reset juga ketika page visibility berubah (user kembali ke tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setIsRedirecting(false)
        setIsSigningIn(false)
      }
    }
    
    // Reset ketika user tekan tombol back browser
    const handlePopState = () => {
      setIsRedirecting(false)
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
      setIsRedirecting(true)
      setIsSigningIn(true)
      clearError()
      
      // Double requestAnimationFrame untuk memastikan overlay ter-render sebelum redirect
      // RAF pertama: React commit state ke DOM
      // RAF kedua: Browser paint frame
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Extra timeout kecil untuk memastikan overlay sudah di-paint
            setTimeout(resolve, 50)
          })
        })
      })
      
      await signInWithGoogle()
      // AuthGuard will handle redirect automatically
    } catch (error) {
      console.error('Sign in error:', error)
      setIsRedirecting(false)
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
    <div className="min-h-screen relative overflow-hidden">
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


      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md"
        >
          {/* Glass morphism card */}
          <div className="bg-black/20 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
            {/* Logo and Title */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
              className="text-center mb-8"
            >
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500/30 to-cyan-500/30 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-4 border-2 border-white/40 shadow-lg shadow-purple-500/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-cyan-400/10 animate-pulse"></div>
                <Gamepad2 className="w-10 h-10 text-white relative z-10" />
                <Sparkles className="absolute top-2 right-2 w-4 h-4 text-cyan-300 animate-pulse" />
                <Star
                  className="absolute bottom-2 left-2 w-3 h-3 text-purple-300 animate-pulse"
                  style={{ animationDelay: "1s" }}
                />
              </div>
              
              <h1
                className="text-3xl font-bold text-transparent bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text mb-2"
                style={{
                  textShadow: "0 0 20px rgba(147, 197, 253, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)",
                  fontFamily: "monospace",
                  imageRendering: "pixelated",
                }}
              >
                {t('welcomeBack', 'Welcome Back')}
              </h1>
              <p className="text-cyan-100 text-sm font-mono">
                {t('loginSubtitle', 'Sign in to continue your space adventure')}
              </p>
            </motion.div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/20 border border-red-400/30 rounded-lg p-3 text-red-200 text-sm font-mono mb-6"
              >
                {error}
              </motion.div>
            )}

            {/* Google Sign In Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading || isSigningIn}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/30 border border-blue-400/30 backdrop-blur-sm font-mono relative overflow-hidden mb-6"
                style={{ imageRendering: "pixelated" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-blue-500/20 animate-pulse"></div>
                <div className="flex items-center justify-center space-x-3 relative z-10">
                  {loading || isSigningIn ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{t('signingIn', 'Signing in...')}</span>
                    </>
                  ) : (
                    <>
                      <Chrome className="w-5 h-5" />
                      <span>{t('signInWithGoogle', 'Sign in with Google')}</span>
                    </>
                  )}
                </div>
                <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
              </Button>
            </motion.div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-cyan-100 font-mono">{t('or', 'or')}</span>
              </div>
            </div>

            {/* Email/Password Login Form */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onSubmit={handleEmailPasswordLogin}
              className="space-y-4"
            >
              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-cyan-100 font-mono text-sm mb-2 block">
                  {t('email', 'Email')}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="bg-black/20 border-white/20 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 font-mono"
                  placeholder={t('enterEmail', 'Enter your email')}
                />
                {formErrors.email && (
                  <p className="text-red-400 text-xs font-mono mt-1">{formErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password" className="text-cyan-100 font-mono text-sm mb-2 block">
                  {t('password', 'Password')}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="bg-black/20 border-white/20 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 font-mono pr-10"
                    placeholder={t('enterPasswordLogin', 'Enter your password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-red-400 text-xs font-mono mt-1">{formErrors.password}</p>
                )}
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={loading || isSigningIn}
                className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-white font-semibold py-3 rounded-xl shadow-lg shadow-purple-500/30 border border-purple-400/30 backdrop-blur-sm font-mono relative overflow-hidden mt-6"
                style={{ imageRendering: "pixelated" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-cyan-400/20 animate-pulse"></div>
                <div className="relative z-10 flex items-center justify-center space-x-2">
                  {loading || isSigningIn ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{t('signingIn', 'Signing in...')}</span>
                    </>
                  ) : (
                    <span>{t('signIn', 'Sign In')}</span>
                  )}
                </div>
                <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
              </Button>
            </motion.form>

          </div>
        </motion.div>
      </div>

      {/* Redirecting Overlay */}
      {isRedirecting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
        >
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 mx-auto mb-4 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full"
            />
            <h2 className="text-2xl font-bold text-cyan-300 font-mono">
              {t('redirecting')}
            </h2>
          </div>
        </motion.div>
      )}
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
