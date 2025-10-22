/**
 * Cross-domain authentication utilities
 * Handles authentication between main domain and quiz subdomain
 */

export const CROSS_DOMAIN_CONFIG = {
  MAIN_DOMAIN: 'https://www.gameforsmart.com',
  QUIZ_DOMAIN: 'https://spacequiz.gameforsmart.com',
  LOCALHOST: 'http://localhost:3000',
  VERCEL: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://your-app-name.vercel.app'
} as const

/**
 * Check if current domain is production quiz domain
 */
export function isQuizProduction(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hostname === 'spacequiz.gameforsmart.com'
}

/**
 * Check if current domain is main production domain
 */
export function isMainProduction(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hostname === 'www.gameforsmart.com'
}

/**
 * Check if current domain is localhost
 */
export function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hostname === 'localhost'
}

/**
 * Check if current domain is Vercel
 */
export function isVercel(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hostname.includes('vercel.app')
}

/**
 * Check if current domain is Coolify
 */
export function isCoolify(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hostname.includes('coolify.io') || 
         window.location.hostname.includes('coolify.app')
}

/**
 * Get the correct redirect URL for OAuth based on current environment
 */
export function getOAuthRedirectUrl(): string {
  if (typeof window === 'undefined') return '/auth/callback'
  
  if (isQuizProduction()) {
    return `${CROSS_DOMAIN_CONFIG.QUIZ_DOMAIN}/auth/callback`
  }
  
  if (isVercel()) {
    return `${window.location.origin}/auth/callback`
  }
  
  if (isCoolify()) {
    return `${window.location.origin}/auth/callback`
  }
  
  // For localhost, use the current origin
  return `${window.location.origin}/auth/callback`
}

/**
 * Get the correct homepage URL based on current environment
 */
export function getHomepageUrl(): string {
  if (typeof window === 'undefined') return '/'
  
  if (isQuizProduction()) {
    return CROSS_DOMAIN_CONFIG.QUIZ_DOMAIN
  }
  
  if (isVercel()) {
    return window.location.origin
  }
  
  if (isCoolify()) {
    return window.location.origin
  }
  
  return window.location.origin
}

/**
 * Create a redirect URL from main domain to quiz domain with auth context
 */
export function createQuizRedirectUrl(fromMainDomain: boolean = false): string {
  const baseUrl = isLocalhost() 
    ? CROSS_DOMAIN_CONFIG.LOCALHOST 
    : CROSS_DOMAIN_CONFIG.QUIZ_DOMAIN
  
  if (fromMainDomain) {
    return `${baseUrl}?from=main`
  }
  
  return baseUrl
}

/**
 * Check if user is coming from main domain based on URL parameters
 */
export function isFromMainDomain(): boolean {
  if (typeof window === 'undefined') return false
  
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('from') === 'main'
}

/**
 * Log authentication context for debugging
 */
export function logAuthContext(): void {
  if (typeof window === 'undefined') return
  
  console.log('🔍 Cross-domain auth context:', {
    hostname: window.location.hostname,
    isQuizProduction: isQuizProduction(),
    isMainProduction: isMainProduction(),
    isLocalhost: isLocalhost(),
    isVercel: isVercel(),
    isCoolify: isCoolify(),
    isFromMainDomain: isFromMainDomain(),
    oauthRedirectUrl: getOAuthRedirectUrl(),
    homepageUrl: getHomepageUrl(),
    currentUrl: window.location.href
  })
}
