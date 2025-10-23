import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { CROSS_DOMAIN_CONFIG } from '@/lib/cross-domain-auth'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = requestUrl.searchParams.get('redirect_to') || '/'

  console.log('🔍 Callback received:', {
    code: code ? 'present' : 'missing',
    redirectTo,
    fullUrl: requestUrl.toString(),
    hostname: requestUrl.hostname
  })

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Determine the correct redirect URL based on environment
  const isProduction = requestUrl.hostname === 'spacequiz.gameforsmart.com'
  const isLocalhost = requestUrl.hostname === 'localhost'
  const isVercel = requestUrl.hostname.includes('vercel.app')
  const isCoolify = requestUrl.hostname.includes('coolify.io') || requestUrl.hostname.includes('coolify.app')
  
  let quizHomepage: string
  
  if (isProduction) {
    quizHomepage = `${requestUrl.origin}/`
  } else if (isLocalhost) {
    quizHomepage = `${requestUrl.origin}/`
  } else if (isVercel) {
    quizHomepage = `${requestUrl.origin}/`
  } else if (isCoolify) {
    quizHomepage = `${requestUrl.origin}/`
  } else {
    // Fallback for other environments
    quizHomepage = `${requestUrl.origin}/`
  }
  
  console.log('🚀 Redirecting to quiz homepage:', quizHomepage)
  console.log('🚀 Is production:', isProduction)
  console.log('🚀 Is localhost:', isLocalhost)
  console.log('🚀 Is Vercel:', isVercel)
  console.log('🚀 Is Coolify:', isCoolify)
  console.log('🚀 Hostname:', requestUrl.hostname)
  
  return NextResponse.redirect(quizHomepage)
}

