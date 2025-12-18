"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { LogOut, ChevronDown } from "lucide-react"
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
  const [isOpen, setIsOpen] = useState(false)

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

      // Test if the avatar URL is valid
      if (avatarUrl) {

        const testImg = document.createElement('img')
        testImg.crossOrigin = 'anonymous'
        testImg.referrerPolicy = 'no-referrer'
        testImg.onload = () => {

        }
        testImg.onerror = () => {
          console.error('❌ UserProfile proxy test image failed to load')
        }
        testImg.src = avatarUrl
      }

      // Also test raw URL for comparison
      if (rawAvatarUrl) {

        const rawTestImg = document.createElement('img')
        rawTestImg.crossOrigin = 'anonymous'
        rawTestImg.referrerPolicy = 'no-referrer'
        rawTestImg.onload = () => {

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
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <div className="relative flex items-center gap-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full pl-1.5 pr-4 py-1.5 hover:bg-white/15 hover:border-white/30 transition-all duration-300 cursor-pointer shadow-xl">
            {/* Avatar with Ring */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 p-[2px]">
                <div className="w-full h-full rounded-full bg-gray-900"></div>
              </div>
              <Avatar className="h-10 w-10 relative z-10 ring-2 ring-cyan-400/50">
                {avatarUrl && !avatarLoadError ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={40}
                    height={40}
                    className="object-cover rounded-full"
                    unoptimized
                    onError={() => {
                      console.error('❌ UserProfile avatar failed to load:', avatarUrl)
                      setAvatarLoadError(true)
                    }}
                    onLoad={() => {

                    }}
                  />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-purple-500 text-white text-sm font-bold">
                    {getInitials(displayName)}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>

            {/* Username */}
            <span className="text-white font-medium text-sm">
              {displayName}
            </span>

            {/* Chevron with rotation animation */}
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
            />

            {/* Loading overlay */}
            {(loading || isSigningOut) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                <div className="w-4 h-4 border-2 border-cyan-400/50 border-t-cyan-400 rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-44 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-xl mt-2"
          align="start"
        >
          <DropdownMenuItem
            onClick={handleLogoutClick}
            disabled={loading || isSigningOut}
            className="text-red-400 hover:bg-red-500/20 cursor-pointer font-medium focus:bg-red-500/20 rounded-lg mx-1 my-1"
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
