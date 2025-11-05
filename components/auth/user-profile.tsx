"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Image, { type StaticImageData } from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import { LogoutConfirmationModal } from "./logout-confirmation-modal"

export function UserProfile() {
  const { t } = useLanguage()
  const { user, profile, signOut, loading } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  if (!user || !profile) {
    return null
  }

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await signOut()
      setShowLogoutModal(false)
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setIsSigningOut(false)
    }
  }

  const handleLogoutClick = () => {
    setShowLogoutModal(true)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const displayName = profile.fullname || profile.username || user.email?.split('@')[0] || 'User'
  const rawAvatarUrl = profile.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture
  const [avatarLoadError, setAvatarLoadError] = useState(false)
  
  // Create a proxy URL for Google Photos to bypass CORS
  const avatarUrl = rawAvatarUrl ? `https://images.weserv.nl/?url=${encodeURIComponent(rawAvatarUrl)}&w=64&h=64&fit=cover&output=png` : null

  // Debug logging for avatar URL
  useEffect(() => {
    if (user && profile) {
      console.log('🔍 UserProfile Avatar Debug:', {
        profileAvatarUrl: profile?.avatar_url,
        userAvatarUrl: user?.user_metadata?.avatar_url,
        userPicture: user?.user_metadata?.picture,
        rawAvatarUrl: rawAvatarUrl,
        proxyAvatarUrl: avatarUrl,
        displayName,
        profileUsername: profile?.username,
        profileFullname: profile?.fullname,
        profileEmail: profile?.email
      })
      
      // Test if the avatar URL is valid
      if (avatarUrl) {
        console.log('🧪 Testing UserProfile proxy avatar URL:', avatarUrl)
        const testImg = document.createElement('img')
        testImg.crossOrigin = 'anonymous'
        testImg.referrerPolicy = 'no-referrer'
        testImg.onload = () => {
          console.log('✅ UserProfile proxy test image loaded successfully')
        }
        testImg.onerror = () => {
          console.error('❌ UserProfile proxy test image failed to load')
        }
        testImg.src = avatarUrl
      }
      
      // Also test raw URL for comparison
      if (rawAvatarUrl) {
        console.log('🧪 Testing raw Google avatar URL:', rawAvatarUrl)
        const rawTestImg = document.createElement('img')
        rawTestImg.crossOrigin = 'anonymous'
        rawTestImg.referrerPolicy = 'no-referrer'
        rawTestImg.onload = () => {
          console.log('✅ Raw Google avatar loaded successfully')
        }
        rawTestImg.onerror = () => {
          console.error('❌ Raw Google avatar failed to load (expected due to CORS)')
        }
        rawTestImg.src = rawAvatarUrl
      }
    }
  }, [user, profile, avatarUrl, displayName])

  return (
    <div className="fixed top-4 left-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="relative flex items-center space-x-3 bg-black/30 backdrop-blur-md border border-cyan-400/30 rounded-full px-4 py-2 hover:bg-cyan-500/10 hover:border-cyan-400/50 transition-all duration-300 cursor-pointer shadow-lg">
            <Avatar className="h-8 w-8 ring-2 ring-cyan-400/30">
              {avatarUrl && !avatarLoadError ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={32}
                  height={32}
                  className="object-cover rounded-full"
                  unoptimized
                  onError={() => {
                    console.error('❌ UserProfile avatar failed to load:', avatarUrl)
                    setAvatarLoadError(true)
                  }}
                  onLoad={() => {
                    console.log('✅ UserProfile avatar loaded successfully:', avatarUrl)
                  }}
                />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-purple-500 text-white text-xs font-bold">
                  {getInitials(displayName)}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="text-white font-mono text-sm font-medium">
              {displayName}
            </span>
            {(loading || isSigningOut) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                <div className="w-4 h-4 border-2 border-cyan-400/50 border-t-cyan-400 rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-40 bg-black/40 backdrop-blur-xl border border-cyan-400/30 shadow-2xl rounded-lg"
          align="start"
        >
          <DropdownMenuItem 
            onClick={handleLogoutClick}
            disabled={loading || isSigningOut}
            className="text-red-300 hover:bg-red-500/20 cursor-pointer font-mono focus:bg-red-500/20 rounded-md"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>
              {isSigningOut ? t('signingOut', 'Logging out...') : 'Logout'}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        open={showLogoutModal}
        onConfirm={handleSignOut}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  )
}

