"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Chrome, Sparkles, Star, Gamepad2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const { t } = useLanguage()
  const { loading } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Reset redirecting state ketika modal dibuka atau user kembali ke tab
  useEffect(() => {
    if (open) {
      setIsRedirecting(false)
      setIsSigningIn(false)
    }
    
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
  }, [open])

  const handleClose = () => {
    setIsRedirecting(false)
    setIsSigningIn(false)
    onOpenChange(false)
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsRedirecting(true)
      setIsSigningIn(true)
      
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
      // Modal will close automatically when auth state changes
    } catch (error) {
      console.error('Sign in error:', error)
      setIsRedirecting(false)
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10 text-white hover:text-cyan-300"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">{t('close', 'Close')}</span>
          </button>

          <DialogHeader className="mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
              className="mb-4 flex justify-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/30 to-cyan-500/30 backdrop-blur-xl rounded-2xl flex items-center justify-center border-2 border-white/40 shadow-lg shadow-purple-500/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-cyan-400/10 animate-pulse"></div>
                <Gamepad2 className="w-8 h-8 text-white relative z-10" />
                <Sparkles className="absolute top-1 right-1 w-3 h-3 text-cyan-300 animate-pulse" />
                <Star className="absolute bottom-1 left-1 w-2 h-2 text-purple-300 animate-pulse" style={{ animationDelay: "1s" }} />
              </div>
            </motion.div>
            
            <DialogTitle 
              className="text-2xl font-bold text-center text-transparent bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text"
              style={{
                textShadow: "0 0 20px rgba(147, 197, 253, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)",
                fontFamily: "monospace",
                imageRendering: "pixelated",
              }}
            >
              {t('welcome', 'Welcome to Space Quiz')}
            </DialogTitle>
            <p className="text-center text-cyan-100 text-sm mt-2 font-mono">
              {t('loginSubtitle', 'Sign in to save your progress and play with friends')}
            </p>
          </DialogHeader>

          <div className="space-y-4">

            {/* Google Sign In Button */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading || isSigningIn}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/30 border border-blue-400/30 backdrop-blur-sm font-mono relative overflow-hidden"
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

            {/* Benefits list */}
            <div className="space-y-2 mt-6">
              <div className="flex items-center space-x-2 text-cyan-100 text-sm font-mono">
                <Star className="w-4 h-4 text-yellow-300" />
                <span>{t('benefit1', 'Save your game progress')}</span>
              </div>
              <div className="flex items-center space-x-2 text-cyan-100 text-sm font-mono">
                <Star className="w-4 h-4 text-yellow-300" />
                <span>{t('benefit2', 'Play with friends easily')}</span>
              </div>
              <div className="flex items-center space-x-2 text-cyan-100 text-sm font-mono">
                <Star className="w-4 h-4 text-yellow-300" />
                <span>{t('benefit3', 'Access your profile anywhere')}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Redirecting Overlay */}
      {isRedirecting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
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
    </Dialog>
  )
}

