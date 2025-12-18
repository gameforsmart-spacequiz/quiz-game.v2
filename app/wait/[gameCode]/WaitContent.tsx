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
import { getDisplayName } from "@/lib/player-name"
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
      className={`relative rounded-lg p-3 sm:p-4 md:p-5 w-full max-w-[160px] sm:max-w-[180px] md:max-w-[200px] lg:max-w-[220px] xl:max-w-[240px] transition-all duration-300 player-card-mobile ${isCurrentPlayer
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
          className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 rounded-full object-cover border-2 shadow-[0_0_10px_rgba(59,130,246,0.4)] ${isCurrentPlayer
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

      router.replace("/")
      return
    }

    const { name, avatar } = JSON.parse(stored)
    setPlayerName(name)
    setPlayerAvatar(avatar)

    const fetchGame = async () => {

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
    const gameSubscription = supabase
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('disconnected')
        }
      })

    // Check initial countdown state on mount
    const checkInitialCountdown = async () => {
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

    checkInitialCountdown()

    return () => {
      gameSubscription.unsubscribe()
      if (countdownInterval) clearInterval(countdownInterval)
    }
  }, [loading, gameId, gameCode, router, isRedirecting, playerName, clearGame, isExiting])

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


        // Get current game data
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
        } else {

        }

        // Wait a moment for real-time updates to propagate
        await new Promise(resolve => setTimeout(resolve, 300))

        // Verify deletion was successful
        const { data: verifyGameData, error: verifyError } = await supabase
          .from("game_sessions")
          .select("participants")
          .eq("id", gameId)
          .single()

        if (verifyError) {

        } else if (verifyGameData) {
          const participants = verifyGameData.participants || []
          const playerStillExists = participants.some((participant: any) =>
            getDisplayName(participant) === playerName
          )

          if (playerStillExists) {

            // Final cleanup attempt - remove player again
            const finalParticipants = participants.filter((participant: any) =>
              getDisplayName(participant) !== playerName
            )
            await supabase
              .from("game_sessions")
              .update({ participants: finalParticipants })
              .eq("id", gameId)
          } else {

          }
        }

        // No need to trigger host notification - real-time subscriptions handle this automatically

        toast.success("Left the game successfully")
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
