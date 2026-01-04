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
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl pl-2 pr-4 py-2 hover:bg-white/10 hover:border-white/40 transition-all duration-300 cursor-pointer shadow-xl group"
          >
            {/* Subtle glow effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Avatar with Gradient Ring */}
            <div className="relative z-10">
              <div className="absolute -inset-1 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 rounded-full opacity-60 blur-sm"></div>
              <Avatar className="h-10 w-10 relative ring-2 ring-white/30">
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
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 text-white text-sm font-bold">
                    {getInitials(displayName)}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>

            {/* Username */}
            <span className="text-white font-medium text-sm relative z-10 drop-shadow-lg">
              {displayName}
            </span>

            {/* Chevron with rotation animation */}
            <ChevronDown
              className={`w-4 h-4 text-white/70 transition-transform duration-300 relative z-10 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
            />

            {/* Loading overlay */}
            {(loading || isSigningOut) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl z-20">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
            )}
          </motion.div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-48 bg-white/5 backdrop-blur-xl border border-white/20 shadow-2xl rounded-xl mt-2 p-1"
          align="start"
        >
          <DropdownMenuItem
            onClick={handleLogoutClick}
            disabled={loading || isSigningOut}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer font-medium focus:bg-red-500/10 focus:text-red-300 rounded-lg py-2.5 px-3 transition-all duration-200"
          >
            <LogOut className="mr-2.5 h-4 w-4" />
            <span>
              {isSigningOut ? t('signingOut', 'Logging out...') : t('logout', 'Logout')}
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
