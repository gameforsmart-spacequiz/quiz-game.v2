"use client"

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/language-context'
import { motion, AnimatePresence } from 'framer-motion'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const { t } = useLanguage()
  const pathname = usePathname()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isDevelopment, setIsDevelopment] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isDev = window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1' ||
                  window.location.port !== ''
    setIsDevelopment(isDev)

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if app was just installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
          console.log('User accepted the install prompt')
          setIsInstalled(true)
          setShowPrompt(false)
        } else {
          console.log('User dismissed the install prompt')
          handleDismiss()
        }

        setDeferredPrompt(null)
      } catch (error) {
        console.error('Error showing install prompt:', error)
        setDeferredPrompt(null)
      }
    } else {
      if (isDevelopment) {
        alert('PWA install hanya tersedia di production build.')
      }
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Just close the prompt, it can appear again if browser triggers beforeinstallprompt
  }

  // Don't show if already installed, no prompt available, on login page, or not on homepage
  const isLoginPage = pathname?.startsWith('/auth/login')
  const isHomePage = pathname === '/'
  if (isInstalled || !showPrompt || !deferredPrompt || isLoginPage || !isHomePage) {
    return null
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ x: 100, opacity: 0, scale: 0.9 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 100, opacity: 0, scale: 0.9 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 25,
            opacity: { duration: 0.2 },
            scale: { duration: 0.2 }
          }}
          className="fixed bottom-4 right-4 z-[100] w-80 max-w-[calc(100vw-2rem)]"
        >
          <div className="bg-black/80 backdrop-blur-xl border-2 border-cyan-400/50 rounded-lg shadow-2xl p-3 relative overflow-hidden">
            {/* Background glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
            
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-1.5 right-1.5 text-white/70 hover:text-white transition-colors z-10"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="relative z-10">
              {/* Icon and Title */}
              <div className="flex items-start space-x-2.5 mb-2.5">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
                  <Download className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-sm mb-0.5 leading-tight">
                    {t('installSpaceQuiz', 'Install Space-Quiz now!')}
                  </h3>
                  <p className="text-white/70 text-xs leading-tight">
                    {t('installDescription', 'Get faster access and better experience')}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={handleInstallClick}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold text-xs h-8 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  {t('install', 'Install')}
                </Button>
                <Button
                  onClick={handleDismiss}
                  variant="outline"
                  className="flex-1 border-cyan-400/50 bg-transparent text-cyan-300/90 hover:bg-cyan-500/20 hover:text-cyan-200 hover:border-cyan-400/70 text-xs h-8"
                >
                  {t('later', 'Later')}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

