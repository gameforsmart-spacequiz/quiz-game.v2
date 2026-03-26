"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { createSupabaseClient } from '@/lib/supabase'
import { useLanguage } from './language-context'
import { getOAuthRedirectUrl, getHomepageUrl, logAuthContext, isFromMainDomain, isQuizProduction } from '@/lib/cross-domain-auth'

interface Profile {
  id: string
  username: string
  email: string
  fullname?: string
  nickname?: string
  avatar_url?: string
  language?: string
  role?: string
  auth_user_id: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  error: string | null
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { t } = useLanguage()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createSupabaseClient()

  // Clear error function
  const clearError = () => setError(null)

  // Create or update profile
  const createOrUpdateProfile = async (user: User) => {
    try {
      const profileData = {
        auth_user_id: user.id,
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
        email: user.email || '',
        fullname: user.user_metadata?.full_name || user.user_metadata?.name || '',
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
        language: 'id', // Default language
        role: 'student', // Default role
        updated_at: new Date().toISOString()
      }

      // Check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      if (existingProfile) {
        // Update existing profile
        const { data, error: updateError } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('auth_user_id', user.id)
          .select()
          .single()

        if (updateError) throw updateError
        setProfile(data)
      } else {
        // Create new profile
        const { data, error: insertError } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single()

        if (insertError) throw insertError
        setProfile(data)
      }
    } catch (error) {
      console.error('Error creating/updating profile:', error)
      setError(t('profileError', 'Failed to create user profile. Please try again.'))
    }
  }

  // Fetch profile data
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile not found, will be created by createOrUpdateProfile
          return null
        }
        throw error
      }

      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  // Refresh profile data
  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id)
      setProfile(profileData)
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get the correct redirect URL using utility
      const redirectUrl = getOAuthRedirectUrl()

      // Log authentication context for debugging
      logAuthContext()

      // Additional logging for localhost debugging
      if (window.location.hostname === 'localhost') {
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Google sign in error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(t('signInError', `Failed to sign in: ${errorMessage}`))
    } finally {
      setLoading(false)
    }
  }


  // Sign in with email and password
  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        throw error
      }

      if (data.user) {
        // Profile will be created/updated automatically via auth state change listener
        // Loading state will be handled by onAuthStateChange listener


        // Immediate redirect attempt
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.location.pathname.includes('/auth/login')) {

            const homepageUrl = getHomepageUrl()
            window.location.href = homepageUrl
          }
        }, 500) // Immediate redirect after 500ms

        // Fallback redirect if onAuthStateChange doesn't trigger
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.location.pathname.includes('/auth/login')) {

            const homepageUrl = getHomepageUrl()
            window.location.href = homepageUrl
          }
        }, 2000) // 2 second fallback
      }
    } catch (error) {
      console.error('Email sign in error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(t('signInError', `Failed to sign in: ${errorMessage}`))
      setLoading(false) // Only set loading false on error
    }
    // Don't set loading false here - let onAuthStateChange handle it
  }

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null)
      setProfile(null)
      setSession(null)
    } catch (error) {
      console.error('Sign out error:', error)
      setError(t('signOutError', 'Failed to sign out. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        setLoading(true)

        // Log authentication context for debugging
        logAuthContext()

        // Check if user is coming from main domain (cross-domain auth)
        const fromMainDomain = isFromMainDomain()

        // Get initial session
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          return
        }

        if (initialSession?.user && mounted) {
          setSession(initialSession)
          setUser(initialSession.user)

          try {
            // Fetch or create profile
            const profileData = await fetchProfile(initialSession.user.id)
            if (profileData) {
              setProfile(profileData)
            } else {
              // Create profile if not exists
              await createOrUpdateProfile(initialSession.user)
            }
          } catch (profileError) {
            console.error('Profile handling error:', profileError)
          }
        } else if (isQuizProduction() && !initialSession?.user) {
          // If in production and no session, check if user might be logged in on main domain

        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setError(t('authInitError', 'Failed to initialize authentication'))
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted) {

        setLoading(false)

        // Don't auto-redirect from login page to prevent animation restart
        // User should manually navigate or complete login process
      }
    }, 3000) // Reduced to 3 seconds timeout for faster fallback in dev

    initializeAuth()

    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return



        if (event === 'SIGNED_IN' && session?.user) {

          setSession(session)
          setUser(session.user)

          try {
            // Create or update profile
            await createOrUpdateProfile(session.user)
          } catch (error) {
            console.error('Profile creation error:', error)
          } finally {
            // Always set loading to false, even if profile creation fails
            setLoading(false)

            // Redirect to homepage after successful login (both OAuth and manual)
            if (typeof window !== 'undefined') {


              const homepageUrl = getHomepageUrl()
              // Check if there's a pending game code to preserve
              const pendingCode = localStorage.getItem('pending-game-code')
              let finalUrl = homepageUrl

              if (pendingCode) {
                // Add game code to URL so it gets detected by GameCodeHandler
                const url = new URL(homepageUrl)
                url.searchParams.set('code', pendingCode)
                finalUrl = url.toString()

              }

              // Use setTimeout to ensure redirect happens after state updates
              setTimeout(() => {
                window.location.href = finalUrl
              }, 100)
            }
          }
        } else if (event === 'SIGNED_OUT') {

          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {

          setSession(session)
          setUser(session.user)
          setLoading(false)
        } else if (event === 'USER_UPDATED' && session?.user) {

          setSession(session)
          setUser(session.user)
          setLoading(false)
        } else {
          // Handle any other events

          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [t])

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    error,
    signInWithGoogle,
    signInWithEmail,
    signOut,
    refreshProfile,
    clearError,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

