"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, type TranslationKey } from '@/lib/locales/translations'

interface LanguageContextType {
  currentLanguage: string
  changeLanguage: (language: string) => void
  t: (key: TranslationKey, fallback?: string) => string
  isClient: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState('en')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    // Get language from localStorage or default to 'en'
    const savedLanguage = localStorage.getItem('i18nextLng') || 'en'
    if (translations[savedLanguage]) {
      setCurrentLanguage(savedLanguage)
      // Set direction immediately on mount
      document.documentElement.lang = savedLanguage
      document.documentElement.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr'
    }
  }, [])

  useEffect(() => {
    if (isClient) {
      document.documentElement.lang = currentLanguage
      document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr'
    }
  }, [currentLanguage, isClient])

  const changeLanguage = (language: string) => {
    if (translations[language]) {
      setCurrentLanguage(language)
      localStorage.setItem('i18nextLng', language)
    }
  }

  const t = (key: TranslationKey, fallback?: string) => {
    const translation = translations[currentLanguage]?.[key]
    return translation || fallback || key
  }

  const value: LanguageContextType = {
    currentLanguage,
    changeLanguage,
    t,
    isClient
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function

  useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
