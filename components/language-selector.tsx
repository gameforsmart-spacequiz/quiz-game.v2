"use client"

import { useLanguage } from '@/contexts/language-context'
import { Globe, ChevronDown, Maximize, Minimize } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
        width={28}
        height={20}
        className="rounded-sm border border-gray-300 shadow-sm"
        onError={() => setImageError(true)}
        style={{ 
          objectFit: 'cover',
          minWidth: '28px',
          minHeight: '20px'
        }}
      />
    </div>
  )
}

export function LanguageSelector() {
  const { t, changeLanguage, currentLanguage, isClient } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  const handleLanguageChange = (languageCode: string) => {
    changeLanguage(languageCode)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
  }

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

    // Check on mount
    checkFullscreen()

    // Listen for fullscreen changes
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

  const toggleFullscreen = () => {
    const isFullscreenActive = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    )

    if (!isFullscreenActive) {
      // Enter fullscreen
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
      // Exit fullscreen
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

  // Don't render until client-side
  if (!isClient) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <Select value={currentLanguage} onValueChange={handleLanguageChange} onOpenChange={handleOpenChange}>
        <SelectTrigger className="w-[80px] h-10 bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 transition-all duration-300 shadow-lg [&>svg]:hidden">
          <div className="flex items-center space-x-2">
            {/* <Globe className="w-4 h-4 text-cyan-300" /> */}
            <div className="flex items-center justify-center">
              <FlagDisplay 
                flagImage={currentLanguageData.flagImage} 
                fallback={currentLanguageData.flagFallback} 
                className=""
              />
            </div>
            <ChevronDown 
              className={`w-4 h-4 text-cyan-300 transition-transform duration-300 ${
                isOpen ? 'rotate-180' : ''
              }`} 
            />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
          {languages.map((language) => (
            <SelectItem
              key={language.code}
              value={language.code}
              className="hover:bg-gray-600/60 cursor-pointer data-[state=checked]:bg-white/30 data-[state=checked]:text-white text-white transition-colors duration-200"
            >
              <div className="flex items-center space-x-3 py-2">
                <FlagDisplay 
                  flagImage={language.flagImage} 
                  fallback={language.flagFallback} 
                  className=""
                />
                <div className="flex flex-col">
                  <span className="text-white font-medium">{language.nativeName}</span>
                  <span className="text-white/70 text-xs">{language.name}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Fullscreen Button */}
      <Button
        onClick={toggleFullscreen}
        className="w-[80px] h-10 bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 transition-all duration-300 shadow-lg flex items-center justify-center"
        aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      >
        {isFullscreen ? (
          <Minimize className="w-4 h-4 text-cyan-300" />
        ) : (
          <Maximize className="w-4 h-4 text-cyan-300" />
        )}
      </Button>
    </div>
  )
}
