/* eslint-disable @next/next/no-img-element */
"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useGameStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"
import { cleanupPresence } from "@/lib/presence"
import { syncServerTime } from "@/lib/server-time"
import { toast } from "sonner"
import { getFirstName, formatDisplayName } from "@/lib/utils"
import { LogOut } from "lucide-react"
import React from "react"
import { useLanguage } from "@/contexts/language-context"
import type { TranslationKey } from "@/lib/locales/translations"

interface WaitContentProps {
  gameCode: string
}

function Background() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-[url('/images/space_bg.jpg')]"
        style={{ backgroundSize: "cover", imageRendering: "pixelated" }}
      />
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
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className={`relative rounded-lg p-3 sm:p-4 md:p-5 w-full max-w-[160px] sm:max-w-[180px] md:max-w-[200px] lg:max-w-[220px] xl:max-w-[240px] transition-all duration-300 player-card-mobile ${
        isCurrentPlayer 
          ? 'bg-gradient-to-br from-blue-900/90 to-purple-900/90 border-2 border-green-400 shadow-[0_0_25px_rgba(34,197,94,0.6)] hover:shadow-[0_0_30px_rgba(34,197,94,0.8)]' 
          : 'bg-black/90 border-2 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)]'
      }`}
    >
      {/* Player Name */}
      <div className="text-center mb-2 sm:mb-3">
        <h4 className="text-white font-bold text-sm sm:text-base md:text-lg lg:text-xl drop-shadow-[2px_2px_0px_#000] flex items-center justify-center gap-1">
          <SmartNameDisplay 
            name={player.name} 
            maxLength={12}
            className="text-white"
            multilineClassName="text-white"
          />
          {isCurrentPlayer && (
            <span className="text-green-400 text-xs sm:text-sm font-bold bg-green-400/20 px-2 py-1 rounded-full border border-green-400/30">
              YOU
            </span>
          )}
        </h4>
      </div>


      {/* Avatar */}
      <div className="flex justify-center mb-2 sm:mb-3">
        <motion.img
          src={player.avatar}
          alt={getFirstName(player.name)}
          className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 rounded-full object-cover border-2 shadow-[0_0_10px_rgba(59,130,246,0.4)] ${
            isCurrentPlayer 
              ? 'border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.6)]' 
              : 'border-blue-400'
          }`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
        />
      </div>

      {/* Action Button */}
      {isCurrentPlayer ? (
        <div className="flex justify-center">
          <button
            onClick={onExitGame}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 sm:p-2.5 md:p-3 rounded-lg font-bold transition-all duration-200 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.4)] hover:shadow-[0_0_15px_rgba(59,130,246,0.6)] clickable min-h-[44px] min-w-[44px]"
            title="Exit Game"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      ) : (
        <div className="flex justify-center">
          <span className="text-gray-400 text-xs sm:text-sm md:text-base font-medium">Waiting...</span>
        </div>
      )}
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
      {/* Player Count */}
      <div className="text-center mb-6 sm:mb-7 md:mb-8">
        <h3 className="text-white text-lg sm:text-xl md:text-2xl font-bold drop-shadow-[2px_2px_0px_#000] flex items-center justify-center gap-3">
          {t('players')} ({players.length})
          {isUpdating && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-blue-400 border-t-transparent rounded-full"
            />
          )}
        </h3>
      </div>
{/* iwak */}
      {/* Players Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 md:gap-6 max-h-[70vh] sm:max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500/30 scrollbar-track-transparent pr-2 sm:pr-3 scroll-container mobile-grid">
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

  useEffect(() => {
    const stored = localStorage.getItem("player")
    if (!stored) {
      console.log("[WAIT] No player data found, redirecting to home")
      router.replace("/")
      return
    }

    const { name, avatar } = JSON.parse(stored)
    setPlayerName(name)
    setPlayerAvatar(avatar)

    const fetchGame = async () => {
      console.log("[WAIT] Fetching game data for code:", gameCode)
      const { data, error } = await supabase
        .from("games")
        .select("id, is_started, quiz_id, countdown_start_at, finished, status")
        .eq("code", gameCode.toUpperCase())
        .single()

      if (error || !data) {
        console.log("[WAIT] Game not found, redirecting to home")
        toast.error("Game not found")
        router.replace("/")
        return
      }

      // Check if game is finished or ended (host has left)
      if (data.finished === true || data.status === "finished") {
        console.log("[WAIT] Game has ended, host has left the session")
        toast.error("Game has ended. Host has left the session.")
        router.replace("/")
        return
      }

      console.log("[WAIT] Game found:", data)
      setGameId(data.id)

      // Check if player still exists in the game
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("id, name")
        .eq("game_id", data.id)
        .eq("name", name)
        .single()

      if (playerError || !playerData) {
        console.log("[WAIT] Player not found in game, redirecting to home")
        toast.error("You are not in this game")
        router.replace("/")
        return
      }

      if (data.is_started && !data.countdown_start_at) {
        console.log("[WAIT] Game already started, redirecting to play")
        router.replace(`/play/${gameCode}`)
        return
      }

      // Fetch all players in the game
      const fetchPlayers = async () => {
        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("id, name, avatar, created_at")
          .eq("game_id", data.id)
          .order("created_at", { ascending: true })

        if (playersError) {
          console.error("Error fetching players:", playersError)
        } else {
          setAllPlayers(playersData || [])
        }
      }

      await fetchPlayers()
      setLoading(false)
    }

    fetchGame()

    // Fallback refresh every 5 seconds to ensure sync
    const fallbackInterval = setInterval(async () => {
      if (!gameId || !playerName) return
      
      try {
        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("id, name, avatar, created_at")
          .eq("game_id", gameId)
          .order("created_at", { ascending: true })

        if (!playersError && playersData) {
          setAllPlayers(playersData)
        }
      } catch (error) {
        console.error("[WAIT] Fallback refresh error:", error)
      }
    }, 5000)

    return () => {
      clearInterval(fallbackInterval)
    }
  }, [gameCode, router, gameId, playerName])

  useEffect(() => {
    if (loading || !gameId || !playerName || isRedirecting) return

    console.log("[PLAYER] 🎧 Setting up kick listener for player:", playerName, "in game:", gameId)

    // Listen for real-time game status changes
    const gameStatusSubscription = supabase
      .channel(`game-status-${gameId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        async (payload) => {
          console.log("[GAME] Game status updated:", payload.new)
          const updatedGame = payload.new
          
          // If game is finished (host left), redirect player
          if (updatedGame.finished === true || updatedGame.status === "finished") {
            console.log("[GAME] Host has left the session, redirecting player")
            toast.error("Host has left the game session")
            
            // Clean up and redirect
            await cleanupPresence()
            clearGame?.()
            localStorage.removeItem("player")
            router.replace("/")
            return
          }
        }
      )
      .subscribe()

    // Listen for real-time player changes (add/delete)
    const playersSubscription = supabase
      .channel(`players-${gameId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "players", filter: `game_id=eq.${gameId}` },
        async (payload) => {
          console.log("[PLAYER] 🟢 New player joined:", payload.new)
          const newPlayer = payload.new
          
          // Show updating indicator
          setIsUpdating(true)
          
          // Add new player to the list
          setAllPlayers(prev => [...prev, {
            id: newPlayer.id,
            name: newPlayer.name,
            avatar: newPlayer.avatar,
            created_at: newPlayer.created_at
          }])
          
          // Show notification for new player (only if it's not the current player)
          if (newPlayer.name !== playerName) {
            toast.success(`${newPlayer.name} joined the game!`, {
              duration: 3000,
              position: "top-center"
            })
          }
          
          // Hide updating indicator after a short delay
          setTimeout(() => setIsUpdating(false), 1000)
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "players", filter: `game_id=eq.${gameId}` },
        async (payload) => {
          console.log("[PLAYER] 🔴 Player deleted:", payload.old)
          console.log("[PLAYER] 🔍 Current player name:", playerName)
          console.log("[PLAYER] 🔍 Deleted player name:", payload.old.name)
          console.log("[PLAYER] 🔍 Is exiting:", isExiting)
          const deletedPlayer = payload.old
          
          // If current player is exiting voluntarily, don't process their own deletion
          if (isExiting && deletedPlayer.name === playerName) {
            console.log("[PLAYER] ℹ️ Current player is exiting voluntarily, ignoring their own deletion")
            return
          }
          
          // Show updating indicator
          setIsUpdating(true)
          
          // Update players list immediately
          setAllPlayers(prev => {
            const filtered = prev.filter(p => p.id !== deletedPlayer.id)
            console.log(`[PLAYER] 🗑️ Removed player "${deletedPlayer.name}" from list. Remaining:`, filtered.length)
            return filtered
          })
          
          // Check if the deleted player is the current player
          if (deletedPlayer.name === playerName) {
            console.log("[PLAYER] 🦵 Current player was kicked by host - REDIRECTING")
            toast.error("You have been kicked from the game by the host")
            
            // Clean up and redirect
            await cleanupPresence()
            clearGame?.()
            localStorage.removeItem("player")
            router.replace("/")
            return
          } else {
            console.log("[PLAYER] ℹ️ Another player was deleted, not current player")
            // Show notification for player leaving (only if it's not the current player)
            toast.info(`${deletedPlayer.name} left the game`, {
              duration: 3000,
              position: "top-center"
            })
          }
          
          // Force refresh to ensure consistency
          setTimeout(async () => {
            try {
              const { data: playersData, error: playersError } = await supabase
                .from("players")
                .select("id, name, avatar, created_at")
                .eq("game_id", gameId)
                .order("created_at", { ascending: true })

              if (!playersError && playersData) {
                setAllPlayers(playersData)
                console.log("[PLAYER] 🔄 Refreshed player list after deletion")
              }
            } catch (error) {
              console.error("[PLAYER] ❌ Error refreshing player list:", error)
            }
            setIsUpdating(false)
          }, 1000)
        },
      )
      .subscribe((status) => {
        console.log("[PLAYER] 📡 Subscription status:", status)
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('disconnected')
        }
      })

    // Fallback: Check if player still exists in database every 2 seconds
    const playerCheckInterval = setInterval(async () => {
      if (!gameId || !playerName || isRedirecting) return
      
      try {
        const { data, error } = await supabase
          .from("players")
          .select("id, name")
          .eq("game_id", gameId)
          .eq("name", playerName)
          .single()

        if (error || !data) {
          console.log("[PLAYER] 🔍 Player not found in database - might have been kicked")
          console.log("[PLAYER] 🦵 Redirecting to home page")
          toast.error("You have been kicked from the game by the host")
          
          await cleanupPresence()
          clearGame?.()
          localStorage.removeItem("player")
          router.replace("/")
          return
        }
      } catch (checkError) {
        console.error("[PLAYER] ❌ Error checking player existence:", checkError)
      }
    }, 2000)

    const tick = async () => {
      try {
        const { data, error } = await supabase
          .from("games")
          .select("countdown_start_at, is_started")
          .eq("id", gameId)
          .single()

        if (!data) return

        if (data.countdown_start_at) {
          const start = new Date(data.countdown_start_at).getTime()

          let serverTime: number
          try {
            serverTime = await syncServerTime()
          } catch (error) {
            console.warn("[v0] Server time sync failed, using client time:", error)
            serverTime = Date.now()
          }

          const elapsed = Math.floor((serverTime - start) / 1000)

          if (elapsed >= 10) {
            console.log("[v0] Countdown finished, redirecting to play")
            setIsRedirecting(true)
            router.replace(`/play/${gameCode}`)
            return
          }

          const left = Math.max(0, Math.min(10, 10 - elapsed))

          console.log(
            "[v0] Player countdown sync - Server time:",
            new Date(serverTime).toISOString(),
            "Start:",
            new Date(start).toISOString(),
            "Elapsed:",
            elapsed,
            "Left:",
            left,
          )

          if (left >= 0 && left <= 10) {
            setCountdownValue(left)
            setShowCountdown(true)
          }

          if (left === 0) {
            console.log("[v0] Countdown reached 0, redirecting immediately")
            setIsRedirecting(true)
            router.replace(`/play/${gameCode}`)
          }
        } else if (data.is_started) {
          console.log("[v0] Game already started, redirecting")
          setIsRedirecting(true)
          router.replace(`/play/${gameCode}`)
        }
      } catch (error) {
        console.error("[v0] Error in countdown tick:", error)

        try {
          const { data } = await supabase
            .from("games")
            .select("countdown_start_at, is_started")
            .eq("id", gameId)
            .single()

          if (data?.is_started) {
            console.log("[v0] Fallback: game started, redirecting")
            setIsRedirecting(true)
            router.replace(`/play/${gameCode}`)
          } else if (data?.countdown_start_at) {
            const start = new Date(data.countdown_start_at).getTime()
            const elapsed = Math.floor((Date.now() - start) / 1000)

            if (elapsed >= 10) {
              console.log("[v0] Fallback: countdown finished, redirecting")
              setIsRedirecting(true)
              router.replace(`/play/${gameCode}`)
            }
          }
        } catch (fallbackError) {
          console.error("[v0] Fallback countdown also failed:", fallbackError)
        }
      }
    }

    tick()
    const iv = setInterval(tick, 200)
    return () => {
      clearInterval(iv)
      clearInterval(playerCheckInterval)
      playersSubscription.unsubscribe()
      gameStatusSubscription.unsubscribe()
    }
  }, [loading, gameId, gameCode, router, isRedirecting, playerName, clearGame])

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
      console.log("[v0] Starting exit process for player:", playerName, "in game:", gameId)

      await cleanupPresence()

      if (gameId && playerName) {
        console.log("[v0] Deleting player from database...")

        // First, find the player to get their ID for more reliable deletion
        const { data: playerToDelete, error: findError } = await supabase
          .from("players")
          .select("id, name")
          .eq("game_id", gameId)
          .eq("name", playerName)
          .single()

        if (findError) {
          console.error("[v0] Error finding player to delete:", findError)
          // If player not found, they might have already been deleted
          console.log("[v0] Player not found, might already be deleted")
          toast.success("Left the game successfully")
          clearGame?.()
          localStorage.removeItem("player")
          router.replace("/")
          return
        } else {
          console.log("[v0] Found player to delete:", playerToDelete)
          
          // Delete using both ID and name for maximum reliability
          const { error: deleteError, data: deletedData } = await supabase
            .from("players")
            .delete()
            .eq("id", playerToDelete.id)
            .eq("game_id", gameId)
            .select()

          if (deleteError) {
            console.error("[PLAYER] ❌ Error removing player by ID:", deleteError)
            toast.error("Failed to remove player from game")
            return
          } else {
            console.log("[PLAYER] ✅ Player successfully deleted from database:", deletedData)
            console.log("[PLAYER] 📡 Broadcasting deletion event for player ID:", playerToDelete.id)
          }
        }

        // Wait a moment for real-time updates to propagate
        await new Promise(resolve => setTimeout(resolve, 300))

        // Verify deletion was successful
        const { data: verifyData, error: verifyError } = await supabase
          .from("players")
          .select("id, name")
          .eq("game_id", gameId)
          .eq("name", playerName)

        if (verifyError) {
          console.log("[v0] Verification query failed (this might be normal):", verifyError)
        } else if (verifyData && verifyData.length > 0) {
          console.warn("[v0] Player still exists after deletion, attempting final cleanup:", verifyData)
          // Final cleanup attempt
          await supabase
            .from("players")
            .delete()
            .eq("game_id", gameId)
            .eq("name", playerName)
        } else {
          console.log("[v0] Player successfully removed from database")
        }

        // No need to trigger host notification - real-time subscriptions handle this automatically

        toast.success("Left the game successfully")
      }

      clearGame?.()
      localStorage.removeItem("player")

      console.log("[v0] Redirecting to home page...")
      clearTimeout(exitTimeout) // Clear the timeout since exit was successful
      router.replace("/")
    } catch (error) {
      console.error("[v0] Error exiting game:", error)
      toast.error("Failed to exit game")
      clearTimeout(exitTimeout) // Clear the timeout
      setIsExiting(false) // Reset exiting state on error
    }
  }
// ikan
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
        <div className="relative z-10 min-h-screen flex items-center justify-center font-mono text-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black/80 border-4 border-white p-12 rounded-lg text-center"
          >
            <p className="text-3xl mb-6 font-bold">{t('gameStartingWait')}</p>
            <motion.div
              key={countdownValue}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="text-9xl font-bold text-yellow-300"
              style={{ textShadow: "4px 4px 0px #000" }}
            >
              {countdownValue}
            </motion.div>
            <p className="text-lg mt-4 opacity-80">{t('getReadyIn')} {countdownValue} {t('seconds')}...</p>
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
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-14"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold drop-shadow-[2px_2px_0px_#000] mb-3 sm:mb-4">
              {t('getReady')}
            </h1>
            <div className="text-lg sm:text-xl md:text-2xl text-white/90 flex items-center justify-center gap-2">
              {t('waitingHostToStart')}
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                className="text-2xl"
              >
                ...
              </motion.span>
            </div>
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
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-black/90 border-4 border-white font-mono text-white p-6 rounded-lg shadow-[8px_8px_0px_#000] max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h2 className="text-xl mb-4 font-bold">{t('exitGameQuestionWait')}</h2>
                <p className="text-sm mb-6 text-white/80">
                  {t('exitGameWarningWait')} {t('youWillNeedToJoinAgain')}
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="bg-gray-500 hover:bg-gray-600 border-2 border-gray-700 px-6 py-3 rounded-lg text-white font-bold shadow-[4px_4px_0px_#000] text-base clickable min-h-[48px]"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleExitConfirm}
                    className="bg-red-500 hover:bg-red-600 border-2 border-red-700 px-6 py-3 rounded-lg text-white font-bold shadow-[4px_4px_0px_#000] text-base clickable min-h-[48px]"
                  >
                    {t('exitGame')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
