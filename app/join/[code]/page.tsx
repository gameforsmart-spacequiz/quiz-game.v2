"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion } from "framer-motion"
import { Loader2, Rocket, AlertCircle, UserPlus } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useGameStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"
import { getGameSessionByPin } from "@/lib/sessions-api"
import { createParticipant, getParticipantsByGameId } from "@/lib/participants-api"
import { generateXID } from "@/lib/id-generator"

// Default animal avatars for fallback
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

type JoinStatus = "loading" | "joining" | "success" | "error" | "no-profile"

export default function JoinCodePage() {
    const router = useRouter()
    const params = useParams()
    const code = (params.code as string)?.toUpperCase()
    const { user, profile, loading: authLoading } = useAuth()
    const { setPlayer, setGameCode, setGameId, setQuizId, setIsHost } = useGameStore()

    const [status, setStatus] = useState<JoinStatus>("loading")
    const [errorMessage, setErrorMessage] = useState<string>("")
    const [statusMessage, setStatusMessage] = useState<string>("Initializing...")
    const hasAttemptedJoin = useRef(false)

    useEffect(() => {
        const attemptAutoJoin = async () => {
            // Prevent multiple attempts
            if (hasAttemptedJoin.current) return

            // Validate game code format
            if (!code || code.length !== 6 || !/^[A-Z0-9]{6}$/.test(code)) {
                setStatus("error")
                setErrorMessage("Invalid game code format")
                return
            }

            // Wait for auth to complete loading
            if (authLoading) {
                setStatusMessage("Checking authentication...")
                return
            }

            // Check if user is logged in with profile
            if (!user || !profile) {
                // User not logged in - redirect to home with code
                // so they can login and join manually
                setStatus("no-profile")
                setStatusMessage("Please login to join the game")
                setTimeout(() => {
                    router.replace(`/?code=${code}`)
                }, 1500)
                return
            }

            hasAttemptedJoin.current = true
            setStatus("joining")
            setStatusMessage("Finding game session...")

            try {
                // Get display name and avatar from profile
                const displayName = profile.nickname || profile.fullname || profile.username || "Player"
                const rawAvatarUrl = profile.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture
                const avatarUrl = rawAvatarUrl
                    ? `https://images.weserv.nl/?url=${encodeURIComponent(rawAvatarUrl)}&w=256&h=256&fit=cover&n=-1`
                    : ANIMAL_AVATARS[Math.floor(Math.random() * ANIMAL_AVATARS.length)]

                // Try Supabase B first (new sessions)
                const sessionFromB = await getGameSessionByPin(code)

                if (sessionFromB) {
                    setStatusMessage("Game found! Joining...")

                    // Check game status
                    if (sessionFromB.status === "finish") {
                        setStatus("error")
                        setErrorMessage("Game has ended")
                        return
                    }

                    if (sessionFromB.status !== "waiting") {
                        setStatus("error")
                        setErrorMessage("Game has already started")
                        return
                    }

                    // Check if player nickname already exists
                    const existingParticipants = await getParticipantsByGameId(sessionFromB.id)
                    const existingPlayer = existingParticipants.find((p) => p.nickname === displayName)

                    if (existingPlayer) {
                        // Player already in game - just redirect to waiting room
                        setStatusMessage("Already joined! Redirecting...")
                        setPlayer(existingPlayer.id, displayName, existingPlayer.avatar || avatarUrl)
                        setGameCode(code)
                        setGameId(sessionFromB.id)
                        setQuizId(sessionFromB.quiz_id)
                        setIsHost(false)

                        localStorage.setItem(
                            "player",
                            JSON.stringify({
                                id: existingPlayer.id,
                                name: displayName,
                                avatar: existingPlayer.avatar || avatarUrl,
                            })
                        )

                        setStatus("success")
                        setTimeout(() => {
                            router.replace(`/wait/${code}`)
                        }, 500)
                        return
                    }

                    // Create new participant
                    setStatusMessage("Creating player...")
                    const playerId = generateXID()

                    const newParticipant = await createParticipant({
                        id: playerId,
                        game_id: sessionFromB.id,
                        user_id: profile.id || null,
                        nickname: displayName,
                        avatar: avatarUrl,
                        score: 0
                    })

                    if (!newParticipant) {
                        setStatus("error")
                        setErrorMessage("Failed to join game. Please try again.")
                        return
                    }

                    setPlayer(playerId, displayName, avatarUrl)
                    setGameCode(code)
                    setGameId(sessionFromB.id)
                    setQuizId(sessionFromB.quiz_id)
                    setIsHost(false)

                    localStorage.setItem(
                        "player",
                        JSON.stringify({
                            id: playerId,
                            name: displayName,
                            avatar: avatarUrl,
                        })
                    )

                    setStatus("success")
                    setStatusMessage("Joined successfully!")
                    setTimeout(() => {
                        router.replace(`/wait/${code}`)
                    }, 500)
                    return
                }

                // Fallback to main Supabase (legacy sessions)
                setStatusMessage("Checking legacy sessions...")
                const { data: game, error: gameError } = await supabase
                    .from("game_sessions")
                    .select("*")
                    .eq("game_pin", code)
                    .single()

                if (gameError || !game) {
                    setStatus("error")
                    setErrorMessage("Game not found")
                    return
                }

                if (game.status === "finished") {
                    setStatus("error")
                    setErrorMessage("Game has ended")
                    return
                }

                if (game.status !== "waiting") {
                    setStatus("error")
                    setErrorMessage("Game has already started")
                    return
                }

                // Check if player already exists in legacy game
                const existingLegacyPlayer = game.participants?.find((p: any) => (p.nickname ?? p.name) === displayName)

                if (existingLegacyPlayer) {
                    // Player already in game - just redirect
                    setStatusMessage("Already joined! Redirecting...")
                    setPlayer(existingLegacyPlayer.id, displayName, existingLegacyPlayer.avatar || avatarUrl)
                    setGameCode(code)
                    setGameId(game.id)
                    setQuizId(game.quiz_id)
                    setIsHost(false)

                    localStorage.setItem(
                        "player",
                        JSON.stringify({
                            id: existingLegacyPlayer.id,
                            name: displayName,
                            avatar: existingLegacyPlayer.avatar || avatarUrl,
                        })
                    )

                    setStatus("success")
                    setTimeout(() => {
                        router.replace(`/wait/${code}`)
                    }, 500)
                    return
                }

                // Add player to legacy game
                setStatusMessage("Joining game...")
                const playerId = generateXID()

                const newParticipant = {
                    id: playerId,
                    user_id: profile.id || null,
                    nickname: displayName,
                    avatar: avatarUrl,
                    score: 0,
                    joined_at: new Date().toISOString()
                }

                const updatedParticipants = [...(game.participants || []), newParticipant]

                await supabase
                    .from("game_sessions")
                    .update({ participants: updatedParticipants })
                    .eq("id", game.id)

                setPlayer(playerId, displayName, avatarUrl)
                setGameCode(code)
                setGameId(game.id)
                setQuizId(game.quiz_id)
                setIsHost(false)

                localStorage.setItem(
                    "player",
                    JSON.stringify({
                        id: playerId,
                        name: displayName,
                        avatar: avatarUrl,
                    })
                )

                setStatus("success")
                setStatusMessage("Joined successfully!")
                setTimeout(() => {
                    router.replace(`/wait/${code}`)
                }, 500)

            } catch (error) {
                console.error("[AutoJoin] Error:", error)
                setStatus("error")
                setErrorMessage("An unexpected error occurred. Please try again.")
            }
        }

        attemptAutoJoin()
    }, [code, user, profile, authLoading, router, setPlayer, setGameCode, setGameId, setQuizId, setIsHost])

    const handleRetry = () => {
        hasAttemptedJoin.current = false
        setStatus("loading")
        setErrorMessage("")
        setStatusMessage("Retrying...")
    }

    const handleManualJoin = () => {
        router.replace(`/?code=${code}`)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
            {/* Background effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-cyan-600/10" />
                <div className="absolute inset-0 bg-gradient-to-tr from-pink-600/5 via-transparent to-blue-600/5" />
                {/* Floating stars */}
                {[...Array(12)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full"
                        style={{
                            left: `${10 + (i * 8)}%`,
                            top: `${5 + (i * 7) % 90}%`,
                        }}
                        animate={{
                            opacity: [0.2, 0.8, 0.2],
                            scale: [0.8, 1.3, 0.8],
                        }}
                        transition={{
                            duration: 2 + (i * 0.2),
                            repeat: Infinity,
                            delay: i * 0.3,
                        }}
                    />
                ))}
            </div>

            {/* Main content card */}
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="relative z-10 bg-gradient-to-br from-slate-900/95 via-indigo-950/95 to-slate-900/95 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl max-w-md w-full text-center"
            >
                {/* Status icon */}
                <motion.div
                    className="mb-6"
                    animate={status === "joining" || status === "loading" ? { rotate: 360 } : {}}
                    transition={status === "joining" || status === "loading" ? { duration: 2, repeat: Infinity, ease: "linear" } : {}}
                >
                    {(status === "loading" || status === "joining") && (
                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-full flex items-center justify-center border border-purple-400/30">
                            <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                        </div>
                    )}
                    {status === "success" && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-full flex items-center justify-center border border-green-400/30"
                        >
                            <Rocket className="w-10 h-10 text-green-400" />
                        </motion.div>
                    )}
                    {status === "error" && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-20 h-20 mx-auto bg-gradient-to-br from-red-500/30 to-pink-500/30 rounded-full flex items-center justify-center border border-red-400/30"
                        >
                            <AlertCircle className="w-10 h-10 text-red-400" />
                        </motion.div>
                    )}
                    {status === "no-profile" && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-500/30 to-orange-500/30 rounded-full flex items-center justify-center border border-amber-400/30"
                        >
                            <UserPlus className="w-10 h-10 text-amber-400" />
                        </motion.div>
                    )}
                </motion.div>

                {/* Game code display */}
                <div className="mb-4">
                    <span className="text-white/60 text-sm">Game Code</span>
                    <div className="font-mono text-3xl font-bold text-white tracking-wider">
                        {code || "------"}
                    </div>
                </div>

                {/* Status message */}
                <motion.p
                    key={statusMessage}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-lg mb-6 ${status === "error" ? "text-red-400" :
                        status === "success" ? "text-green-400" :
                            status === "no-profile" ? "text-amber-400" :
                                "text-white/80"
                        }`}
                >
                    {status === "error" ? errorMessage : statusMessage}
                </motion.p>

                {/* Action buttons */}
                {status === "error" && (
                    <div className="flex flex-col gap-3">
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={handleRetry}
                            className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg"
                        >
                            Try Again
                        </motion.button>
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            onClick={handleManualJoin}
                            className="w-full py-3 px-6 bg-white/10 text-white/80 font-medium rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/20"
                        >
                            Join Manually
                        </motion.button>
                    </div>
                )}

                {/* Loading dots animation */}
                {(status === "loading" || status === "joining") && (
                    <div className="flex justify-center gap-1">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="w-2 h-2 rounded-full bg-purple-400"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                }}
                            />
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    )
}
