"use client"

import { useEffect } from 'react'
import { createQuizRedirectUrl } from '@/lib/cross-domain-auth'

/**
 * Component to handle redirect from main domain to quiz domain
 * This should be used on the main website to redirect users to the quiz
 */
export function CrossDomainRedirect() {
  useEffect(() => {
    // Redirect to quiz domain with auth context
    const quizUrl = createQuizRedirectUrl(true)

    window.location.href = quizUrl
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
        <p className="text-white font-mono">Redirecting to Space Quiz...</p>
      </div>
    </div>
  )
}

/**
 * Utility function to create a redirect link to quiz domain
 * This can be used in the main website's navigation or buttons
 */
export function createQuizLink(): string {
  return createQuizRedirectUrl(true)
}

/**
 * Utility function to check if user should be redirected
 * This can be used to conditionally show redirect component
 */
export function shouldRedirectToQuiz(): boolean {
  if (typeof window === 'undefined') return false

  // Check if user is on main domain and wants to access quiz
  const isMainDomain = window.location.hostname === 'www.gameforsmart.com'
  const wantsQuiz = window.location.pathname.includes('quiz') ||
    window.location.search.includes('quiz') ||
    window.location.hash.includes('quiz')

  return isMainDomain && wantsQuiz
}

