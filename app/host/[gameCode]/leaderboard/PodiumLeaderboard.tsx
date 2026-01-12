"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Home, RotateCw } from "lucide-react"
import Image from "next/image"
import { getFirstName } from "@/lib/utils"
import { SmartNameDisplay } from "./SmartNameDisplay"
import { StableScoreDisplay } from "./StableScoreDisplay"
import type { PlayerProgress, PodiumLeaderboardProps } from "./types"

// Helper function to compare player data
const arePlayersEqual = (prev: PlayerProgress[], next: PlayerProgress[]): boolean => {
    if (prev.length !== next.length) return false
    return prev.every((player, idx) => {
        const nextPlayer = next[idx]
        return player.id === nextPlayer.id &&
            player.score === nextPlayer.score &&
            player.name === nextPlayer.name
    })
}

// === MAGNIFICENT PODIUM LEADERBOARD ===
const PodiumLeaderboardInner = ({ players, onAnimationComplete, onRestart, onHome }: PodiumLeaderboardProps) => {
    const router = useRouter()
    const [hasAnimated, setHasAnimated] = useState(false)
    const [showFireworks, setShowFireworks] = useState(false)

    // Store stable players data internally to prevent flicker
    const [stablePlayers, setStablePlayers] = useState<PlayerProgress[]>(players)
    const isFirstRender = useRef(true)

    // Only update stablePlayers if the data actually changes meaningfully
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            setStablePlayers(players)
            return
        }

        // Compare and only update if actually different
        if (!arePlayersEqual(stablePlayers, players)) {
            setStablePlayers(players)
        }
    }, [players, stablePlayers])

    useEffect(() => {
        if (!hasAnimated) {
            setHasAnimated(true)
            setShowFireworks(true)
            onAnimationComplete()
            // Hide fireworks after animation
            setTimeout(() => setShowFireworks(false), 3000)
        }
    }, [hasAnimated, onAnimationComplete])

    const sorted = [...stablePlayers].sort((a, b) => b.score - a.score)

    // Memoized fireworks data to prevent re-creation on every render
    const fireworksData = React.useMemo(() => ({
        particles: Array.from({ length: 12 }).map((_, i) => ({
            id: i,
            initialX: Math.random() * 100,
            targetY: Math.random() * 30,
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 2,
        })),
        stars: Array.from({ length: 8 }).map((_, i) => ({
            id: `star-${i}`,
            left: Math.random() * 100,
            top: Math.random() * 50,
            delay: Math.random() * 1.5,
        }))
    }), [])

    // Fireworks animation component
    const Fireworks = React.useCallback(() => (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {fireworksData.particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                    initial={{
                        left: `${particle.initialX}%`,
                        bottom: 0,
                        scale: 0,
                        opacity: 1,
                    }}
                    animate={{
                        bottom: `${particle.targetY}%`,
                        scale: [0, 1, 0],
                        opacity: [1, 1, 0],
                    }}
                    transition={{
                        duration: particle.duration,
                        delay: particle.delay,
                        ease: "easeOut",
                    }}
                />
            ))}
            {fireworksData.stars.map((star) => (
                <motion.div
                    key={star.id}
                    className="absolute text-2xl"
                    style={{
                        left: `${star.left}%`,
                        top: `${star.top}%`,
                    }}
                    initial={{ scale: 0, rotate: 0, opacity: 0 }}
                    animate={{
                        scale: [0, 1.5, 1, 0],
                        rotate: [0, 180, 360],
                        opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                        duration: 3,
                        delay: star.delay,
                        ease: "easeInOut",
                    }}
                >
                    ⭐
                </motion.div>
            ))}
        </div>
    ), [fireworksData])

    // Mobile List Layout Component - use CSS animation instead of framer-motion
    // This prevents flickering on re-renders from real-time updates
    const MobileListLayout = () => (
        <div className="md:hidden w-full px-4 space-y-3 animate-fade-in">
            {sorted.map((player, idx) => (
                <div
                    key={`mobile-${player.id}`}
                    className="flex items-center justify-between bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl px-4 py-3 border border-slate-700/50 transition-all duration-300"
                    style={{
                        animationDelay: `${0.1 + idx * 0.05}s`,
                        animationFillMode: 'backwards'
                    }}
                >
                    <div className="flex items-center gap-3">
                        {/* Rank Badge */}
                        <div className={`
                w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm
                ${idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' :
                                idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' :
                                    idx === 2 ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white' :
                                        'bg-gradient-to-br from-slate-600 to-slate-700 text-white'}
              `}>
                            #{idx + 1}
                        </div>
                        {/* Player Name */}
                        <span className="font-semibold text-white text-base">
                            <SmartNameDisplay
                                name={player.name}
                                maxLength={15}
                                className="text-white"
                            />
                        </span>
                    </div>
                    {/* Score */}
                    <span className={`
              font-bold text-lg transition-all duration-300
              ${idx === 0 ? 'text-yellow-400' :
                            idx === 1 ? 'text-gray-300' :
                                idx === 2 ? 'text-amber-400' :
                                    'text-cyan-400'}
            `}>
                        {player.score}
                    </span>
                </div>
            ))}
        </div>
    )

    // 1 player - Grand Champion
    if (sorted.length === 1) {
        const [onlyPlayer] = sorted
        return (
            <div className="min-h-screen relative overflow-hidden">
                {showFireworks && <Fireworks />}

                {/* Spotlight effect */}
                <div className="absolute inset-0 bg-gradient-radial from-yellow-400/20 via-transparent to-black/40" />

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.2 }}
                    className="min-h-screen flex flex-col items-center justify-start pt-8 md:justify-center md:pt-0 p-2 sm:p-4 lg:p-8 font-mono text-white relative z-10"
                >
                    {/* Home button - Left center */}
                    <motion.button
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 2 }}
                        onClick={onHome || (() => router.push("/"))}
                        className="fixed left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300 hover:scale-110"
                        aria-label="Back to Dashboard"
                    >
                        <Home className="w-6 h-6 sm:w-7 sm:h-7" />
                    </motion.button>

                    {/* Restart button - Right center */}
                    <motion.button
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 2 }}
                        onClick={onRestart}
                        className="fixed right-4 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all duration-300 hover:scale-110"
                        aria-label="Restart Game"
                    >
                        <RotateCw className="w-6 h-6 sm:w-7 sm:h-7" />
                    </motion.button>

                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="flex items-center justify-center gap-3 mb-2 sm:mb-4"
                    >
                        <img
                            src="/images/logo/spacequizv2.webp"
                            alt="Space Quiz"
                            className="h-8 sm:h-10 md:h-12 lg:h-14 w-auto object-contain"
                        />
                        <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white/80">-</span>
                        <Image
                            src="/images/gameforsmartlogo.png"
                            alt="GameForSmart"
                            width={280}
                            height={112}
                            className="w-32 h-auto sm:w-36 md:w-40 lg:w-44 xl:w-48 2xl:w-52 opacity-90 hover:opacity-100 transition-opacity duration-300"
                            priority
                        />
                    </motion.div>

                    <motion.h1
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.8, type: "spring" }}
                        className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 sm:mb-8 lg:mb-12 text-center bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,215,0,0.5)] px-2"
                        style={{ textShadow: "0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.4)" }}
                    >
                        CHAMPIONS
                    </motion.h1>

                    {/* Mobile List View */}
                    <MobileListLayout />

                    {/* Desktop Champion pedestal */}
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 1, delay: 1.2 }}
                        className="relative hidden md:block"
                    >
                        {/* Pedestal base */}
                        <div className="relative bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 rounded-t-2xl sm:rounded-t-3xl p-1 shadow-[0_0_30px_rgba(255,215,0,0.6)] sm:shadow-[0_0_50px_rgba(255,215,0,0.6)]">
                            <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-t-2xl sm:rounded-t-3xl p-4 sm:p-8 lg:p-12">

                                {/* Glowing ring around avatar */}
                                <div className="relative">
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 blur-lg opacity-75 animate-pulse" />
                                    <div className="relative">
                                        <Image
                                            src={onlyPlayer.avatar || "/placeholder.svg"}
                                            alt={getFirstName(onlyPlayer.name)}
                                            width={200}
                                            height={200}
                                            className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-full border-4 sm:border-6 lg:border-8 border-yellow-400 object-cover relative z-10 shadow-[0_0_20px_rgba(255,215,0,0.8)] sm:shadow-[0_0_40px_rgba(255,215,0,0.8)]"
                                        />
                                    </div>
                                </div>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: 1.5 }}
                                    className="text-center mt-6"
                                >
                                    <h2 className="font-bold text-lg sm:text-2xl md:text-3xl lg:text-4xl mb-2 text-yellow-300 drop-shadow-lg text-center">
                                        <SmartNameDisplay
                                            name={onlyPlayer.name}
                                            maxLength={10}
                                            className="font-bold text-lg sm:text-2xl md:text-3xl lg:text-4xl text-yellow-300 drop-shadow-lg"
                                            multilineClassName="text-base sm:text-xl md:text-2xl lg:text-3xl"
                                        />
                                    </h2>
                                    <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-3 sm:px-6 py-2 sm:py-3 rounded-full font-bold text-base sm:text-xl lg:text-2xl shadow-lg">
                                        <StableScoreDisplay score={onlyPlayer.score} playerId={onlyPlayer.id} />
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Pedestal steps */}
                        <div className="bg-gradient-to-b from-yellow-600 to-yellow-700 h-6 sm:h-8 w-full rounded-b-lg shadow-lg" />
                        <div className="bg-gradient-to-b from-yellow-700 to-yellow-800 h-4 sm:h-6 w-[110%] -ml-[5%] rounded-b-lg shadow-lg" />
                        <div className="bg-gradient-to-b from-yellow-800 to-yellow-900 h-3 sm:h-4 w-[120%] -ml-[10%] rounded-b-lg shadow-lg" />
                    </motion.div>
                </motion.div>
            </div>
        )
    }

    // 2 players - Victory Duo
    if (sorted.length === 2) {
        const [first, second] = sorted
        return (
            <div className="min-h-screen relative overflow-hidden">
                {showFireworks && <Fireworks />}

                {/* Home button - Left center */}
                <motion.button
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 1.8 }}
                    onClick={onHome || (() => router.push("/"))}
                    className="fixed left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300 hover:scale-110"
                    aria-label="Back to Dashboard"
                >
                    <Home className="w-6 h-6 sm:w-7 sm:h-7" />
                </motion.button>

                {/* Restart button - Right center */}
                <motion.button
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 1.8 }}
                    onClick={onRestart}
                    className="fixed right-4 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all duration-300 hover:scale-110"
                    aria-label="Restart Game"
                >
                    <RotateCw className="w-6 h-6 sm:w-7 sm:h-7" />
                </motion.button>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                    className="min-h-screen flex flex-col items-center justify-start pt-8 md:justify-center md:pt-0 p-2 sm:p-4 lg:p-8 font-mono text-white relative z-10"
                >
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="flex items-center justify-center gap-3 mb-2 sm:mb-4"
                    >
                        <img
                            src="/images/logo/spacequizv2.webp"
                            alt="Space Quiz"
                            className="h-8 sm:h-10 md:h-12 lg:h-14 w-auto object-contain"
                        />
                        <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white/80">-</span>
                        <Image
                            src="/images/gameforsmartlogo.png"
                            alt="GameForSmart"
                            width={280}
                            height={112}
                            className="w-32 h-auto sm:w-36 md:w-40 lg:w-44 xl:w-48 2xl:w-52 opacity-90 hover:opacity-100 transition-opacity duration-300"
                            priority
                        />
                    </motion.div>

                    <motion.h1
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-8 sm:mb-12 text-center bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent px-2"
                        style={{ textShadow: "0 0 20px rgba(255, 215, 0, 0.6)" }}
                    >
                        CHAMPIONS
                    </motion.h1>

                    {/* Mobile List View */}
                    <MobileListLayout />

                    {/* Desktop Podium View */}
                    <div className="hidden md:flex items-end justify-center gap-4 sm:gap-8 lg:gap-12">
                        {/* Second Place */}
                        <motion.div
                            initial={{ x: -100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.8 }}
                            className="flex flex-col items-center"
                        >
                            {/* Silver Podium */}
                            <div className="relative">
                                <div className="bg-gradient-to-b from-gray-300 via-gray-400 to-gray-500 rounded-t-xl sm:rounded-t-2xl p-1 shadow-[0_0_20px_rgba(192,192,192,0.5)] sm:shadow-[0_0_30px_rgba(192,192,192,0.5)]">
                                    <div className="bg-gradient-to-b from-gray-700 to-gray-800 rounded-t-xl sm:rounded-t-2xl p-3 sm:p-6 lg:p-8">
                                        <div className="relative flex justify-center">
                                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-300 to-gray-400 blur-md opacity-60 animate-pulse" />
                                            <Image
                                                src={second.avatar || "/placeholder.svg"}
                                                alt={getFirstName(second.name)}
                                                width={120}
                                                height={120}
                                                className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full border-4 sm:border-6 border-gray-300 object-cover relative z-10 shadow-[0_0_15px_rgba(192,192,192,0.6)] sm:shadow-[0_0_25px_rgba(192,192,192,0.6)]"
                                            />
                                        </div>
                                        <div className="text-center mt-2 sm:mt-4">
                                            <div className="text-lg sm:text-2xl mb-1 sm:mb-2">🥈</div>
                                            <h3 className="font-bold text-sm sm:text-lg lg:text-xl text-gray-300 text-center">
                                                <SmartNameDisplay
                                                    name={second.name}
                                                    maxLength={7}
                                                    className="text-sm sm:text-lg lg:text-xl text-gray-300"
                                                    multilineClassName="text-xs sm:text-base lg:text-lg"
                                                />
                                            </h3>
                                            <div className="bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 px-2 sm:px-4 py-1 sm:py-2 rounded-full font-bold text-xs sm:text-sm lg:text-base mt-1 sm:mt-2">
                                                {second.score}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gradient-to-b from-gray-500 to-gray-600 h-12 sm:h-16 w-full rounded-b-lg" />
                                <div className="bg-gradient-to-b from-gray-600 to-gray-700 h-3 sm:h-4 w-[110%] -ml-[5%] rounded-b-lg" />
                            </div>
                        </motion.div>

                        {/* First Place */}
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.8, delay: 1.2 }}
                            className="flex flex-col items-center"
                        >
                            {/* Gold Podium */}
                            <div className="relative">
                                <div className="bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 rounded-t-2xl sm:rounded-t-3xl p-1 shadow-[0_0_30px_rgba(255,215,0,0.7)] sm:shadow-[0_0_40px_rgba(255,215,0,0.7)]">
                                    <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-t-2xl sm:rounded-t-3xl p-4 sm:p-8 lg:p-10">
                                        <div className="relative">
                                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 blur-lg opacity-70 animate-pulse" />
                                            <Image
                                                src={first.avatar || "/placeholder.svg"}
                                                alt={getFirstName(first.name)}
                                                width={160}
                                                height={160}
                                                className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full border-4 sm:border-6 lg:border-8 border-yellow-400 object-cover relative z-10 shadow-[0_0_25px_rgba(255,215,0,0.8)] sm:shadow-[0_0_35px_rgba(255,215,0,0.8)]"
                                            />
                                        </div>
                                        <div className="text-center mt-2 sm:mt-4">
                                            <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">🥇</div>
                                            <h3 className="font-bold text-base sm:text-xl lg:text-2xl text-yellow-300 text-center">
                                                <SmartNameDisplay
                                                    name={first.name}
                                                    maxLength={8}
                                                    className="text-base sm:text-xl lg:text-2xl text-yellow-300"
                                                    multilineClassName="text-sm sm:text-lg lg:text-xl"
                                                />
                                            </h3>
                                            <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-3 sm:px-6 py-2 sm:py-3 rounded-full font-bold text-sm sm:text-base lg:text-lg mt-1 sm:mt-2">
                                                <StableScoreDisplay score={first.score} playerId={first.id} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gradient-to-b from-yellow-600 to-yellow-700 h-16 sm:h-20 w-full rounded-b-lg" />
                                <div className="bg-gradient-to-b from-yellow-700 to-yellow-800 h-4 sm:h-6 w-[110%] -ml-[5%] rounded-b-lg" />
                                <div className="bg-gradient-to-b from-yellow-800 to-yellow-900 h-3 sm:h-4 w-[120%] -ml-[10%] rounded-b-lg" />
                            </div>
                        </motion.div>
                    </div>

                </motion.div >
            </div >
        )
    }

    // 3+ players - Grand Podium
    const [first, second, third] = [
        sorted[0] || { name: "No Player", score: 0, avatar: "/placeholder.svg", id: "0", currentQuestion: 0, totalQuestions: 0, isActive: false, rank: 1 },
        sorted[1] || { name: "No Player", score: 0, avatar: "/placeholder.svg", id: "1", currentQuestion: 0, totalQuestions: 0, isActive: false, rank: 2 },
        sorted[2] || { name: "No Player", score: 0, avatar: "/placeholder.svg", id: "2", currentQuestion: 0, totalQuestions: 0, isActive: false, rank: 3 },
    ]
    const rest = sorted.slice(3)

    return (
        <div className="min-h-screen relative overflow-hidden">
            {showFireworks && <Fireworks />}

            {/* Epic background effects */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-radial from-purple-900/30 via-blue-900/20 to-black/60" />
            </div>

            {/* Home button - Left center */}
            <motion.button
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 2.5 }}
                onClick={onHome || (() => router.push("/"))}
                className="fixed left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300 hover:scale-110"
                aria-label="Back to Dashboard"
            >
                <Home className="w-6 h-6 sm:w-7 sm:h-7" />
            </motion.button>

            {/* Restart button - Right center */}
            <motion.button
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 2.5 }}
                onClick={onRestart}
                className="fixed right-4 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all duration-300 hover:scale-110"
                aria-label="Restart Game"
            >
                <RotateCw className="w-6 h-6 sm:w-7 sm:h-7" />
            </motion.button>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2 }}
                className="min-h-screen flex items-start pt-8 md:items-center md:pt-0 justify-center p-2 sm:p-4 lg:p-8 relative z-10"
            >
                <div className="text-center w-full max-w-6xl">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="flex items-center justify-center gap-3 mb-2 sm:mb-4"
                    >
                        <img
                            src="/images/logo/spacequizv2.webp"
                            alt="Space Quiz"
                            className="h-8 sm:h-10 md:h-12 lg:h-14 w-auto object-contain"
                        />
                        <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white/80">-</span>
                        <Image
                            src="/images/gameforsmartlogo.png"
                            alt="GameForSmart"
                            width={280}
                            height={112}
                            className="w-32 h-auto sm:w-36 md:w-40 lg:w-44 xl:w-48 2xl:w-52 opacity-90 hover:opacity-100 transition-opacity duration-300"
                            priority
                        />
                    </motion.div>

                    <motion.h1
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ duration: 1, delay: 0.3, type: "spring", bounce: 0.3 }}
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-8xl font-bold mb-8 sm:mb-12 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent px-2"
                        style={{ textShadow: "0 0 40px rgba(255, 215, 0, 0.8)" }}
                    >
                        CHAMPIONS
                    </motion.h1>

                    {/* Mobile List View */}
                    <MobileListLayout />

                    {/* Desktop Main Podium - Modern Horizontal Style */}
                    <div className="hidden md:flex items-end justify-center gap-2 lg:gap-4 xl:gap-6 mb-6 sm:mb-8">
                        {/* Second Place - Left */}
                        <motion.div
                            initial={{ x: -100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.8, type: "spring" }}
                            className="flex flex-col items-center"
                        >
                            {/* Crown/Trophy Icon */}
                            <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className="mb-2"
                            >
                                <svg width="40" height="28" viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
                                    <path d="M6 24L10 8L20 16L30 8L34 24H6Z" fill="url(#silver-gradient)" stroke="#9CA3AF" strokeWidth="1.5" />
                                    <circle cx="10" cy="6" r="4" fill="#9CA3AF" />
                                    <circle cx="30" cy="6" r="4" fill="#9CA3AF" />
                                    <defs>
                                        <linearGradient id="silver-gradient" x1="6" y1="8" x2="34" y2="24">
                                            <stop stopColor="#D1D5DB" />
                                            <stop offset="1" stopColor="#9CA3AF" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </motion.div>

                            {/* Avatar with ring */}
                            <div className="relative mb-3">
                                <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-gray-300 to-gray-400 blur-md opacity-50 animate-pulse" />
                                <div className="relative p-1 rounded-full bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300">
                                    <Image
                                        src={second.avatar || "/placeholder.svg"}
                                        alt={getFirstName(second.name)}
                                        width={80}
                                        height={80}
                                        className="w-16 h-16 lg:w-20 lg:h-20 rounded-full object-cover border-2 border-gray-700"
                                    />
                                </div>
                            </div>

                            {/* Player Name */}
                            <h3 className="font-bold text-sm lg:text-base text-white mb-3 text-center max-w-[120px]">
                                <SmartNameDisplay
                                    name={second.name}
                                    maxLength={12}
                                    className="text-sm lg:text-base text-white"
                                    multilineClassName="text-xs lg:text-sm"
                                />
                            </h3>

                            {/* Podium Step */}
                            <div className="relative w-28 lg:w-36">
                                {/* Step platform */}
                                <div className="bg-gradient-to-b from-gray-400 via-gray-500 to-gray-600 rounded-t-lg pt-4 pb-6 px-4 shadow-[0_4px_20px_rgba(156,163,175,0.3)]">
                                    {/* Rank number */}
                                    <div className="text-5xl lg:text-6xl font-extrabold text-gray-800 text-center mb-3 drop-shadow-lg">2</div>
                                    {/* Score pill */}
                                    <div className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-5 py-3 rounded-full font-bold text-xl lg:text-2xl text-center shadow-lg">
                                        <StableScoreDisplay score={second.score} playerId={second.id} />
                                    </div>
                                </div>
                                {/* Step base */}
                                <div className="h-12 lg:h-16 bg-gradient-to-b from-gray-600 via-gray-700 to-gray-800 rounded-b-lg" />
                            </div>
                        </motion.div>

                        {/* First Place - Center (Tallest) */}
                        <motion.div
                            initial={{ y: 100, opacity: 0, scale: 0.8 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            transition={{ duration: 1, delay: 1.2, type: "spring", bounce: 0.2 }}
                            className="flex flex-col items-center relative"
                        >
                            {/* Crown Icon */}
                            <motion.div
                                animate={{ y: [0, -8, 0], rotate: [0, 2, -2, 0] }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                className="mb-2"
                            >
                                <svg width="56" height="40" viewBox="0 0 56 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 34L14 12L28 22L42 12L48 34H8Z" fill="url(#gold-gradient)" stroke="#F59E0B" strokeWidth="2" />
                                    <circle cx="14" cy="8" r="6" fill="#FBBF24" />
                                    <circle cx="42" cy="8" r="6" fill="#FBBF24" />
                                    <circle cx="28" cy="6" r="5" fill="#FCD34D" />
                                    <defs>
                                        <linearGradient id="gold-gradient" x1="8" y1="12" x2="48" y2="34">
                                            <stop stopColor="#FCD34D" />
                                            <stop offset="0.5" stopColor="#FBBF24" />
                                            <stop offset="1" stopColor="#F59E0B" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </motion.div>

                            {/* Avatar with glowing ring */}
                            <div className="relative mb-3">
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute -inset-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 blur-lg"
                                />
                                <div className="relative p-1.5 rounded-full bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 shadow-[0_0_30px_rgba(251,191,36,0.6)]">
                                    <Image
                                        src={first.avatar || "/placeholder.svg"}
                                        alt={getFirstName(first.name)}
                                        width={120}
                                        height={120}
                                        className="w-20 h-20 lg:w-28 lg:h-28 rounded-full object-cover border-3 border-gray-800"
                                    />
                                </div>
                            </div>

                            {/* Player Name */}
                            <h3 className="font-bold text-base lg:text-xl text-yellow-300 mb-4 text-center max-w-[160px] drop-shadow-lg">
                                <SmartNameDisplay
                                    name={first.name}
                                    maxLength={14}
                                    className="text-base lg:text-xl text-yellow-300"
                                    multilineClassName="text-sm lg:text-lg"
                                />
                            </h3>

                            {/* Podium Step - Tallest */}
                            <div className="relative w-36 lg:w-44">
                                {/* Step platform */}
                                <div className="bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 rounded-t-xl pt-5 pb-8 px-5 shadow-[0_4px_30px_rgba(251,191,36,0.5)]">
                                    {/* Rank number */}
                                    <div className="text-6xl lg:text-7xl font-extrabold text-gray-900 text-center mb-4 drop-shadow-xl">1</div>
                                    {/* Score pill */}
                                    <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white px-6 py-3.5 rounded-full font-bold text-2xl lg:text-3xl text-center shadow-xl">
                                        <StableScoreDisplay score={first.score} playerId={first.id} />
                                    </div>
                                </div>
                                {/* Step base - Tallest */}
                                <div className="h-16 lg:h-20 bg-gradient-to-b from-yellow-600 via-yellow-700 to-yellow-800 rounded-b-xl" />
                            </div>
                        </motion.div>

                        {/* Third Place - Right */}
                        <motion.div
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.8, delay: 1.0, type: "spring" }}
                            className="flex flex-col items-center"
                        >
                            {/* Crown/Trophy Icon */}
                            <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                                className="mb-2"
                            >
                                <svg width="36" height="24" viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
                                    <path d="M6 24L10 8L20 16L30 8L34 24H6Z" fill="url(#bronze-gradient)" stroke="#B45309" strokeWidth="1.5" />
                                    <circle cx="10" cy="6" r="4" fill="#D97706" />
                                    <circle cx="30" cy="6" r="4" fill="#D97706" />
                                    <defs>
                                        <linearGradient id="bronze-gradient" x1="6" y1="8" x2="34" y2="24">
                                            <stop stopColor="#F59E0B" />
                                            <stop offset="1" stopColor="#B45309" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </motion.div>

                            {/* Avatar with ring */}
                            <div className="relative mb-3">
                                <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 blur-md opacity-40 animate-pulse" />
                                <div className="relative p-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500">
                                    <Image
                                        src={third.avatar || "/placeholder.svg"}
                                        alt={getFirstName(third.name)}
                                        width={72}
                                        height={72}
                                        className="w-14 h-14 lg:w-18 lg:h-18 rounded-full object-cover border-2 border-gray-700"
                                    />
                                </div>
                            </div>

                            {/* Player Name */}
                            <h3 className="font-bold text-sm lg:text-base text-white mb-3 text-center max-w-[110px]">
                                <SmartNameDisplay
                                    name={third.name}
                                    maxLength={10}
                                    className="text-sm lg:text-base text-white"
                                    multilineClassName="text-xs lg:text-sm"
                                />
                            </h3>

                            {/* Podium Step */}
                            <div className="relative w-24 lg:w-32">
                                {/* Step platform */}
                                <div className="bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 rounded-t-lg pt-3 pb-5 px-3 shadow-[0_4px_20px_rgba(217,119,6,0.3)]">
                                    {/* Rank number */}
                                    <div className="text-4xl lg:text-5xl font-extrabold text-amber-900 text-center mb-3 drop-shadow-lg">3</div>
                                    {/* Score pill */}
                                    <div className="bg-gradient-to-r from-amber-700 to-amber-800 text-white px-4 py-2.5 rounded-full font-bold text-lg lg:text-xl text-center shadow-lg">
                                        <StableScoreDisplay score={third.score} playerId={third.id} />
                                    </div>
                                </div>
                                {/* Step base - Shortest */}
                                <div className="h-8 lg:h-10 bg-gradient-to-b from-amber-700 via-amber-800 to-amber-900 rounded-b-lg" />
                            </div>
                        </motion.div>
                    </div>

                    {/* Other players - Desktop only */}
                    {rest.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 1.8 }}
                            className="mt-4 sm:mt-6 lg:mt-8 hidden md:block"
                        >

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 max-w-5xl mx-auto px-2">
                                {rest.map((p, idx) => (
                                    <motion.div
                                        key={p.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.5, delay: 2 + idx * 0.1 }}
                                        className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-lg sm:rounded-xl p-2 sm:p-4 backdrop-blur-sm hover:border-purple-400/50 transition-all duration-300"
                                    >
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm">
                                                {idx + 4}
                                            </div>
                                            <Image
                                                src={p.avatar || "/placeholder.svg"}
                                                alt={getFirstName(p.name)}
                                                width={40}
                                                height={40}
                                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-purple-400 object-cover"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-white text-xs sm:text-sm">
                                                    <SmartNameDisplay
                                                        name={p.name}
                                                        maxLength={14}
                                                        className="text-xs sm:text-sm text-white line-clamp-1"
                                                        multilineClassName="text-xs leading-tight"
                                                    />
                                                </p>
                                                <p className="text-purple-300 text-xs sm:text-sm font-semibold">{p.score}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                </div>
            </motion.div>
        </div>
    )
}

// Export with React.memo and custom comparison to prevent unnecessary re-renders
export const PodiumLeaderboard = React.memo(
    PodiumLeaderboardInner,
    (prevProps, nextProps) => {
        // Only re-render if players actually changed meaningfully
        return arePlayersEqual(prevProps.players, nextProps.players)
    }
)

PodiumLeaderboard.displayName = "PodiumLeaderboard"
