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
import { getGameSessionByPin } from "@/lib/sessions-api"
import { createParticipant } from "@/lib/participants-api"
import { generateXID } from "@/lib/id-generator"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"
import { Html5Qrcode } from "html5-qrcode"
// penanda
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
  // Use higher resolution (256x256) for better quality when zoomed
  // Use n=-1 to preserve all animation frames for GIFs (no output=png to keep original format)
  const googleAvatarUrl = rawGoogleAvatarUrl ? `https://images.weserv.nl/?url=${encodeURIComponent(rawGoogleAvatarUrl)}&w=256&h=256&fit=cover&n=-1` : null

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

  // Initialize selectedAvatar when component mounts or profile changes
  useEffect(() => {
    if (googleAvatarUrl && !selectedAvatar) {


      // Set Google avatar directly - let the Image component handle loading

      setSelectedAvatar(googleAvatarUrl)

    } else if (!googleAvatarUrl && !selectedAvatar) {

      setSelectedAvatar(ANIMAL_AVATARS[0])
    }
  }, [googleAvatarUrl, selectedAvatar])

  const router = useRouter()
  const { setPlayer, setGameCode, setGameId, setQuizId, setIsHost } = useGameStore()

  const form = useForm<JoinGameForm>({
    resolver: zodResolver(joinGameSchema),
    defaultValues: {
      name: profile?.nickname || profile?.fullname || profile?.username || "",
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

        form.setValue("gameCode", trimmedCode)
      } else {
        // Jika bukan kode 6 digit, abaikan (kemungkinan kode OAuth atau invalid)

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
      const displayName = profile.nickname || profile.fullname || profile.username || ""
      form.setValue("name", displayName)

      // Set Google avatar as default if available
      if (googleAvatarUrl) {

        setSelectedAvatar(googleAvatarUrl)
      } else {

        setSelectedAvatar(ANIMAL_AVATARS[0])
      }
    }
  }, [profile, form, googleAvatarUrl])

  const extractGameCodeFromUrl = (input: string): string => {
    try {
      // Check if input contains a URL
      if (input.includes("http") || input.includes("player?code=") || input.includes("?code=") || input.includes("/join/")) {
        let url: URL
        try {
          url = new URL(input)
        } catch {
          // If input is not a full URL, try to parse it as a relative URL
          // Try new /join/[code] format first
          if (input.includes("/join/")) {
            const parts = input.split("/join/")
            if (parts.length > 1) {
              const code = parts[1].split("?")[0].split("#")[0].split("/")[0].trim()
              if (code.length === 6 && /^[A-Z0-9]{6}$/i.test(code)) {
                return code.toUpperCase()
              }
            }
          }
          // Fallback to old ?code= format
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

        // Try new /join/[code] path format first
        const pathMatch = url.pathname.match(/\/join\/([A-Z0-9]{6})/i)
        if (pathMatch && pathMatch[1]) {
          return pathMatch[1].toUpperCase()
        }

        // Fallback to old ?code= format
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
          }
        }
      )
    } catch (error: any) {
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
      setIsScanning(false)
    }
  }, [])

  // Cleanup on unmount or dialog close
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => { })
          // clear() may return void, so we don't use .catch() on it
          scannerRef.current.clear()
          scannerRef.current = null
        } catch (error) {
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
    console.log('[JoinGame] Form submitted with data:', { name: data.name, gameCode: data.gameCode, avatar: selectedAvatar })
    setIsLoading(true)
    try {
      // Try Supabase B first (new sessions)
      const sessionFromB = await getGameSessionByPin(data.gameCode.toUpperCase())

      if (sessionFromB) {
        // Session found in Supabase B
        if (sessionFromB.status === "finish") {
          form.setError("gameCode", { message: "Game has ended. Host has left the session." })
          setIsLoading(false)
          return
        }

        if (sessionFromB.status !== "waiting") {
          form.setError("gameCode", { message: t('error', 'Game has already started or ended') })
          setIsLoading(false)
          return
        }

        // Check if player nickname already exists by fetching participants from Supabase B
        const { getParticipantsByGameId } = await import("@/lib/participants-api")
        const existingParticipants = await getParticipantsByGameId(sessionFromB.id)
        const existingPlayer = existingParticipants.find((p) => p.nickname === data.name)

        if (existingPlayer) {
          form.setError("name", { message: "Nama sudah digunakan oleh player lain. Silakan gunakan nama yang berbeda." })
          setIsLoading(false)
          return
        }

        const playerId = generateXID()

        // Add participant to Supabase B
        const newParticipant = await createParticipant({
          id: playerId,
          game_id: sessionFromB.id,
          user_id: profile?.id || null,
          nickname: data.name,
          avatar: selectedAvatar,
          score: 0
        })

        if (!newParticipant) {
          form.setError("gameCode", { message: "Failed to join game. Please try again." })
          setIsLoading(false)
          return
        }

        setPlayer(playerId, data.name, selectedAvatar)
        setGameCode(data.gameCode.toUpperCase())
        setGameId(sessionFromB.id)
        setQuizId(sessionFromB.quiz_id)
        setIsHost(false)

        // Save to localStorage before redirect
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
        return
      }

      // Fallback to main Supabase (legacy sessions)
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
      console.error('[JoinGame] Error joining game:', error)
      form.setError("gameCode", { message: "Failed to join game. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isScanning && !isMobile ? 'max-w-6xl' : 'max-w-[92vw] xs:max-w-sm sm:max-w-md'} p-0 border-0 bg-transparent transition-all duration-300 mx-auto`}>
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
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
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

        {/* Glass morphism dialog content - Dark Galaxy Theme */}
        <div className="relative z-10 bg-gradient-to-br from-slate-900/95 via-indigo-950/95 to-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl xs:rounded-3xl p-4 xs:p-5 sm:p-6 shadow-2xl overflow-hidden">

          {/* Animated background effects */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl xs:rounded-3xl pointer-events-none">
            {/* Nebula gradients */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-cyan-600/10"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-pink-600/5 via-transparent to-blue-600/5"></div>

            {/* Floating stars */}
            {!isMobile && [...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${10 + (i * 15)}%`,
                  top: `${8 + (i * 12) % 85}%`,
                }}
                animate={{
                  opacity: [0.2, 0.7, 0.2],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 2 + (i * 0.3),
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
          </div>
          {/* Close button */}
          <motion.button
            onClick={handleClose}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className={`absolute right-3 top-3 xs:right-4 xs:top-4 w-7 h-7 xs:w-8 xs:h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all duration-200 z-20 ${isScanning && isMobile
              ? 'opacity-50 hover:opacity-100'
              : ''
              }`}
            disabled={isScanning && isMobile}
            title={isScanning && isMobile ? 'Stop scanning first to close' : 'Close'}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">{t('close', 'Close')}</span>
          </motion.button>

          <DialogHeader className={`mb-4 xs:mb-5 sm:mb-6 relative z-10 ${isScanning && isMobile ? 'opacity-30 blur-sm pointer-events-none transition-all duration-300' : ''}`}>
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                delay: isMobile ? 0 : 0.1,
                type: "spring",
                stiffness: 200,
                damping: 15
              }}
              className="mb-2 xs:mb-3 flex justify-center"
            >
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 rounded-xl blur-sm opacity-60"></div>
                <div className="relative w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Users className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 text-white" />
                  </motion.div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <DialogTitle className="text-lg xs:text-xl sm:text-2xl font-bold text-center text-white drop-shadow-lg">
                {initialGameCode ? t('joinGame', 'Join With QR') : t('joinGame', 'Join Game')}
              </DialogTitle>
            </motion.div>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.log('[JoinGame] Form validation failed:', errors)
            })}>
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
                          <FormLabel className="text-white/80 text-sm xs:text-base">
                            {t('username', 'Username')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('enterUsername', 'Choose a username')}
                              {...field}
                              className="bg-white/5 border-white/20 text-white placeholder:text-white/40 backdrop-blur-sm focus:border-cyan-400 focus:ring-cyan-400/20 rounded-xl h-10 xs:h-11 text-sm xs:text-base"
                            />
                          </FormControl>
                          <FormMessage className="text-red-300 text-xs xs:text-sm" />
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
                      <Label className="text-sm xs:text-base font-medium mb-2 xs:mb-3 block text-white/80">
                        {t('chooseAvatar', 'Choose Your Avatar')}
                        {user && profile && (
                          <span className="text-xs text-green-400 ml-2">
                            ({t('googleAvatar', 'Google avatar selected')})
                          </span>
                        )}
                      </Label>
                      <div className="grid grid-cols-5 xs:grid-cols-5 gap-2 xs:gap-2.5 sm:gap-3 mb-3">
                        {/* Google Avatar (if logged in) - Only load when dialog is open */}
                        {user && profile && avatarLoaded && (
                          <motion.button
                            key="google-avatar"
                            type="button"
                            whileHover={isMobile ? {} : { scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedAvatar(googleAvatarUrl || ANIMAL_AVATARS[0])}
                            className={`relative w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 transition-all ${selectedAvatar === googleAvatarUrl
                              ? "border-green-400 ring-2 ring-green-400/30 shadow-lg shadow-green-400/20"
                              : "border-white/20 hover:border-green-400/60"
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
                                }}
                                onLoad={(e) => {
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                                <span className="text-white text-sm xs:text-base font-bold">
                                  {profile?.fullname?.charAt(0).toUpperCase() || profile?.username?.charAt(0).toUpperCase() || 'G'}
                                </span>
                              </div>
                            )}
                            {selectedAvatar === googleAvatarUrl && (
                              <motion.div
                                className="absolute inset-0 bg-green-400/20"
                                animate={{ opacity: [0.2, 0.5, 0.2] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              />
                            )}
                            {/* Google icon indicator */}
                            <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border border-white/30">
                              <span className="text-white text-[8px] font-bold">G</span>
                            </div>
                          </motion.button>
                        )}

                        {/* Animal Avatars - Only load when dialog is open */}
                        {avatarLoaded && ANIMAL_AVATARS.map((avatarUrl, index) => (
                          <motion.button
                            key={index}
                            type="button"
                            whileHover={isMobile ? {} : { scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.03 }}
                            onClick={() => setSelectedAvatar(avatarUrl)}
                            className={`relative w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 transition-all ${selectedAvatar === avatarUrl
                              ? "border-cyan-400 ring-2 ring-cyan-400/30 shadow-lg shadow-cyan-400/20"
                              : "border-white/20 hover:border-cyan-400/60"
                              }`}
                          >
                            <img
                              src={avatarUrl || "/placeholder.svg"}
                              alt={`Animal ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {selectedAvatar === avatarUrl && (
                              <motion.div
                                className="absolute inset-0 bg-cyan-400/20"
                                animate={{ opacity: [0.2, 0.5, 0.2] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              />
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div className={`${isScanning && !isMobile ? 'flex justify-start' : 'w-full'} mt-2`}>
                      <Button
                        type="button"
                        disabled={isLoading}
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          console.log('[JoinGame] Button clicked!')
                          console.log('[JoinGame] Current form values:', form.getValues())

                          // Manually trigger validation
                          const isValid = await form.trigger()
                          console.log('[JoinGame] Form is valid:', isValid)

                          if (!isValid) {
                            console.log('[JoinGame] Validation errors:', form.formState.errors)
                            return
                          }

                          // If valid, call onSubmit directly
                          const values = form.getValues()
                          await onSubmit(values)
                        }}
                        className={`${isScanning && !isMobile ? 'w-auto min-w-[200px]' : 'w-full'} bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-2.5 xs:py-3 px-6 rounded-xl shadow-lg shadow-cyan-500/30 border-0 text-sm xs:text-base transition-all duration-300 h-10 xs:h-11 hover:scale-[1.02] active:scale-[0.98]`}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        {isLoading ? t('loading', 'Joining...') : t('joinGame', 'Join Game')}
                      </Button>
                    </div>
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
