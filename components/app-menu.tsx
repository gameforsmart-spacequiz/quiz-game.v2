"use client"

import { useLanguage } from '@/contexts/language-context'
import { Maximize, Minimize, Download, Menu } from 'lucide-react'
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
          console.log('User accepted the install prompt')
          setIsInstalled(true)
        } else {
          console.log('User dismissed the install prompt')
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
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            className="w-12 h-12 bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 transition-all duration-300 shadow-lg flex items-center justify-center rounded-lg"
            aria-label="App Menu"
          >
            <Menu className="w-5 h-5 text-cyan-300" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-56 bg-black/40 backdrop-blur-xl border border-cyan-400/30 shadow-2xl rounded-lg"
          align="end"
        >
          <DropdownMenuLabel className="text-cyan-300 font-mono text-xs">
            {t('settings', 'Settings')}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-cyan-400/20" />

          {/* Language Selector - Toggle to show languages */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              setIsLanguageSubmenuOpen(!isLanguageSubmenuOpen)
            }}
            className="text-white hover:bg-cyan-500/20 cursor-pointer focus:bg-cyan-500/20 rounded-md focus:text-white"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <FlagDisplay 
                  flagImage={currentLanguageData.flagImage} 
                  fallback={currentLanguageData.flagFallback} 
                  className=""
                />
                <span>{t('language', 'Language')}</span>
              </div>
              <span className="ml-auto text-xs">{isLanguageSubmenuOpen ? '▼' : '▶'}</span>
            </div>
          </DropdownMenuItem>
          
          {/* Language Options - Shown when clicked */}
          {isLanguageSubmenuOpen && (
            <>
              {languages.map((language) => (
                <DropdownMenuItem
                  key={language.code}
                  onSelect={(e) => {
                    e.preventDefault()
                    changeLanguage(language.code)
                    setIsLanguageSubmenuOpen(false)
                  }}
                  className={`text-white hover:bg-cyan-500/20 cursor-pointer focus:bg-cyan-500/20 rounded-md focus:text-white pl-8 ${
                    currentLanguage === language.code ? 'bg-cyan-500/30' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FlagDisplay 
                      flagImage={language.flagImage} 
                      fallback={language.flagFallback} 
                      className=""
                    />
                    <div className="flex flex-col">
                      <span className="text-white font-medium text-sm">{language.nativeName}</span>
                      <span className="text-white/70 text-xs">{language.name}</span>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator className="bg-cyan-400/20" />

          {/* Fullscreen Toggle */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              toggleFullscreen()
            }}
            className="text-white hover:bg-cyan-500/20 cursor-pointer focus:bg-cyan-500/20 rounded-md focus:text-white"
          >
            {isFullscreen ? (
              <>
                <Minimize className="mr-2 h-4 w-4 text-cyan-300" />
                <span>{t('exitFullscreen', 'Exit Fullscreen')}</span>
              </>
            ) : (
              <>
                <Maximize className="mr-2 h-4 w-4 text-cyan-300" />
                <span>{t('enterFullscreen', 'Enter Fullscreen')}</span>
              </>
            )}
          </DropdownMenuItem>

          {/* Install App - Only show if can install and not installed */}
          {!isInstalled && (canInstall || isDevelopment) && (
            <>
              <DropdownMenuSeparator className="bg-cyan-400/20" />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  handleInstallClick()
                }}
                disabled={!deferredPrompt && !canInstall}
                className="text-white hover:bg-cyan-500/20 cursor-pointer focus:bg-cyan-500/20 rounded-md focus:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="mr-2 h-4 w-4 text-cyan-300" />
                <span>{t('installApp', 'Install App')}</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

