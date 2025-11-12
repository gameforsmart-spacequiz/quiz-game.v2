"use client"

/* eslint-disable @next/next/no-img-element */
import Image from 'next/image'

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
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
import { X, Users, Gamepad2, Sparkles, Star, Camera, CameraOff } from "lucide-react"
import { useGameStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"
import { generateXID } from "@/lib/id-generator"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"
import { Html5Qrcode } from "html5-qrcode"
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
  const [isMobile, setIsMobile] = useState(false)
  const [avatarLoaded, setAvatarLoaded] = useState(false)
  const [debouncedGameCode, setDebouncedGameCode] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [scanError, setScanError] = useState<string>("")
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const qrReaderRef = useRef<HTMLDivElement>(null)
  
  // Get Google avatar URL - prioritize profile data, then user metadata
  const rawGoogleAvatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture
  const googleAvatarUrl = rawGoogleAvatarUrl ? `https://images.weserv.nl/?url=${encodeURIComponent(rawGoogleAvatarUrl)}&w=64&h=64&fit=cover&output=png` : null
  
  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Optimized avatar loading with lazy loading
  useEffect(() => {
    if (open && user && profile) {
      // Only load avatars when dialog is open
      setAvatarLoaded(true)
    }
  }, [open, user, profile])

  // Debug logging for avatar URL (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && user && profile) {
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
      // Validasi ketat: hanya set game code jika panjangnya persis 6 digit
      // Abaikan kode OAuth yang biasanya lebih panjang
      const trimmedCode = initialGameCode.trim().toUpperCase()
      
      // Validasi: panjang persis 6 karakter dan hanya alphanumeric
      const isValidGameCode = trimmedCode.length === 6 && /^[A-Z0-9]{6}$/.test(trimmedCode)
      
      if (isValidGameCode) {
        console.log("✅ Setting valid game code:", trimmedCode)
        form.setValue("gameCode", trimmedCode)
      } else {
        // Jika bukan kode 6 digit, abaikan (kemungkinan kode OAuth atau invalid)
        console.log("⚠️ Invalid game code ignored (length:", trimmedCode.length, ", code:", trimmedCode.substring(0, 10) + (trimmedCode.length > 10 ? "..." : ""), ")")
        form.setValue("gameCode", "")
      }
    } else {
      // Jika initialGameCode kosong, pastikan field juga kosong
      form.setValue("gameCode", "")
    }
  }, [initialGameCode, form])

  // Debounce game code input for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedGameCode(form.getValues("gameCode"))
    }, 300)
    return () => clearTimeout(timer)
  }, [form.watch("gameCode")])

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
      if (input.includes("http") || input.includes("player?code=") || input.includes("?code=")) {
        let url: URL
        try {
          url = new URL(input)
        } catch {
          // If input is not a full URL, try to parse it as a relative URL
          if (input.includes("?code=")) {
            const parts = input.split("?code=")
            if (parts.length > 1) {
              const code = parts[1].split("&")[0].split("#")[0].trim()
              if (code.length === 6 && /^[A-Z0-9]{6}$/i.test(code)) {
                return code.toUpperCase()
              }
            }
          }
          return input.toUpperCase()
        }
        const code = url.searchParams.get("code")
        if (code && code.length === 6 && /^[A-Z0-9]{6}$/i.test(code)) {
          return code.toUpperCase()
        }
      }
      // If not a URL, check if it's a direct 6-character code
      if (input.length === 6 && /^[A-Z0-9]{6}$/i.test(input)) {
        return input.toUpperCase()
      }
      // If not a URL or no valid code found, return the input as is (truncated to 6 chars)
      return input.substring(0, 6).toUpperCase()
    } catch {
      // If URL parsing fails, return the input as is (truncated to 6 chars)
      return input.substring(0, 6).toUpperCase()
    }
  }

  // Check camera permission
  const checkCameraPermission = async () => {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName })
        setCameraPermission(permission.state)
        
        permission.onchange = () => {
          setCameraPermission(permission.state)
        }
      } else {
        // Fallback for browsers that don't support Permissions API
        setCameraPermission('prompt')
      }
    } catch (error) {
      console.error("Error checking camera permission:", error)
      setCameraPermission('prompt')
    }
  }

  // Start QR code scanning
  const startScanning = async () => {
    try {
      setScanError("")
      
      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setScanError("Camera not available on this device")
        return
      }

      // Check camera permission first
      await checkCameraPermission()
      
      // Try to access camera to check permission
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        stream.getTracks().forEach(track => track.stop()) // Stop immediately to check permission
        setCameraPermission('granted')
      } catch (error: any) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setCameraPermission('denied')
          setScanError("Camera permission denied. Please allow camera access and try again.")
          return
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          setScanError("No camera found on this device")
          return
        }
        throw error
      }

      setIsScanning(true)
      
      // Wait for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Mobile: Scroll to camera view when scanning starts
      if (isMobile) {
        setTimeout(() => {
          const qrReaderElement = document.getElementById("qr-reader")
          if (qrReaderElement) {
            qrReaderElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 200)
      }
      
      const qrReaderElement = document.getElementById("qr-reader")
      if (!qrReaderElement) {
        setScanError("QR scanner element not found")
        setIsScanning(false)
        return
      }

      const scanner = new Html5Qrcode("qr-reader")
      scannerRef.current = scanner
      
      // Determine camera facing mode based on device
      const facingMode = isMobile ? "environment" : "user" // Back camera on mobile, front on desktop
      
      await scanner.start(
        { facingMode },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            // Responsive QR box size
            const minEdgePercentage = 0.7
            const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight)
            const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage)
            return {
              width: qrboxSize,
              height: qrboxSize
            }
          },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          // Success callback
          console.log("QR Code scanned:", decodedText)
          const gameCode = extractGameCodeFromUrl(decodedText)
          
          // Validate game code
          if (gameCode && gameCode.length === 6 && /^[A-Z0-9]{6}$/.test(gameCode)) {
            form.setValue("gameCode", gameCode)
            // Stop scanning after successful scan
            try {
              if (scannerRef.current) {
                await scannerRef.current.stop()
                await scannerRef.current.clear()
                scannerRef.current = null
              }
              setIsScanning(false)
              setScanError("")
            } catch (error) {
              console.error("Error stopping scanner after scan:", error)
              setIsScanning(false)
            }
          } else {
            setScanError("Invalid QR code. Please scan a valid game code.")
          }
        },
        (errorMessage) => {
          // Error callback (silent - terus scan)
          // Only log errors that are not "NotFoundException" (which is normal while scanning)
          if (!errorMessage.includes("NotFoundException")) {
            console.debug("QR scan error:", errorMessage)
          }
        }
      )
    } catch (error: any) {
      console.error("Error starting QR scanner:", error)
      setIsScanning(false)
      setScanError(error.message || "Failed to start camera. Please try again.")
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraPermission('denied')
        setScanError("Camera permission denied. Please allow camera access in your browser settings.")
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setScanError("No camera found on this device")
      }
    }
  }

  // Stop QR code scanning
  const stopScanning = useCallback(async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
        scannerRef.current = null
      }
      setIsScanning(false)
      setScanError("")
    } catch (error) {
      console.error("Error stopping QR scanner:", error)
      setIsScanning(false)
    }
  }, [])

  // Cleanup on unmount or dialog close
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(console.error)
          // clear() may return void, so we don't use .catch() on it
          scannerRef.current.clear()
          scannerRef.current = null
        } catch (error) {
          console.error("Error cleaning up scanner:", error)
        }
      }
      setIsScanning(false)
    }
  }, [])

  // Stop scanning when dialog closes
  useEffect(() => {
    if (!open && isScanning) {
      stopScanning()
    }
  }, [open, isScanning, stopScanning])

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

      // Check if player nickname already exists in this game
      const existingPlayer = game.participants?.find((p: any) => (p.nickname ?? p.name) === data.name)

      if (existingPlayer) {
        form.setError("name", { message: "Nama sudah digunakan oleh player lain. Silakan gunakan nama yang berbeda." })
        setIsLoading(false)
        return
      }

      const playerId = generateXID()
      
      // Add player to participants array (use nickname going forward; keep name for backward compatibility if present)
      const newParticipant = {
        id: playerId,
        user_id: profile?.id || null, // Link to profile.id if user is logged in
        nickname: data.name,
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
      <DialogContent className={`${isScanning && !isMobile ? 'max-w-6xl' : 'max-w-md'} p-0 border-0 bg-transparent transition-all duration-300`}>
        {/* Mobile optimization styles */}
        <style jsx global>{`
          @media (max-width: 768px) {
            .orbit-inner, .orbit-middle, .orbit-outer {
              animation: none !important;
            }
            .cosmic-ring-slow, .cosmic-ring-orbit {
              animation: none !important;
            }
          }
          
          /* QR Scanner Styles */
          #qr-reader {
            width: 100% !important;
            min-height: 250px;
          }
          
          #qr-reader__dashboard {
            display: none !important;
          }
          
          #qr-reader__camera_selection {
            display: none !important;
          }
          
          #qr-reader__scan_region {
            width: 100% !important;
            height: 100% !important;
          }
          
          #qr-reader__scan_region video {
            width: 100% !important;
            height: auto !important;
            object-fit: cover !important;
          }
          
          #qr-reader__scan_region canvas {
            display: none !important;
          }
          
          @media (min-width: 640px) {
            #qr-reader {
              min-height: 300px;
            }
          }
          
          @media (min-width: 1024px) {
            #qr-reader {
              min-height: 400px;
            }
          }
        `}</style>
        {/* Optimized Background */}
        <div className="fixed inset-0 z-0 overflow-hidden">
          {/* Lightweight CSS gradient background */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)"
            }}
          />
          
          {/* Simplified animated elements - only on desktop */}
          <div className="absolute inset-0 flex items-center justify-center hidden md:block">
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

          {/* Simplified cosmic rings - only on desktop */}
          <div className="absolute inset-0 flex items-center justify-center cosmic-ring-slow hidden md:block">
            <div className="w-80 h-80 border border-purple-300/10 rounded-full"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center hidden md:block" style={{ animation: "cosmic-ring-orbit 120s linear infinite" }}>
            <div className="w-96 h-96 border border-blue-300/8 rounded-full"></div>
          </div>

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        {/* Glass morphism dialog content */}
        <div className="relative z-10 bg-black/20 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
          <button
            onClick={handleClose}
            className={`absolute right-4 top-4 rounded-sm ring-offset-background transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-20 text-white hover:text-cyan-300 ${
              isScanning && isMobile 
                ? 'opacity-50 hover:opacity-100 bg-black/40 backdrop-blur-sm p-2 rounded-full border border-white/20' 
                : 'opacity-70 hover:opacity-100'
            }`}
            disabled={isScanning && isMobile}
            title={isScanning && isMobile ? 'Stop scanning first to close' : 'Close'}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">{t('close', 'Close')}</span>
          </button>

          <DialogHeader className={`mb-6 ${isScanning && isMobile ? 'opacity-30 blur-sm pointer-events-none transition-all duration-300' : ''}`}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                delay: isMobile ? 0 : 0.2, 
                type: "spring", 
                stiffness: isMobile ? 200 : 150 
              }}
              className="mb-4 flex justify-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/30 to-cyan-500/30 backdrop-blur-xl rounded-2xl flex items-center justify-center border-2 border-white/40 shadow-lg shadow-purple-500/20 relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br from-purple-400/10 to-cyan-400/10 ${isMobile ? '' : 'animate-pulse'}`}></div>
                <Users className="w-8 h-8 text-white relative z-10" />
                <Sparkles className={`absolute top-1 right-1 w-3 h-3 text-cyan-300 ${isMobile ? '' : 'animate-pulse'}`} />
                <Star className={`absolute bottom-1 left-1 w-2 h-2 text-purple-300 ${isMobile ? '' : 'animate-pulse'}`} style={isMobile ? {} : { animationDelay: "1s" }} />
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
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* Mobile: Camera Focus Mode - When scanning, blur form and focus on camera */}
              {isScanning && isMobile ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4 -mt-4"
                >
                  {/* Camera View - Full Focus */}
                  <div className="relative bg-black/40 rounded-xl overflow-hidden border-2 border-cyan-400/60 -mx-6 shadow-2xl shadow-cyan-500/30">
                    <div 
                      id="qr-reader" 
                      className="w-full"
                      style={{ minHeight: 'calc(70vh - 120px)' }}
                    />
                    {/* Scanning overlay guide */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="border-2 border-green-500 rounded-lg shadow-lg shadow-green-500/60 animate-pulse"
                        style={{
                          width: '240px',
                          height: '240px'
                        }}
                      >
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
                      </div>
                    </div>
                    {/* Instructions */}
                    <div className="absolute top-4 left-0 right-0 text-center pointer-events-none z-10">
                      <p className="text-white text-sm font-mono bg-black/80 px-4 py-2 rounded-lg backdrop-blur-md inline-block border border-cyan-400/30">
                        📷 Scanning QR Code
                      </p>
                    </div>
                    <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                      <p className="text-white text-xs font-mono bg-black/70 px-3 py-1.5 rounded-lg backdrop-blur-md inline-block">
                        Point camera at QR code
                      </p>
                    </div>
                  </div>

                  {/* Stop Scanning Button - Prominent */}
                  <Button
                    type="button"
                    onClick={stopScanning}
                    variant="outline"
                    className="w-full bg-red-500/40 border-2 border-red-400/60 text-red-100 hover:bg-red-500/50 hover:border-red-400 backdrop-blur-sm font-mono py-4 text-base font-semibold shadow-lg shadow-red-500/20 transition-all duration-200"
                  >
                    <CameraOff className="h-5 w-5 mr-2" />
                    Stop Scanning
                  </Button>
                </motion.div>
              ) : (
                /* Desktop or Not Scanning: Normal Layout */
                <div className={`${isScanning && !isMobile ? 'flex flex-row gap-6 lg:gap-8 xl:gap-10 items-start' : 'space-y-6'}`}>
                  {/* Left Column: Form Fields */}
                  <div className={`${isScanning && !isMobile ? 'flex-shrink-0 w-full max-w-xs sm:max-w-sm' : 'w-full'} space-y-6`}>
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
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Input
                                placeholder={t('enterCode', 'Enter 6-digit code or paste join link')}
                                {...field}
                                onChange={(e) => {
                                  const extractedCode = extractGameCodeFromUrl(e.target.value)
                                  field.onChange(extractedCode)
                                }}
                                maxLength={200}
                                className="bg-black/30 border-cyan-400/30 text-white placeholder:text-cyan-200/60 backdrop-blur-sm focus:border-cyan-400 focus:ring-cyan-400/20 font-mono text-center text-lg tracking-widest flex-1"
                                readOnly={!!initialGameCode || isScanning}
                                disabled={isScanning}
                              />
                              <Button
                                type="button"
                                onClick={isScanning ? stopScanning : startScanning}
                                variant="outline"
                                disabled={!!initialGameCode}
                                className="shrink-0 bg-black/30 border-cyan-400/30 text-white hover:bg-cyan-500/30 hover:border-cyan-400 backdrop-blur-sm font-mono px-3 sm:px-4"
                              >
                                {isScanning ? (
                                  <>
                                    <CameraOff className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Stop</span>
                                  </>
                                ) : (
                                  <>
                                    <Camera className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Scan QR</span>
                                  </>
                                )}
                              </Button>
                            </div>
                            {scanError && (
                              <p className="text-sm text-red-400 font-mono">{scanError}</p>
                            )}
                            {cameraPermission === 'denied' && (
                              <p className="text-sm text-yellow-400 font-mono">
                                Camera access denied. Please allow camera access in browser settings to scan QR codes.
                              </p>
                            )}
                          </div>
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
                      {/* Google Avatar (if logged in) - Only load when dialog is open */}
                      {user && profile && avatarLoaded && (
                        <motion.button
                          key="google-avatar"
                          type="button"
                          whileHover={isMobile ? {} : { scale: 1.1 }}
                          whileTap={isMobile ? {} : { scale: 0.9 }}
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
                            <div className={`absolute inset-0 bg-green-400/20 ${isMobile ? '' : 'animate-pulse'}`}></div>
                          )}
                          {/* Google icon indicator */}
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">G</span>
                          </div>
                        </motion.button>
                      )}
                      
                      {/* Animal Avatars - Only load when dialog is open */}
                      {avatarLoaded && ANIMAL_AVATARS.map((avatarUrl, index) => (
                        <motion.button
                          key={index}
                          type="button"
                          whileHover={isMobile ? {} : { scale: 1.1 }}
                          whileTap={isMobile ? {} : { scale: 0.9 }}
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
                            <div className={`absolute inset-0 bg-cyan-400/20 ${isMobile ? '' : 'animate-pulse'}`}></div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`${isScanning && !isMobile ? 'flex justify-start' : 'w-full'}`}
                  >
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className={`${isScanning && !isMobile ? 'w-auto min-w-[200px]' : 'w-full'} bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-cyan-500/30 border border-cyan-400/30 backdrop-blur-sm font-mono relative overflow-hidden transition-all duration-300`}
                      style={{ imageRendering: "pixelated" }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 animate-pulse"></div>
                      <span className="relative z-10">
                        {isLoading ? t('loading', 'Joining...') : t('joinGame', 'Join Game')}
                      </span>
                      <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
                    </Button>
                  </motion.div>
                </div>

                  {/* Right Column: QR Scanner Area (only visible when scanning on desktop) */}
                  {isScanning && !isMobile && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="flex-shrink-0 w-full max-w-md lg:max-w-lg space-y-3"
                    >
                      <div className="relative bg-black/40 rounded-lg overflow-hidden border border-cyan-400/30">
                        <div 
                          id="qr-reader" 
                          className="w-full"
                          style={{ minHeight: '400px' }}
                        />
                        {/* Scanning overlay guide */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="border-2 border-green-500 rounded-lg shadow-lg shadow-green-500/50"
                            style={{
                              width: '280px',
                              height: '280px'
                            }}
                          >
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
                          </div>
                        </div>
                        {/* Instructions */}
                        <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                          <p className="text-white text-sm font-mono bg-black/60 px-4 py-2 rounded-lg backdrop-blur-sm inline-block">
                            Point camera at QR code
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
