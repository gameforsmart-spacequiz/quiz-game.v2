"use client"

import { useLanguage } from '@/contexts/language-context'
import { Maximize, Minimize, Download } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

// Flag component using actual flag images
function FlagDisplay({ flagImage, fallback, className = "" }: { flagImage: string, fallback: string, className?: string }) {
  const [imageError, setImageError] = useState(false)

  if (imageError) {
    return (
      <span className={`inline-flex items-center justify-center text-xs font-bold bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded border ${className}`}>
        {fallback}
      </span>
    )
  }

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <Image
        src={flagImage}
        alt={`${fallback} flag`}
        width={20}
        height={14}
        className="rounded-sm border border-gray-300 shadow-sm"
        onError={() => setImageError(true)}
        style={{
          objectFit: 'cover',
          minWidth: '20px',
          minHeight: '14px'
        }}
      />
    </div>
  )
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function AppMenu() {
  const { t, changeLanguage, currentLanguage, isClient } = useLanguage()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [isDevelopment, setIsDevelopment] = useState(false)
  const [isLanguageSubmenuOpen, setIsLanguageSubmenuOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const languages = [
    {
      code: 'en',
      name: t('english', 'English'),
      flagImage: '/images/flags/us.svg',
      flagFallback: 'US',
      nativeName: 'English'
    },
    {
      code: 'id',
      name: t('indonesian', 'Indonesian'),
      flagImage: '/images/flags/id.svg',
      flagFallback: 'ID',
      nativeName: 'Bahasa Indonesia'
    },
    {
      code: 'zh',
      name: t('chinese', 'Chinese'),
      flagImage: '/images/flags/cn.svg',
      flagFallback: 'CN',
      nativeName: '中文'
    },
    {
      code: 'ar',
      name: t('arabic', 'Arabic'),
      flagImage: '/images/flags/ar.webp',
      flagFallback: 'AR',
      nativeName: 'العربية'
    },
  ]

  const currentLanguageData = languages.find(lang => lang.code === currentLanguage) || languages[0]

  // Check if fullscreen is active
  useEffect(() => {
    const checkFullscreen = () => {
      const isFullscreenActive = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )
      setIsFullscreen(isFullscreenActive)
    }

    checkFullscreen()

    document.addEventListener('fullscreenchange', checkFullscreen)
    document.addEventListener('webkitfullscreenchange', checkFullscreen)
    document.addEventListener('mozfullscreenchange', checkFullscreen)
    document.addEventListener('MSFullscreenChange', checkFullscreen)

    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen)
      document.removeEventListener('webkitfullscreenchange', checkFullscreen)
      document.removeEventListener('mozfullscreenchange', checkFullscreen)
      document.removeEventListener('MSFullscreenChange', checkFullscreen)
    }
  }, [])

  // PWA Install logic
  useEffect(() => {
    if (typeof window === 'undefined') return

    const isDev = window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.port !== ''
    setIsDevelopment(isDev)

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      setCanInstall(false)
      return
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          setCanInstall(true)
        } else if (isDev) {
          setCanInstall(true)
        }
      }).catch(() => {
        if (isDev) {
          setCanInstall(true)
        }
      })
    } else if (isDev) {
      setCanInstall(true)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setCanInstall(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const toggleFullscreen = () => {
    const isFullscreenActive = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    )

    if (!isFullscreenActive) {
      const docEl = document.documentElement
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen()
      } else if ((docEl as any).webkitRequestFullscreen) {
        (docEl as any).webkitRequestFullscreen()
      } else if ((docEl as any).mozRequestFullScreen) {
        (docEl as any).mozRequestFullScreen()
      } else if ((docEl as any).msRequestFullscreen) {
        (docEl as any).msRequestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen()
      }
    }
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {

          setIsInstalled(true)
        } else {

        }

        setDeferredPrompt(null)
      } catch (error) {
        console.error('Error showing install prompt:', error)
        setDeferredPrompt(null)
      }
    } else {
      if (isDevelopment) {
        alert('PWA install hanya tersedia di production build. Jalankan "npm run build && npm start" untuk test install prompt.')
      }
    }
  }

  // Don't render until client-side
  if (!isClient) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <DropdownMenu modal={false} open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            className="group relative w-11 h-11 bg-white/5 backdrop-blur-md border border-white/20 text-white hover:bg-white/10 hover:border-white/40 transition-all duration-300 shadow-xl flex items-center justify-center rounded-xl overflow-hidden"
            aria-label="App Menu"
          >
            {/* Subtle glow on hover */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Animated Hamburger/X Icon */}
            <div className="relative z-10 w-5 h-4 flex flex-col justify-between items-center">
              <span
                className={`block h-0.5 w-5 bg-white/80 group-hover:bg-white rounded-full transition-all duration-300 ease-out origin-center ${isMenuOpen ? 'rotate-45 translate-y-[7px]' : ''
                  }`}
              />
              <span
                className={`block h-0.5 w-5 bg-white/80 group-hover:bg-white rounded-full transition-all duration-300 ease-out ${isMenuOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
                  }`}
              />
              <span
                className={`block h-0.5 w-5 bg-white/80 group-hover:bg-white rounded-full transition-all duration-300 ease-out origin-center ${isMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''
                  }`}
              />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56 bg-white/5 backdrop-blur-xl border border-white/20 shadow-2xl rounded-xl p-1.5 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
          align="end"
          sideOffset={8}
        >
          <DropdownMenuLabel className="text-white/50 font-medium text-xs uppercase tracking-wider px-2 py-1.5">
            {t('settings', 'Settings')}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/10 my-1" />

          {/* Language Selector - Toggle to show languages */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              setIsLanguageSubmenuOpen(!isLanguageSubmenuOpen)
            }}
            className="text-white hover:bg-white/10 cursor-pointer focus:bg-white/10 rounded-lg focus:text-white py-2.5 px-2 transition-all duration-200 group/item"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <FlagDisplay
                    flagImage={currentLanguageData.flagImage}
                    fallback={currentLanguageData.flagFallback}
                    className=""
                  />
                </div>
                <span className="group-hover/item:text-white transition-colors">{t('language', 'Language')}</span>
              </div>
              <span className={`text-white/50 text-xs transition-transform duration-200 ${isLanguageSubmenuOpen ? 'rotate-90' : ''}`}>▶</span>
            </div>
          </DropdownMenuItem>

          {/* Language Options - Shown when clicked */}
          {isLanguageSubmenuOpen && (
            <div className="ml-2 mt-1 mb-1 border-l-2 border-white/10 pl-2 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
              {languages.map((language) => (
                <DropdownMenuItem
                  key={language.code}
                  onSelect={(e) => {
                    e.preventDefault()
                    changeLanguage(language.code)
                    setIsLanguageSubmenuOpen(false)
                  }}
                  className={`text-white hover:bg-white/10 cursor-pointer focus:bg-white/10 rounded-lg focus:text-white py-2 px-2 transition-all duration-200 ${currentLanguage === language.code ? 'bg-white/10 border-l-2 border-purple-400' : ''
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <FlagDisplay
                      flagImage={language.flagImage}
                      fallback={language.flagFallback}
                      className=""
                    />
                    <div className="flex flex-col">
                      <span className="text-white font-medium text-sm">{language.nativeName}</span>
                      <span className="text-white/50 text-xs">{language.name}</span>
                    </div>
                    {currentLanguage === language.code && (
                      <span className="ml-auto text-purple-400 text-sm">✓</span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}

          <DropdownMenuSeparator className="bg-white/10 my-1" />

          {/* Fullscreen Toggle */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              toggleFullscreen()
            }}
            className="text-white hover:bg-white/10 cursor-pointer focus:bg-white/10 rounded-lg focus:text-white py-2.5 px-2 transition-all duration-200 group/item"
          >
            {isFullscreen ? (
              <>
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center mr-3">
                  <Minimize className="h-4 w-4 text-orange-400" />
                </div>
                <span className="group-hover/item:text-white transition-colors">{t('exitFullscreen', 'Exit Fullscreen')}</span>
              </>
            ) : (
              <>
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mr-3">
                  <Maximize className="h-4 w-4 text-cyan-400" />
                </div>
                <span className="group-hover/item:text-white transition-colors">{t('enterFullscreen', 'Enter Fullscreen')}</span>
              </>
            )}
          </DropdownMenuItem>

          {/* Install App - Only show if can install and not installed */}
          {!isInstalled && (canInstall || isDevelopment) && (
            <>
              <DropdownMenuSeparator className="bg-white/10 my-1" />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  handleInstallClick()
                }}
                disabled={!deferredPrompt && !canInstall}
                className="text-white hover:bg-white/10 cursor-pointer focus:bg-white/10 rounded-lg focus:text-white py-2.5 px-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group/item"
              >
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mr-3">
                  <Download className="h-4 w-4 text-green-400" />
                </div>
                <span className="group-hover/item:text-white transition-colors">{t('installApp', 'Install App')}</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

