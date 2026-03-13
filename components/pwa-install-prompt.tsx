"use client"

import { useState, useEffect, useRef } from 'react'
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
  const [hasDialogOpen, setHasDialogOpen] = useState(false)
  const promptTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check if any dialog is open and hide prompt if dialog opens
  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkForDialogs = () => {
      // Check for dialog elements (Radix UI Dialog uses [role="dialog"])
      const dialogs = document.querySelectorAll('[role="dialog"]')
      const hasOpenDialog = dialogs.length > 0 && Array.from(dialogs).some(dialog => {
        const element = dialog as HTMLElement
        // Check if dialog is visible (not hidden)
        const isVisible = element.offsetParent !== null ||
          (element.style.display !== 'none' &&
            !element.hasAttribute('aria-hidden'))
        return isVisible
      })

      const wasDialogOpen = hasDialogOpen
      setHasDialogOpen(hasOpenDialog)

      // If dialog just opened, hide the prompt immediately
      if (hasOpenDialog && !wasDialogOpen && showPrompt) {
        setShowPrompt(false)
      }
    }

    // Check initially
    checkForDialogs()

    // Use MutationObserver to watch for dialog changes
    const observer = new MutationObserver(checkForDialogs)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'aria-hidden', 'data-state']
    })

    // Also check on any click (user interaction might open dialogs)
    const handleClick = () => {
      setTimeout(checkForDialogs, 100)
    }
    window.addEventListener('click', handleClick)

    return () => {
      observer.disconnect()
      window.removeEventListener('click', handleClick)
    }
  }, [hasDialogOpen, showPrompt])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isDev = window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.port !== ''
    setIsDevelopment(isDev)

    // Unregister service worker in development to prevent caching issues
    if (isDev && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) {
          console.log('Unregistering Service Worker in development:', registration.scope)
          registration.unregister()
        }
      })
    }

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if prompt was dismissed in this session
    const wasDismissed = sessionStorage.getItem('pwa-prompt-dismissed') === 'true'
    if (wasDismissed) {
      return
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Add a delay before showing prompt to avoid interfering with user actions
      // Only show on homepage
      if (pathname === '/') {
        // Clear any existing timeout
        if (promptTimeoutRef.current) {
          clearTimeout(promptTimeoutRef.current)
        }

        promptTimeoutRef.current = setTimeout(() => {
          // Double check conditions before showing
          const currentPath = window.location.pathname
          const dialogs = document.querySelectorAll('[role="dialog"]')
          const hasOpenDialog = dialogs.length > 0 && Array.from(dialogs).some(dialog => {
            const element = dialog as HTMLElement
            return element.offsetParent !== null ||
              (element.style.display !== 'none' &&
                !element.hasAttribute('aria-hidden'))
          })

          if (currentPath === '/' && !hasOpenDialog) {
            setShowPrompt(true)
          }
        }, 2000) // 2 second delay
      }
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
      // Clear timeout on cleanup
      if (promptTimeoutRef.current) {
        clearTimeout(promptTimeoutRef.current)
      }
    }
  }, [pathname])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {

          setIsInstalled(true)
          setShowPrompt(false)
        } else {

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
    // Store in sessionStorage so it won't appear again until new tab or refresh
    sessionStorage.setItem('pwa-prompt-dismissed', 'true')
  }

  // Don't show if already installed, no prompt available, on login page, not on homepage, or if dialog is open
  const isLoginPage = pathname?.startsWith('/auth/login')
  const isHomePage = pathname === '/'
  if (isInstalled || !showPrompt || !deferredPrompt || isLoginPage || !isHomePage || hasDialogOpen) {
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
          {/* Outer glow ring */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur-sm opacity-50"></div>

          {/* Main container - Dark Galaxy Theme */}
          <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl p-4 overflow-hidden">

            {/* Nebula gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-cyan-600/10"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-pink-600/5 via-transparent to-blue-600/5"></div>

            {/* Animated floating stars */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full"
                  style={{
                    left: `${10 + (i * 12)}%`,
                    top: `${15 + (i * 10) % 70}%`,
                  }}
                  animate={{
                    opacity: [0.2, 0.8, 0.2],
                    scale: [0.8, 1.2, 0.8],
                  }}
                  transition={{
                    duration: 2 + (i * 0.3),
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>

            {/* Shooting star animation */}
            <motion.div
              className="absolute w-10 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"
              initial={{ x: -50, y: 10, opacity: 0 }}
              animate={{
                x: [null, 350],
                y: [null, 60],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 5,
                ease: "easeOut"
              }}
            />

            {/* Close button */}
            <motion.button
              onClick={handleDismiss}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all duration-200 z-20"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>

            <div className="relative z-10">
              {/* Icon and Title */}
              <div className="flex items-start space-x-3 mb-4">
                {/* Animated Rocket Icon */}
                <motion.div
                  className="flex-shrink-0 relative"
                  animate={{
                    y: [0, -5, 0],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  {/* Rocket glow */}
                  <div className="absolute -inset-1 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-500 rounded-xl blur-sm opacity-70"></div>
                  <div className="relative w-10 h-10 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg border border-white/20">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  {/* Rocket flame effect */}
                  <motion.div
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-gradient-to-b from-orange-400 to-transparent rounded-full blur-sm"
                    animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                </motion.div>

                <div className="flex-1 min-w-0 pt-0.5">
                  <h3 className="text-white font-bold text-sm  leading-tight drop-shadow-lg">
                    {t('installSpaceQuiz', 'Install Space-Quiz now!')}
                  </h3>

                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleInstallClick}
                    className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 text-white font-semibold text-xs h-9 shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 rounded-xl border-0"
                  >
                    <Download className="w-3.5 h-3.5 mr-2" />
                    {t('install', 'Install')}
                  </Button>
                </motion.div>
                <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleDismiss}
                    variant="outline"
                    className="w-full border-indigo-400/30 bg-indigo-950/50 text-indigo-200 hover:bg-indigo-900/50 hover:text-white hover:border-indigo-400/50 text-xs h-9 rounded-xl transition-all duration-300"
                  >
                    {t('later', 'Later')}
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

