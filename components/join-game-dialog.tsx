"use client"

/* eslint-disable @next/next/no-img-element */
import Image from 'next/image'

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { X, Users, Gamepad2, Sparkles, Star } from "lucide-react"
import { useGameStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"
import { generateXID } from "@/lib/id-generator"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"
// penanda
// penanda
const ANIMAL_AVATARS = [
  "https://api.dicebear.com/9.x/micah/svg?seed=cat",
  "https://api.dicebear.com/9.x/micah/svg?seed=dog",
  "https://api.dicebear.com/9.x/micah/svg?seed=rabbit",
  "https://api.dicebear.com/9.x/micah/svg?seed=elephant",
  "https://api.dicebear.com/9.x/micah/svg?seed=monkey",
  "https://api.dicebear.com/9.x/micah/svg?seed=tiger",
  "https://api.dicebear.com/9.x/micah/svg?seed=panda",
  "https://api.dicebear.com/9.x/micah/svg?seed=koala",
]

const joinGameSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  gameCode: z.string().min(6, "Game code must be 6 characters").max(6, "Game code must be 6 characters"),
})

type JoinGameForm = z.infer<typeof joinGameSchema>

interface JoinGameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialGameCode?: string
}

export function JoinGameDialog({ open, onOpenChange, initialGameCode = "" }: JoinGameDialogProps) {
  const { t } = useLanguage()
  const { user, profile } = useAuth()
  const [selectedAvatar, setSelectedAvatar] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  
  // Get Google avatar URL - prioritize profile data, then user metadata
  const rawGoogleAvatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture
  const googleAvatarUrl = rawGoogleAvatarUrl ? `https://images.weserv.nl/?url=${encodeURIComponent(rawGoogleAvatarUrl)}&w=64&h=64&fit=cover&output=png` : null
  
  // Debug logging for avatar URL
  useEffect(() => {
    if (user && profile) {
      console.log('🔍 JoinGameDialog Avatar Debug:', {
        profileAvatarUrl: profile?.avatar_url,
        userAvatarUrl: user?.user_metadata?.avatar_url,
        userPicture: user?.user_metadata?.picture,
        rawGoogleAvatarUrl: rawGoogleAvatarUrl,
        proxyGoogleAvatarUrl: googleAvatarUrl,
        hasProfile: !!profile,
        hasUser: !!user,
        profileUsername: profile?.username,
        profileFullname: profile?.fullname,
        profileEmail: profile?.email
      })
      
      // Test if the URL is valid
      if (googleAvatarUrl) {
        console.log('🧪 Testing Google avatar URL:', googleAvatarUrl)
        const testImg = document.createElement('img')
        testImg.onload = () => {
          console.log('✅ Test image loaded successfully')
        }
        testImg.onerror = () => {
          console.error('❌ Test image failed to load')
        }
        testImg.src = googleAvatarUrl
      }
    }
  }, [user, profile, googleAvatarUrl])

  // Initialize selectedAvatar when component mounts or profile changes
  useEffect(() => {
    if (googleAvatarUrl && !selectedAvatar) {
      console.log('🎯 Initializing with Google avatar:', googleAvatarUrl)
      
      // Set Google avatar directly - let the Image component handle loading
      console.log('🎯 Setting Google avatar:', googleAvatarUrl)
      setSelectedAvatar(googleAvatarUrl)
      
    } else if (!googleAvatarUrl && !selectedAvatar) {
      console.log('🎯 Initializing with first animal avatar')
      setSelectedAvatar(ANIMAL_AVATARS[0])
    }
  }, [googleAvatarUrl, selectedAvatar])

  const router = useRouter()
  const { setPlayer, setGameCode, setGameId, setQuizId, setIsHost } = useGameStore()

  const form = useForm<JoinGameForm>({
    resolver: zodResolver(joinGameSchema),
    defaultValues: {
      name: profile?.fullname || profile?.username || "",
      gameCode: initialGameCode,
    },
  })

  useEffect(() => {
    if (initialGameCode) {
      form.setValue("gameCode", initialGameCode)
    }
  }, [initialGameCode, form])

  // Update name and avatar when profile changes
  useEffect(() => {
    if (profile) {
      const displayName = profile.fullname || profile.username || ""
      form.setValue("name", displayName)
      
      // Set Google avatar as default if available
      if (googleAvatarUrl) {
        console.log('🎯 Setting Google avatar as default:', googleAvatarUrl)
        setSelectedAvatar(googleAvatarUrl)
      } else {
        console.log('⚠️ No Google avatar URL available, using first animal avatar')
        setSelectedAvatar(ANIMAL_AVATARS[0])
      }
    }
  }, [profile, form, googleAvatarUrl])

  const extractGameCodeFromUrl = (input: string): string => {
    try {
      // Check if input contains a URL
      if (input.includes("http") || input.includes("player?code=")) {
        const url = new URL(input.includes("http") ? input : `https://example.com/${input}`)
        const code = url.searchParams.get("code")
        if (code && code.length === 6) {
          return code.toUpperCase()
        }
      }
      // If not a URL or no valid code found, return the input as is
      return input.toUpperCase()
    } catch {
      // If URL parsing fails, return the input as is
      return input.toUpperCase()
    }
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  const onSubmit = async (data: JoinGameForm) => {
    setIsLoading(true)
    try {
      const { data: game, error: gameError } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("game_pin", data.gameCode.toUpperCase())
        .single()

      if (gameError || !game) {
        form.setError("gameCode", { message: t('error', 'Game not found') })
        return
      }

      // Check if game is finished or ended (host has left)
      if (game.status === "finished") {
        form.setError("gameCode", { message: "Game has ended. Host has left the session." })
        return
      }

      // Check if game is in waiting status
      if (game.status !== "waiting") {
        form.setError("gameCode", { message: t('error', 'Game has already started or ended') })
        return
      }

      // Check if player name already exists in this game
      const existingPlayer = game.participants?.find((p: any) => p.name === data.name)

      if (existingPlayer) {
        form.setError("name", { message: "Nama sudah digunakan oleh player lain. Silakan gunakan nama yang berbeda." })
        setIsLoading(false)
        return
      }

      const playerId = generateXID()
      
      // Add player to participants array
      const newParticipant = {
        id: playerId,
        name: data.name,
        avatar: selectedAvatar,
        score: 0,
        // current_question removed - calculate from responses instead
        joined_at: new Date().toISOString()
      }

      const updatedParticipants = [...(game.participants || []), newParticipant]

      // Update game session with new participant
      await supabase
        .from("game_sessions")
        .update({ participants: updatedParticipants })
        .eq("id", game.id)

      setPlayer(playerId, data.name, selectedAvatar)
      setGameCode(data.gameCode.toUpperCase())
      setGameId(game.id)
      setQuizId(game.quiz_id)
      setIsHost(false)

      // ✅ Simpan ke localStorage sebelum redirect
      localStorage.setItem(
        "player",
        JSON.stringify({
          id: playerId,
          name: data.name,
          avatar: selectedAvatar,
        }),
      )

      router.push(`/wait/${data.gameCode.toUpperCase()}`)
      onOpenChange(false)
    } catch (error) {
      console.error("Error joining game:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 border-0 bg-transparent">
        {/* Space Background */}
        <div className="fixed inset-0 z-0 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('/images/galaxy.webp')",
            }}
          />
          
          {/* Animated space elements */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute orbit-inner">
              <div className="w-2 h-2 bg-gradient-to-br from-orange-400 to-red-500 rounded-full shadow-lg shadow-orange-400/60 border border-orange-300/30">
                <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/20"></div>
              </div>
            </div>
            <div className="absolute orbit-middle">
              <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full shadow-lg shadow-blue-400/70 border border-blue-300/40 relative">
                <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/25"></div>
                <div className="absolute top-1 left-1 w-1 h-1 bg-green-300 rounded-full opacity-60"></div>
              </div>
            </div>
            <div className="absolute orbit-outer">
              <div className="w-4 h-4 bg-gradient-to-br from-purple-300 to-indigo-500 rounded-full shadow-lg shadow-purple-400/60 border border-purple-200/40">
                <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/20"></div>
              </div>
            </div>
          </div>

          {/* Cosmic rings */}
          <div className="absolute inset-0 flex items-center justify-center cosmic-ring-slow">
            <div className="w-80 h-80 border border-purple-300/10 rounded-full"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center" style={{ animation: "cosmic-ring-orbit 120s linear infinite" }}>
            <div className="w-96 h-96 border border-blue-300/8 rounded-full"></div>
          </div>

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        {/* Glass morphism dialog content */}
        <div className="relative z-10 bg-black/20 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10 text-white hover:text-cyan-300"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">{t('close', 'Close')}</span>
          </button>

          <DialogHeader className="mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
              className="mb-4 flex justify-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/30 to-cyan-500/30 backdrop-blur-xl rounded-2xl flex items-center justify-center border-2 border-white/40 shadow-lg shadow-purple-500/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-cyan-400/10 animate-pulse"></div>
                <Users className="w-8 h-8 text-white relative z-10" />
                <Sparkles className="absolute top-1 right-1 w-3 h-3 text-cyan-300 animate-pulse" />
                <Star className="absolute bottom-1 left-1 w-2 h-2 text-purple-300 animate-pulse" style={{ animationDelay: "1s" }} />
              </div>
            </motion.div>
            
            <DialogTitle 
              className="text-2xl font-bold text-center text-transparent bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text"
              style={{
                textShadow: "0 0 20px rgba(147, 197, 253, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)",
                fontFamily: "monospace",
                imageRendering: "pixelated",
              }}
            >
              {initialGameCode ? t('joinGame', 'Join With QR') : t('joinGame', 'Join Game')}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-cyan-100 font-mono">
                      {t('username', 'Username')}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('enterUsername', 'Choose a username')} 
                        {...field} 
                        className="bg-black/30 border-cyan-400/30 text-white placeholder:text-cyan-200/60 backdrop-blur-sm focus:border-cyan-400 focus:ring-cyan-400/20 font-mono"
                      />
                    </FormControl>
                    <FormMessage className="text-red-300" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gameCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-cyan-100 font-mono">{t('gameCode', 'Game Code')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('enterCode', 'Enter 6-digit code or paste join link')}
                        {...field}
                        onChange={(e) => {
                          const extractedCode = extractGameCodeFromUrl(e.target.value)
                          field.onChange(extractedCode)
                        }}
                        maxLength={200}
                        className="bg-black/30 border-cyan-400/30 text-white placeholder:text-cyan-200/60 backdrop-blur-sm focus:border-cyan-400 focus:ring-cyan-400/20 font-mono text-center text-lg tracking-widest"
                        readOnly={!!initialGameCode}
                      />
                    </FormControl>
                    <FormMessage className="text-red-300" />
                    {initialGameCode && <p className="text-sm text-green-400 mt-1 font-mono">✓ {t('gameCode', 'Game code use QR')}</p>}
                  </FormItem>
                )}
              />

              <div>
                <Label className="text-sm font-medium mb-3 block text-cyan-100 font-mono">
                  {t('chooseAvatar', 'Choose Your Avatar')}
                  {user && profile && (
                    <span className="text-xs text-green-400 ml-2">
                      ({t('googleAvatar', 'Google avatar selected')})
                    </span>
                  )}
                </Label>
                <div className="grid grid-cols-4 gap-3 mb-3">
                  {/* Google Avatar (if logged in) */}
                  {user && profile && (
                    <motion.button
                      key="google-avatar"
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedAvatar(googleAvatarUrl || ANIMAL_AVATARS[0])}
                      className={`relative w-16 h-16 rounded-full overflow-hidden border-2 transition-all backdrop-blur-sm ${
                        selectedAvatar === googleAvatarUrl
                          ? "border-green-400 ring-2 ring-green-400/30 shadow-lg shadow-green-400/20"
                          : "border-green-400/30 hover:border-green-400/60 hover:shadow-lg hover:shadow-green-400/10"
                      }`}
                    >
                      {googleAvatarUrl ? (
                        <img
                          src={googleAvatarUrl}
                          alt="Google Avatar"
                          className="w-full h-full object-cover"
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            console.error('❌ Google avatar failed to load:', googleAvatarUrl)
                            console.error('❌ Error event:', e)
                            const img = e.target as HTMLImageElement
                            console.error('❌ Image element:', img)
                            console.error('❌ Image src:', img.src)
                          }}
                          onLoad={(e) => {
                            console.log('✅ Google avatar loaded successfully:', googleAvatarUrl)
                            const img = e.target as HTMLImageElement
                            console.log('✅ Image dimensions:', img.naturalWidth, 'x', img.naturalHeight)
                            console.log('✅ Image src:', img.src)
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                          <span className="text-white text-lg font-bold">
                            {profile?.fullname?.charAt(0).toUpperCase() || profile?.username?.charAt(0).toUpperCase() || 'G'}
                          </span>
                        </div>
                      )}
                      {selectedAvatar === googleAvatarUrl && (
                        <div className="absolute inset-0 bg-green-400/20 animate-pulse"></div>
                      )}
                      {/* Google icon indicator */}
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">G</span>
                      </div>
                    </motion.button>
                  )}
                  
                  {/* Animal Avatars */}
                  {ANIMAL_AVATARS.map((avatarUrl, index) => (
                    <motion.button
                      key={index}
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedAvatar(avatarUrl)}
                      className={`relative w-16 h-16 rounded-full overflow-hidden border-2 transition-all backdrop-blur-sm ${
                        selectedAvatar === avatarUrl
                          ? "border-cyan-400 ring-2 ring-cyan-400/30 shadow-lg shadow-cyan-400/20"
                          : "border-cyan-400/30 hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-400/10"
                      }`}
                    >
                      <img
                        src={avatarUrl || "/placeholder.svg"}
                        alt={`Animal ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {selectedAvatar === avatarUrl && (
                        <div className="absolute inset-0 bg-cyan-400/20 animate-pulse"></div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-cyan-500/30 border border-cyan-400/30 backdrop-blur-sm font-mono relative overflow-hidden"
                  style={{ imageRendering: "pixelated" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 animate-pulse"></div>
                  <span className="relative z-10">
                    {isLoading ? t('loading', 'Joining...') : t('joinGame', 'Join Game')}
                  </span>
                  <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
                </Button>
              </motion.div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
