/* eslint-disable @next/next/no-img-element */
"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useGameStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"
import { supabaseB } from "@/lib/supabase-b"
import { getGameSessionByPin, subscribeToGameSession } from "@/lib/sessions-api"
import { getParticipantsByGameId, deleteParticipant, subscribeToGameParticipants } from "@/lib/participants-api"
import { cleanupPresence } from "@/lib/presence"
import { syncServerTime } from "@/lib/server-time"
import { toast } from "sonner"
import { getFirstName, formatDisplayName } from "@/lib/utils"
import { getDisplayName } from "@/lib/player-name"
import { LogOut, X, Sparkles, Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import React from "react"
import { useLanguage } from "@/contexts/language-context"
import type { TranslationKey } from "@/lib/locales/translations"

interface WaitContentProps {
  gameCode: string
}


function Background() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-black">
      {/* Galaxy gradients using SVG */}
      <div className="absolute inset-0">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="galaxy1-wait" cx="20%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#4c1d95" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#1e1b4b" stopOpacity="0.2" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="galaxy2-wait" cx="80%" cy="70%" r="65%">
              <stop offset="0%" stopColor="#701a75" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#312e81" stopOpacity="0.15" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="galaxy3-wait" cx="60%" cy="10%" r="55%">
              <stop offset="0%" stopColor="#064e3b" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#1e1b4b" stopOpacity="0.1" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="galaxy4-wait" cx="10%" cy="80%" r="45%">
              <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#312e81" stopOpacity="0.1" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="nebula-wait" cx="40%" cy="60%" r="90%">
              <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.15" />
              <stop offset="70%" stopColor="#0f0f23" stopOpacity="0.08" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="#000000" />
          <rect width="100%" height="100%" fill="url(#nebula-wait)" />
          <rect width="100%" height="100%" fill="url(#galaxy1-wait)" />
          <rect width="100%" height="100%" fill="url(#galaxy2-wait)" />
          <rect width="100%" height="100%" fill="url(#galaxy3-wait)" />
          <rect width="100%" height="100%" fill="url(#galaxy4-wait)" />
        </svg>
      </div>

      {/* Static distant stars */}
      {Array.from({ length: 200 }).map((_, i) => (
        <div
          key={`distant-star-${i}`}
          className="absolute bg-white rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 1.5 + 0.3}px`,
            height: `${Math.random() * 1.5 + 0.3}px`,
            opacity: Math.random() * 0.4 + 0.1,
          }}
        />
      ))}

      {/* Brighter stars with glow */}
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={`bright-star-${i}`}
          className="absolute bg-white rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            opacity: Math.random() * 0.6 + 0.4,
            boxShadow: "0 0 8px rgba(255, 255, 255, 0.6), 0 0 16px rgba(255, 255, 255, 0.3)",
          }}
        />
      ))}

      {/* Animated twinkling stars */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={`twinkle-star-${i}`}
          className="absolute bg-white rounded-full animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            opacity: Math.random() * 0.5 + 0.3,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${Math.random() * 2 + 1}s`,
          }}
        />
      ))}

      {/* Shooting stars */}
      <style jsx>{`
        @keyframes shooting-star {
          0% {
            transform: translateX(0) translateY(0);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateX(300px) translateY(300px);
            opacity: 0;
          }
        }
      `}</style>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={`shooting-star-${i}`}
          className="absolute bg-gradient-to-r from-white to-transparent h-px opacity-70"
          style={{
            left: `${Math.random() * 60}%`,
            top: `${Math.random() * 40}%`,
            width: `${Math.random() * 80 + 40}px`,
            transform: `rotate(${45 + Math.random() * 20}deg)`,
            animation: `shooting-star ${Math.random() * 6 + 4}s infinite linear`,
            animationDelay: `${Math.random() * 8}s`,
          }}
        />
      ))}
    </div>
  )
}


// === SMART NAME DISPLAY ===
const SmartNameDisplay = React.memo(({
  name,
  maxLength = 8,
  className = "",
  multilineClassName = ""
}: {
  name: string;
  maxLength?: number;
  className?: string;
  multilineClassName?: string;
}) => {
  const { displayName, isBroken } = formatDisplayName(name, maxLength)

  if (isBroken) {
    return (
      <span className={`${className} ${multilineClassName} whitespace-pre-line leading-tight text-center block`}>
        {displayName}
      </span>
    )
  }

  return (
    <span className={className}>
      {displayName}
    </span>
  )
})
SmartNameDisplay.displayName = "SmartNameDisplay"

// === PLAYER CARD COMPONENT ===
const PlayerCard = React.memo(({
  player,
  index,
  isCurrentPlayer,
  onExitGame
}: {
  player: {
    id: string
    name: string
    avatar: string
    created_at: string
  }
  index: number
  isCurrentPlayer: boolean
  onExitGame: () => void
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 200, damping: 20 }}
      whileHover={{ scale: 1.03, y: -5 }}
      className={`relative rounded-2xl p-4 sm:p-5 w-full max-w-[160px] sm:max-w-[180px] transition-all duration-300 overflow-hidden ${isCurrentPlayer
        ? 'bg-gradient-to-br from-emerald-900/80 via-cyan-900/70 to-blue-900/80'
        : 'bg-gradient-to-br from-slate-900/90 via-indigo-950/80 to-slate-900/90'
        }`}
      style={{
        boxShadow: isCurrentPlayer
          ? '0 0 30px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
          : '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
      }}
    >
      {/* Animated border glow for current player */}
      {isCurrentPlayer && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, rgba(16,185,129,0.5) 0%, rgba(6,182,212,0.5) 50%, rgba(16,185,129,0.5) 100%)',
            padding: '2px',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'xor',
            WebkitMaskComposite: 'xor',
          }}
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Border */}
      <div className={`absolute inset-0 rounded-2xl pointer-events-none ${isCurrentPlayer
        ? 'border-2 border-emerald-400/60'
        : 'border border-white/10'
        }`} />

      {/* Floating stars for current player */}
      {isCurrentPlayer && (
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-emerald-300 rounded-full"
              style={{
                left: `${20 + i * 30}%`,
                top: `${15 + i * 20}%`,
              }}
              animate={{
                opacity: [0.3, 0.8, 0.3],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 2 + i * 0.3,
                repeat: Infinity,
                delay: i * 0.4,
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {/* Avatar */}
        <div className="flex justify-center mb-3">
          <div className="relative">
            {/* Avatar glow */}
            <div className={`absolute -inset-1 rounded-full blur-md ${isCurrentPlayer
              ? 'bg-gradient-to-br from-emerald-400/40 to-cyan-400/40'
              : 'bg-gradient-to-br from-blue-400/20 to-purple-400/20'
              }`} />
            <motion.img
              src={player.avatar}
              alt={getFirstName(player.name)}
              className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover ${isCurrentPlayer
                ? 'border-2 border-emerald-400/80 shadow-lg shadow-emerald-500/30'
                : 'border-2 border-white/20'
                }`}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: index * 0.08 + 0.15, type: "spring", stiffness: 200 }}
            />
          </div>
        </div>

        {/* Player Name */}
        <div className="text-center mb-3">
          <h4 className="text-white font-bold text-sm sm:text-base truncate max-w-full px-1">
            <SmartNameDisplay
              name={player.name}
              maxLength={10}
              className="text-white"
              multilineClassName="text-white text-xs"
            />
          </h4>
          {isCurrentPlayer && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-block mt-1 text-emerald-300 text-xs font-bold bg-emerald-400/20 px-2.5 py-0.5 rounded-full border border-emerald-400/30"
            >
              YOU
            </motion.span>
          )}
        </div>

        {/* Action Button */}
        {isCurrentPlayer ? (
          <div className="flex justify-center">
            <motion.button
              onClick={onExitGame}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white p-2.5 rounded-xl font-bold transition-all duration-200 flex items-center justify-center shadow-lg shadow-blue-500/25 border border-blue-400/30"
              title="Exit Game"
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="text-white/50 text-xs font-medium flex items-center gap-1">
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 bg-blue-400 rounded-full"
              />
              Ready
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
})
PlayerCard.displayName = "PlayerCard"

// === PLAYER LIST COMPONENT ===
const PlayerList = React.memo(({
  players,
  currentPlayerName,
  onExitGame,
  isUpdating,
  t
}: {
  players: Array<{
    id: string
    name: string
    avatar: string
    created_at: string
  }>
  currentPlayerName: string
  onExitGame: () => void
  isUpdating: boolean
  t: (key: TranslationKey) => string
}) => {
  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Status Bar - Waiting + Player Count */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8"
      >
        {/* Waiting Status */}
        <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-lg border border-white/10 px-5 py-2.5 rounded-full">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50"
          />
          <span className="text-sm sm:text-base text-white/80 font-medium">
            {t('waitingHostToStart')}
          </span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-cyan-300"
          >
            ...
          </motion.span>
        </div>

        {/* Player Count */}
        <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-lg border border-white/10 px-5 py-2.5 rounded-full">
          <h3 className="text-white text-sm sm:text-base font-bold flex items-center gap-2">
            {t('players')}
            <span className="text-purple-300">({players.length})</span>
            {isUpdating && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full"
              />
            )}
          </h3>
        </div>
      </motion.div>

      {/* Players Grid */}
      <div className="flex flex-wrap justify-center gap-4 sm:gap-5 md:gap-6 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent px-2 py-2">
        {players
          .sort((a, b) => {
            // Put current player first
            if (a.name === currentPlayerName) return -1
            if (b.name === currentPlayerName) return 1
            // Then sort by creation time for others
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          })
          .map((player, index) => (
            <PlayerCard
              key={player.id}
              player={player}
              index={index}
              isCurrentPlayer={player.name === currentPlayerName}
              onExitGame={onExitGame}
            />
          ))}
      </div>
    </div>
  )
})
PlayerList.displayName = "PlayerList"

// Tambahkan ini untuk disable SSR pada halaman ini
export const dynamic = "force-dynamic"

export default function WaitContent({ gameCode }: WaitContentProps) {
  const router = useRouter()
  const { clearGame } = useGameStore()
  const { t } = useLanguage()

  const [loading, setLoading] = useState(true)
  const [playerName, setPlayerName] = useState("")
  const [playerAvatar, setPlayerAvatar] = useState("")
  const [gameId, setGameId] = useState<string>("")
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdownValue, setCountdownValue] = useState(0)
  const [shouldRedirect, setShouldRedirect] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [allPlayers, setAllPlayers] = useState<Array<{
    id: string
    name: string
    avatar: string
    created_at: string
  }>>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [isExiting, setIsExiting] = useState(false)
  const [isSupabaseBSession, setIsSupabaseBSession] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("player")
    if (!stored) {

      router.replace("/")
      return
    }

    const { name, avatar } = JSON.parse(stored)
    setPlayerName(name)
    setPlayerAvatar(avatar)

    const fetchGame = async () => {
      // Try Supabase B first (new sessions)
      const sessionFromB = await getGameSessionByPin(gameCode.toUpperCase())

      if (sessionFromB) {
        // Session found in Supabase B
        if (sessionFromB.status === "finish") {
          toast.error("Game has ended. Host has left the session.")
          router.replace("/")
          return
        }

        setGameId(sessionFromB.id)
        setIsSupabaseBSession(true)

        // Check if player exists in Supabase B participant table
        const participants = await getParticipantsByGameId(sessionFromB.id)
        const playerExists = participants.find((p) => p.nickname === name)

        if (!playerExists) {
          toast.error("You are not in this game")
          router.replace("/")
          return
        }

        if (sessionFromB.status === 'active') {
          router.replace(`/play/${gameCode}`)
          return
        }

        // Convert participants to the expected format
        const playersData = participants.map((participant, index) => ({
          id: participant.id || `player-${index}`,
          name: participant.nickname,
          avatar: participant.avatar || '',
          created_at: participant.joined_at || new Date().toISOString()
        }))

        setAllPlayers(playersData)
        setLoading(false)
        return
      }

      // Fallback to main Supabase (legacy sessions)
      const { data, error } = await supabase
        .from("game_sessions")
        .select("id, status, quiz_id, countdown_started_at, participants")
        .eq("game_pin", gameCode.toUpperCase())
        .single()

      if (error || !data) {
        toast.error("Game not found")
        router.replace("/")
        return
      }

      // Check if game is finished or ended (host has left)
      if (data.status === "finished") {
        toast.error("Game has ended. Host has left the session.")
        router.replace("/")
        return
      }

      setGameId(data.id)

      // Check if player still exists in the game (use nickname if available)
      const playerExists = data.participants?.find((p: any) => (getDisplayName(p) === name))

      if (!playerExists) {
        toast.error("You are not in this game")
        router.replace("/")
        return
      }

      if (data.status === 'active' && !data.countdown_started_at) {
        router.replace(`/play/${gameCode}`)
        return
      }

      // Fetch all players from participants JSONB field
      const fetchPlayers = async () => {
        // Players are now stored in the participants JSONB field
        const participants = data.participants || []

        // Convert participants to the expected format
        const playersData = participants.map((participant: any, index: number) => ({
          id: participant.id || `player-${index}`,
          name: getDisplayName(participant),
          avatar: participant.avatar || '',
          created_at: participant.created_at || new Date().toISOString()
        }))

        setAllPlayers(playersData)
      }

      await fetchPlayers()
      setLoading(false)
    }

    fetchGame()

  }, [gameCode, router, gameId, playerName])

  useEffect(() => {
    if (loading || !gameId || !playerName || isRedirecting) return

    let countdownInterval: NodeJS.Timeout | null = null
    let countdownStartedAt: string | null = null

    // Function to run countdown tick
    const runCountdownTick = async () => {
      if (!countdownStartedAt) return

      const start = new Date(countdownStartedAt).getTime()
      const serverTime = await syncServerTime()
      const elapsed = Math.floor((serverTime - start) / 1000)
      const left = Math.max(0, Math.min(10, 10 - elapsed))

      if (left > 0) {
        setCountdownValue(left)
        setShowCountdown(true)
      } else {
        if (countdownInterval) {
          clearInterval(countdownInterval)
          countdownInterval = null
        }
        setIsRedirecting(true)
        router.replace(`/play/${gameCode}`)
      }
    }

    // Start countdown interval
    const startCountdown = (startedAt: string) => {
      countdownStartedAt = startedAt

      // Clear existing interval if any
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }

      // Run immediately
      runCountdownTick()

      // Then run every second
      countdownInterval = setInterval(runCountdownTick, 1000)
    }

    // Listen for real-time game updates (status, participants, countdown)
    // Use Supabase B for new sessions, main Supabase for legacy sessions

    let sessionSubscription: ReturnType<typeof supabase.channel> | null = null
    let participantSubscription: ReturnType<typeof supabaseB.channel> | null = null
    let kickCheckInterval: NodeJS.Timeout | null = null

    if (isSupabaseBSession) {
      // Subscribe to Supabase B sessions table
      sessionSubscription = supabaseB
        .channel(`session-${gameId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${gameId}` },
          async (payload) => {
            const newGameData = payload.new as any

            // 1. Handle Game Status (Finished/Host Left)
            if (newGameData.status === "finish") {
              toast.error("Host has left the game session")
              await cleanupPresence()
              clearGame?.()
              localStorage.removeItem("player")
              router.replace("/")
              return
            }

            // 2. Handle Countdown Start
            if (newGameData.timestamps?.countdown_started_at && newGameData.timestamps.countdown_started_at !== countdownStartedAt) {
              startCountdown(newGameData.timestamps.countdown_started_at)
            }

            // 3. Handle Game Start (direct to play without countdown)
            if (newGameData.status === 'active' && !newGameData.timestamps?.countdown_started_at) {
              setIsRedirecting(true)
              router.replace(`/play/${gameCode}`)
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "sessions", filter: `id=eq.${gameId}` },
          async () => {
            // Session was deleted by host
            console.log("[WAIT] Session deleted by host")
            toast.error("Host has ended the game session")
            await cleanupPresence()
            clearGame?.()
            localStorage.removeItem("player")
            router.replace("/")
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionStatus('disconnected')
          }
        })

      // Subscribe to Supabase B participant table for player updates
      // Handle INSERT, UPDATE separately from DELETE for better detection
      participantSubscription = supabaseB
        .channel(`participants-${gameId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "participant", filter: `game_id=eq.${gameId}` },
          async (payload) => {
            console.log("[WAIT] 📥 Participant INSERT event:", payload)
            // Refresh participants list for new player
            const participants = await getParticipantsByGameId(gameId)
            const playersData = participants.map((participant, index) => ({
              id: participant.id || `player-${index}`,
              name: participant.nickname,
              avatar: participant.avatar || '',
              created_at: participant.joined_at || new Date().toISOString()
            }))
            setAllPlayers(playersData)
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "participant", filter: `game_id=eq.${gameId}` },
          async (payload) => {
            console.log("[WAIT] 🔄 Participant UPDATE event:", payload)
            // Refresh participants list
            const participants = await getParticipantsByGameId(gameId)
            const playersData = participants.map((participant, index) => ({
              id: participant.id || `player-${index}`,
              name: participant.nickname,
              avatar: participant.avatar || '',
              created_at: participant.joined_at || new Date().toISOString()
            }))
            setAllPlayers(playersData)
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "participant", filter: `game_id=eq.${gameId}` },
          async (payload) => {
            console.log("[WAIT] 🗑️ Participant DELETE event:", payload)
            // Check if the deleted participant is the current player
            const deletedParticipant = payload.old as any

            if (deletedParticipant && deletedParticipant.nickname === playerName && !isExiting) {
              console.log("[WAIT] ⚠️ Current player was kicked!")
              toast.error("You have been kicked from the game by the host")
              await cleanupPresence()
              clearGame?.()
              localStorage.removeItem("player")
              router.replace("/")
              return
            }

            // Refresh participants list for other players
            const participants = await getParticipantsByGameId(gameId)
            const playersData = participants.map((participant, index) => ({
              id: participant.id || `player-${index}`,
              name: participant.nickname,
              avatar: participant.avatar || '',
              created_at: participant.joined_at || new Date().toISOString()
            }))
            setAllPlayers(playersData)
          }
        )
        .subscribe((status) => {
          console.log("[WAIT] Participant subscription status:", status)
        })

      // Polling fallback: Check every 3 seconds if player still exists
      // This ensures kick detection even if real-time fails
      kickCheckInterval = setInterval(async () => {
        if (isExiting || isRedirecting) return

        try {
          const participants = await getParticipantsByGameId(gameId)
          const playerStillExists = participants.some((p) => p.nickname === playerName)

          if (!playerStillExists && !isExiting) {
            console.log("[WAIT] 🔍 Polling detected: Player was kicked!")
            clearInterval(kickCheckInterval!)
            toast.error("You have been kicked from the game by the host")
            await cleanupPresence()
            clearGame?.()
            localStorage.removeItem("player")
            router.replace("/")
          }
        } catch (error) {
          console.error("[WAIT] Error in kick check polling:", error)
        }
      }, 3000)

    } else {
      // Legacy: Subscribe to main Supabase game_sessions table
      sessionSubscription = supabase
        .channel(`game-session-${gameId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${gameId}` },
          async (payload) => {
            const newGameData = payload.new

            // 1. Handle Game Status (Finished/Host Left)
            if (newGameData.status === "finished") {
              toast.error("Host has left the game session")
              await cleanupPresence()
              clearGame?.()
              localStorage.removeItem("player")
              router.replace("/")
              return
            }

            // 2. Handle Participants Update
            if (newGameData.participants) {
              const participants = newGameData.participants || []

              // Check if current player was kicked
              const playerStillExists = participants.some((p: any) => getDisplayName(p) === playerName)
              if (!playerStillExists && !isExiting) {
                toast.error("You have been kicked from the game by the host")
                await cleanupPresence()
                clearGame?.()
                localStorage.removeItem("player")
                router.replace("/")
                return
              }

              // Update players list
              const playersData = participants.map((participant: any, index: number) => ({
                id: participant.id || `player-${index}`,
                name: getDisplayName(participant),
                avatar: participant.avatar || '',
                created_at: participant.created_at || new Date().toISOString()
              }))
              setAllPlayers(playersData)
            }

            // 3. Handle Game Start / Countdown
            if (newGameData.status === 'active' && !newGameData.countdown_started_at) {
              setIsRedirecting(true)
              router.replace(`/play/${gameCode}`)
            } else if (newGameData.countdown_started_at && newGameData.countdown_started_at !== countdownStartedAt) {
              // Start countdown when countdown_started_at is set or changed
              startCountdown(newGameData.countdown_started_at)
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "game_sessions", filter: `id=eq.${gameId}` },
          async () => {
            // Session was deleted by host
            console.log("[WAIT] Session deleted by host (legacy)")
            toast.error("Host has ended the game session")
            await cleanupPresence()
            clearGame?.()
            localStorage.removeItem("player")
            router.replace("/")
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionStatus('disconnected')
          }
        })
    }

    // Check initial countdown state on mount (only for legacy sessions)
    const checkInitialCountdown = async () => {
      if (!isSupabaseBSession) {
        const { data } = await supabase
          .from("game_sessions")
          .select("countdown_started_at, status")
          .eq("id", gameId)
          .single()

        if (data?.countdown_started_at) {
          startCountdown(data.countdown_started_at)
        } else if (data?.status === 'active') {
          setIsRedirecting(true)
          router.replace(`/play/${gameCode}`)
        }
      }
    }

    checkInitialCountdown()

    return () => {
      sessionSubscription?.unsubscribe()
      participantSubscription?.unsubscribe()
      if (countdownInterval) clearInterval(countdownInterval)
      if (kickCheckInterval) clearInterval(kickCheckInterval)
    }
  }, [loading, gameId, gameCode, router, isRedirecting, playerName, clearGame, isExiting, isSupabaseBSession])

  const showExitDialog = () => {
    setShowExitConfirm(true)
  }

  const handleExitConfirm = async () => {
    setShowExitConfirm(false)
    setIsExiting(true) // Set exiting state to prevent real-time updates

    // Reset exiting state after 5 seconds as a safety measure
    const exitTimeout = setTimeout(() => {
      setIsExiting(false)
    }, 5000)

    try {
      await cleanupPresence()

      if (gameId && playerName) {
        if (isSupabaseBSession) {
          // Supabase B: Delete participant from participant table
          const participants = await getParticipantsByGameId(gameId)
          const playerToDelete = participants.find((p) => p.nickname === playerName)

          if (playerToDelete) {
            await deleteParticipant(playerToDelete.id)
          }

          toast.success("Left the game successfully")
        } else {
          // Legacy: Update game_sessions participants array
          const { data: gameData, error: gameError } = await supabase
            .from("game_sessions")
            .select("participants")
            .eq("id", gameId)
            .single()

          if (gameError || !gameData) {
            toast.success("Left the game successfully")
            clearGame?.()
            localStorage.removeItem("player")
            router.replace("/")
            return
          }

          // Remove player from participants array
          const participants = gameData.participants || []
          const updatedParticipants = participants.filter((participant: any) =>
            getDisplayName(participant) !== playerName
          )

          // Update game_sessions with new participants array
          const { error: updateError } = await supabase
            .from("game_sessions")
            .update({ participants: updatedParticipants })
            .eq("id", gameId)

          if (updateError) {
            toast.error("Failed to remove player from game")
            return
          }

          toast.success("Left the game successfully")
        }
      }

      clearGame?.()
      localStorage.removeItem("player")

      clearTimeout(exitTimeout) // Clear the timeout since exit was successful
      router.replace("/")
    } catch (error) {
      toast.error("Failed to exit game")
      clearTimeout(exitTimeout) // Clear the timeout
      setIsExiting(false) // Reset exiting state on error
    }
  }

  if (loading)
    return (
      <>
        <Background />
        <div className="relative z-10 min-h-screen flex items-center justify-center font-mono text-white">
          <div className="bg-black/70 border-4 border-white p-6 rounded-lg">
            <p>{t('loadingWait')}</p>
          </div>
        </div>
      </>
    )

  if (showCountdown)
    return (
      <>
        <Background />
        <div className="relative z-10 min-h-screen flex items-center justify-center overflow-hidden">
          {/* Animated stars overlay */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.5, 1.5, 0.5],
                }}
                transition={{
                  duration: Math.random() * 2 + 1.5,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
              />
            ))}
          </div>

          {/* Main countdown container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative z-10"
          >
            {/* Glass card */}
            <div className="relative bg-gradient-to-br from-[#1a1a2e]/90 via-[#16213e]/90 to-[#0f0f23]/90 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 sm:p-12 md:p-16 shadow-2xl shadow-purple-900/40">
              {/* Gradient border lines */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
              <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent" />
              <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-purple-400/30 to-transparent" />

              {/* Corner glows */}
              <div className="absolute -top-4 -left-4 w-20 h-20 bg-cyan-500/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-purple-500/20 rounded-full blur-2xl" />

              {/* Content */}
              <div className="relative z-10 text-center">
                {/* Title with gradient */}
                <motion.h2
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8"
                >
                  <span className="bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                    {t('gameStartingWait')}
                  </span>
                </motion.h2>

                {/* Countdown number with orbital rings */}
                <div className="relative w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 mx-auto">
                  {/* Outer orbital ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-2 border-cyan-500/30"
                  >
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/60" />
                  </motion.div>

                  {/* Middle orbital ring */}
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-4 sm:inset-5 rounded-full border-2 border-purple-500/40"
                  >
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-purple-400 rounded-full shadow-lg shadow-purple-400/60" />
                  </motion.div>

                  {/* Inner glow circle */}
                  <motion.div
                    animate={{ scale: [1, 1.05, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute inset-8 sm:inset-10 rounded-full bg-gradient-to-br from-purple-600/30 via-indigo-600/20 to-cyan-600/30 backdrop-blur-sm"
                  />

                  {/* Countdown number */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.span
                      key={countdownValue}
                      initial={{ scale: 1.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
                      className="text-7xl sm:text-8xl md:text-9xl font-black bg-gradient-to-b from-yellow-300 via-orange-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-2xl"
                      style={{
                        textShadow: "0 0 40px rgba(251, 191, 36, 0.5), 0 0 80px rgba(251, 191, 36, 0.3)",
                        WebkitTextStroke: "1px rgba(251, 191, 36, 0.3)",
                      }}
                    >
                      {countdownValue}
                    </motion.span>
                  </div>
                </div>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 sm:mt-8 text-gray-400 text-sm sm:text-base font-medium"
                >
                  {t('getReadyIn')} {countdownValue} {t('seconds')}...
                </motion.p>
              </div>
            </div>
          </motion.div>
        </div>
      </>
    )

  return (
    <>
      <Background />
      <div className="relative z-10 min-h-screen font-mono text-white p-3 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="text-center mb-6 sm:mb-8 pt-4 sm:pt-6"
          >
            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <span className="bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent drop-shadow-2xl">
                {t('getReady')}
              </span>
            </motion.h1>
          </motion.div>

          {/* Players List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center"
          >
            <PlayerList
              players={allPlayers}
              currentPlayerName={playerName}
              onExitGame={showExitDialog}
              isUpdating={isUpdating}
              t={t}
            />
          </motion.div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowExitConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative mx-4 w-full max-w-sm sm:max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Main Card */}
              <div className="relative bg-gradient-to-br from-[#1a1a2e]/95 via-[#16213e]/95 to-[#0f0f23]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-orange-900/20">

                {/* Floating stars background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: [0, 0.8, 0],
                        scale: [0.5, 1.2, 0.5],
                      }}
                      transition={{
                        duration: Math.random() * 2 + 2,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                      }}
                      className="absolute w-1 h-1 bg-white rounded-full"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                      }}
                    />
                  ))}
                </div>

                {/* Gradient overlay lines */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-400/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent" />
                </div>

                {/* Content */}
                <div className="relative z-10 p-6 sm:p-8">
                  {/* Close button */}
                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">{t('cancel')}</span>
                  </button>

                  <div className="mb-6">
                    {/* Cosmic Icon with orbital rings */}
                    <div className="mb-5 flex justify-center">
                      <div className="relative w-20 h-20">
                        {/* Outer ring */}
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 rounded-full border border-orange-500/30"
                        >
                          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50" />
                        </motion.div>

                        {/* Middle ring */}
                        <motion.div
                          animate={{ rotate: -360 }}
                          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-2 rounded-full border border-yellow-500/40"
                        >
                          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50" />
                        </motion.div>

                        {/* Center icon */}
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-4 rounded-full bg-gradient-to-br from-orange-500 to-yellow-600 shadow-xl shadow-orange-500/40 flex items-center justify-center"
                        >
                          <LogOut className="w-6 h-6 text-white" />
                        </motion.div>
                      </div>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold text-center">
                      <span className="bg-gradient-to-r from-orange-300 via-yellow-300 to-orange-300 bg-clip-text text-transparent">
                        {t('exitGameQuestionWait')}
                      </span>
                    </h2>
                  </div>

                  <div className="space-y-6">
                    {/* Warning Message */}
                    <div className="text-center px-2">
                      <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                        {t('exitGameWarningWait')} {t('youWillNeedToJoinAgain')}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Cancel Button */}
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1"
                      >
                        <Button
                          onClick={() => setShowExitConfirm(false)}
                          variant="outline"
                          className="w-full h-11 sm:h-12 bg-white/5 backdrop-blur-lg border-white/20 text-white hover:bg-white/15 hover:border-white/30 transition-all duration-300 rounded-xl font-medium"
                        >
                          <Sparkles className="w-4 h-4 mr-2 text-cyan-400" />
                          {t('cancel')}
                        </Button>
                      </motion.div>

                      {/* Exit Button */}
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1"
                      >
                        <Button
                          onClick={handleExitConfirm}
                          className="w-full h-11 sm:h-12 bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 hover:from-orange-500 hover:via-red-500 hover:to-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden group"
                        >
                          {/* Shimmer effect */}
                          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                          <Rocket className="w-4 h-4 group-hover:-rotate-45 transition-transform duration-300" />
                          <span className="relative z-10">{t('exitGame')}</span>
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
