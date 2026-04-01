/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { supabaseB } from "@/lib/supabase-b";
import { getGameSessionByPin } from "@/lib/sessions-api";
import { getParticipantsByGameId } from "@/lib/participants-api";
import { toast } from "sonner";
import { Trophy, Medal, Crown, Star, Home, BarChart2 } from "lucide-react";
import { getFirstName, formatDisplayName } from "@/lib/utils";
import React from "react";
import Image, { type StaticImageData } from "next/image";
import { useLanguage } from "@/contexts/language-context";

interface PlayerResult {
  id: string;
  name: string;
  avatar: string;
  score: number;
  position: number;
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

function Background() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Base dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a1a] via-[#1a1a3a] to-[#0a0a2a]" />

      {/* Galaxy image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
        style={{ backgroundImage: "url('/images/galaxy.webp')" }}
      />

      {/* Nebula overlay gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f1f]/80 via-transparent to-[#0f0f1f]/60" />
      <div className="absolute inset-0 bg-gradient-to-bl from-purple-900/20 via-transparent to-indigo-900/20" />
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/10 via-transparent to-pink-900/10" />

      {/* Vignette effect */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)'
        }}
      />
    </div>
  );
}

function getPositionStyle(position: number) {
  switch (position) {
    case 1:
      return {
        bg: "bg-gradient-to-r from-yellow-500/20 to-amber-500/20",
        border: "border-yellow-500/50",
        text: "text-yellow-400",
        icon: <Crown className="w-6 h-6 text-yellow-400" />,
        glow: "shadow-yellow-500/50"
      };
    case 2:
      return {
        bg: "bg-gradient-to-r from-gray-400/20 to-slate-400/20",
        border: "border-gray-400/50",
        text: "text-gray-300",
        icon: <Medal className="w-6 h-6 text-gray-300" />,
        glow: "shadow-gray-400/50"
      };
    case 3:
      return {
        bg: "bg-gradient-to-r from-amber-600/20 to-orange-600/20",
        border: "border-amber-600/50",
        text: "text-amber-500",
        icon: <Medal className="w-6 h-6 text-amber-500" />,
        glow: "shadow-amber-600/50"
      };
    default:
      return {
        bg: "bg-slate-700/30",
        border: "border-slate-600/50",
        text: "text-slate-300",
        icon: <span className="text-xl font-bold">{position}.</span>,
        glow: "shadow-slate-600/50"
      };
  }
}

export default function ResultContent({ gameCode }: { gameCode: string }) {
  const router = useRouter();
  const playerId = useGameStore.getState().playerId;
  const [playerResults, setPlayerResults] = useState<PlayerResult[]>([]);
  const [userPosition, setUserPosition] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [gameSessionId, setGameSessionId] = useState<string>("");
  const { playerName, playerAvatar, score, isHost, resetGame } = useGameStore();
  const { t } = useLanguage();

  useEffect(() => {
    const fetchResults = async () => {
      try {
        // Try Supabase B first (new sessions)
        const sessionFromB = await getGameSessionByPin(gameCode.toUpperCase())

        let gameId: string | null = null
        let players: any[] = []

        if (sessionFromB) {
          // Supabase B session - fetch participants from participant table
          gameId = sessionFromB.id
          const participants = await getParticipantsByGameId(gameId)

          // Update player score if needed
          if (playerId && score) {
            await supabaseB
              .from("participant")
              .update({ score })
              .eq("id", playerId)
          }

          players = participants
            .map((p) => ({
              id: p.id,
              name: p.nickname,
              nickname: p.nickname,
              avatar: p.avatar || "/default-avatar.png",
              score: p.score || 0,
            }))
            .sort((a, b) => b.score - a.score)

          // Fetch the game session ID from Supabase Utama (for gameforsmart detail results)
          const { data: mainSession } = await supabase
            .from("game_sessions")
            .select("id")
            .eq("game_pin", gameCode.toUpperCase())
            .single();

          if (mainSession?.id) {
            setGameSessionId(mainSession.id); // Use ID from Supabase Utama for detail results
          }
        } else {
          // Fallback to main Supabase (legacy sessions)
          const { data: gameData, error: gameErr } = await supabase
            .from("game_sessions")
            .select("id, participants")
            .eq("game_pin", gameCode.toUpperCase())
            .single();

          if (gameErr || !gameData) {
            toast.error("Game not found");
            router.push("/");
            return;
          }

          gameId = gameData.id;
          if (gameId) setGameSessionId(gameId); // Save game session ID for detail results link

          // Update player score in participants array if needed
          if (playerId && score) {
            const updatedParticipants = gameData.participants.map((p: any) =>
              p.id === playerId ? { ...p, score } : p
            );
            await supabase
              .from("game_sessions")
              .update({ participants: updatedParticipants })
              .eq("id", gameId);
          }

          players = (gameData.participants || [])
            .sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
        }

        if (!players || players.length === 0) {
          setPlayerResults([]);
        } else {
          const results = players.map((p: any, idx: number) => ({
            id: p.id,
            name: p.name || p.nickname || "Unknown",
            avatar: p.avatar || "/default-avatar.png",
            score: p.score || 0,
            position: idx + 1,
          }));
          setPlayerResults(results);
          setUserPosition(results.findIndex((p: any) => p.id === playerId) + 1 || 0);
        }
      } catch (err) {
        toast.error("Failed to load results");
      } finally {
        setIsLoading(false);
      }
    };
    fetchResults();
  }, [gameCode, playerId, score, router]);

  useEffect(() => {
    if (!isLoading) {
      const userResult = playerResults.find((p) => p.id === playerId);
      if (!userResult && !isHost) {
        router.push("/");
      }
    }
  }, [isLoading, playerResults, isHost, playerId, router]);

  if (isLoading)
    return (
      <>
        <Background />
        <div className="relative z-10 min-h-screen flex items-center justify-center bg-black text-white font-mono" />
      </>
    );

  return isHost ? (
    <>
      <Background />
      <div className="relative z-10 min-h-screen p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <motion.div
              className="flex items-center justify-center gap-3 mb-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <img
                src="/images/logo/spacequizv2.webp"
                alt="Space Quiz"
                className="h-8 w-auto object-contain"
              />
              <span className="text-xl font-bold text-white/80">-</span>
              <Image
                src="/images/gameforsmartlogo.png"
                alt="GameForSmart"
                width={250}
                height={100}
                className="w-32 h-auto sm:w-36 md:w-40 lg:w-44 xl:w-48 opacity-90 hover:opacity-100 transition-opacity duration-300"
                priority
              />
            </motion.div>
            <motion.h1
              className="text-5xl font-bold text-white mb-2 flex items-center justify-center gap-3"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <Trophy className="w-12 h-12 text-yellow-400" />
              Final Results
            </motion.h1>
            <p className="text-slate-300 text-lg">Game Code: {gameCode.toUpperCase()}</p>
          </div>

          <div className="space-y-4">
            {playerResults.map((player, index) => {
              const style = getPositionStyle(player.position);
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className={`bg-black/70 border-4 ${style.border} p-6 rounded-lg shadow-[8px_8px_0px_#000] font-mono text-white transition-all duration-300`}>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        {style.icon}
                        <img
                          src={player.avatar}
                          alt={getFirstName(player.name)}
                          className="w-14 h-14 rounded-full object-cover border-2 border-white"
                        />
                      </div>

                      <div className="flex-1">
                        <h3 className="text-white font-bold text-xl mb-1 drop-shadow-[2px_2px_0px_#000]">
                          <SmartNameDisplay
                            name={player.name}
                            maxLength={8}
                            className="text-white font-bold text-xl"
                            multilineClassName="text-lg leading-tight"
                          />
                        </h3>
                        <p className="text-white/70 text-sm">Score</p>
                      </div>

                      <div className="text-right">
                        <p className={`text-4xl font-bold ${style.text} mb-1 drop-shadow-[2px_2px_0px_#000]`}>
                          {player.score.toLocaleString()}
                        </p>
                        <p className="text-white/70 text-sm">points</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            className="text-center mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <button
              onClick={() => {
                resetGame();
                router.push("/");
              }}
              className="bg-purple-500 hover:bg-purple-600 border-2 border-purple-700 px-8 py-3 rounded-lg text-white font-bold shadow-[4px_4px_0px_#000] text-lg transition-all duration-200 hover:shadow-[6px_6px_0px_#000] hover:-translate-y-1"
            >
              Back to Dashboard
            </button>
          </motion.div>
        </motion.div>
      </div>
    </>
  ) : (
    <>
      <Background />

      {/* Home button - Left center (like leaderboard page) */}
      <motion.button
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        onClick={() => {
          resetGame();
          router.push("/");
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300"
        aria-label="Home"
      >
        <Home className="w-6 h-6 sm:w-7 sm:h-7" />
      </motion.button>

      {/* Detail Results button - Right center (like leaderboard page) */}
      <motion.button
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        onClick={() => {
          const detailUrl = `https://gameforsmart2026.vercel.app/results/${gameSessionId}/answer-details?participant=${playerId}`;
          window.open(detailUrl, "_blank");
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed right-4 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all duration-300"
        aria-label="Detail Results"
      >
        <BarChart2 className="w-6 h-6 sm:w-7 sm:h-7" />
      </motion.button>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        {/* Floating stars overlay */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1.5, 0.5],
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

        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="max-w-md w-full relative z-10"
        >
          {/* Main Card with glassmorphism */}
          <div className="relative bg-gradient-to-br from-[#1a1a2e]/95 via-[#16213e]/95 to-[#0f0f23]/95 backdrop-blur-xl border border-purple-500/30 rounded-3xl shadow-2xl shadow-purple-900/40 overflow-hidden">
            {/* Gradient border lines */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent" />
            <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-purple-400/30 to-transparent" />

            {/* Corner glows */}
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />

            <div className="relative z-10 p-8 text-center space-y-6">
              {/* Logo Section */}
              <motion.div
                className="flex items-center justify-center gap-2 mb-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <img
                  src="/images/logo/spacequizv2.webp"
                  alt="Space Quiz"
                  className="h-8 w-auto object-contain"
                />
                <span className="text-lg font-bold text-white/60">-</span>
                <Image
                  src="/images/gameforsmartlogo.png"
                  alt="GameForSmart"
                  width={220}
                  height={88}
                  className="w-24 h-auto sm:w-28 md:w-32 lg:w-36 xl:w-40 opacity-80 hover:opacity-100 transition-opacity duration-300"
                  priority
                />
              </motion.div>

              {/* Avatar Section with orbital rings */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="relative w-36 h-36 mx-auto"
              >
                {/* Outer orbital ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-cyan-500/30"
                >
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/60" />
                </motion.div>

                {/* Middle orbital ring */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-3 rounded-full border-2 border-purple-500/40"
                >
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-purple-400 rounded-full shadow-lg shadow-purple-400/60" />
                </motion.div>

                {/* Avatar glow */}
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-5 rounded-full bg-gradient-to-br from-purple-500/30 via-cyan-500/20 to-purple-500/30"
                />

                {/* Avatar image */}
                <div className="absolute inset-6 rounded-full overflow-hidden border-3 border-white/30 shadow-xl shadow-purple-500/30">
                  <img
                    src={playerAvatar || "/default-avatar.png"}
                    alt={getFirstName(playerName)}
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>

              {/* Player Name & Score */}
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl sm:text-3xl font-bold mb-4"
                >
                  <span className="bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                    <SmartNameDisplay
                      name={playerName || "Unknown Player"}
                      maxLength={10}
                      className="bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent"
                      multilineClassName="text-xl leading-tight"
                    />
                  </span>
                </motion.h1>

                <div className="space-y-1">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.4 }}
                    className="relative inline-block"
                  >
                    <span
                      className="text-6xl sm:text-7xl font-black bg-gradient-to-b from-yellow-300 via-orange-400 to-yellow-500 bg-clip-text text-transparent"
                      style={{
                        textShadow: "0 0 40px rgba(251, 191, 36, 0.4)",
                      }}
                    >
                      {score || 0}
                    </span>
                  </motion.div>
                </div>
              </div>

              {/* Position Card */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="space-y-4"
              >
                <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-5 overflow-hidden">
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-cyan-500/5" />

                  <div className="relative z-10">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.6 }}
                      className="flex items-center justify-center"
                    >
                      <span className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
                        #{userPosition || "N/A"}
                      </span>
                    </motion.div>
                  </div>
                </div>


              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}