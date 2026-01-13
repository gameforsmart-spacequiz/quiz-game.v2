"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { supabaseB } from "@/lib/supabase-b";
import { finalizeGame } from "@/lib/sync-manager";
import { Play, Trash2, StopCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAdminGuard } from "@/lib/admin-guard";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BotInstance } from "@/components/test/BotInstance";

// Avatar options (matching join-game-dialog.tsx)
const AVATAR_OPTIONS = [
    "https://api.dicebear.com/9.x/micah/svg?seed=cat",
    "https://api.dicebear.com/9.x/micah/svg?seed=dog",
    "https://api.dicebear.com/9.x/micah/svg?seed=rabbit",
    "https://api.dicebear.com/9.x/micah/svg?seed=elephant",
    "https://api.dicebear.com/9.x/micah/svg?seed=monkey",
    "https://api.dicebear.com/9.x/micah/svg?seed=tiger",
    "https://api.dicebear.com/9.x/micah/svg?seed=panda",
    "https://api.dicebear.com/9.x/micah/svg?seed=koala",
];

// Import Indonesian names from JSON
import indonesianNames from "@/data/indonesian-names.json";

// Helper to pick random from array
const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Unique nickname generator class using Indonesian names
class UniqueNicknameGenerator {
    private usedNames: Set<string> = new Set();
    private firstNames: string[];
    private middleNames: string[];
    private lastNames: string[];

    constructor() {
        this.firstNames = indonesianNames.firstNames;
        this.middleNames = indonesianNames.middleNames;
        this.lastNames = indonesianNames.lastNames;
    }

    generate(): string {
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            // Random format: 1-4 words
            const wordCount = Math.floor(Math.random() * 4) + 1;
            let nickname: string;

            if (wordCount === 1) {
                // Just first name
                nickname = pickRandom(this.firstNames);
            } else if (wordCount === 2) {
                // First + Last
                nickname = `${pickRandom(this.firstNames)} ${pickRandom(this.lastNames)}`;
            } else if (wordCount === 3) {
                // First + Middle + Last
                nickname = `${pickRandom(this.firstNames)} ${pickRandom(this.middleNames)} ${pickRandom(this.lastNames)}`;
            } else {
                // First + Middle1 + Middle2 + Last
                nickname = `${pickRandom(this.firstNames)} ${pickRandom(this.middleNames)} ${pickRandom(this.middleNames)} ${pickRandom(this.lastNames)}`;
            }

            if (!this.usedNames.has(nickname)) {
                this.usedNames.add(nickname);
                return nickname;
            }
            attempts++;
        }

        // Fallback: use full 4-word format for guaranteed uniqueness
        const fallback = `${pickRandom(this.firstNames)} ${pickRandom(this.middleNames)} ${pickRandom(this.middleNames)} ${pickRandom(this.lastNames)}`;
        this.usedNames.add(fallback);
        return fallback;
    }

    reset(): void {
        this.usedNames.clear();
    }
}


interface SessionData {
    id: string;
    game_pin: string;
    status: string;
    settings: any;
    quiz_id: string;
    quiz_title: string;
}

export default function TestPage() {
    const { isAdmin, loading: authLoading } = useAdminGuard();
    const [roomCode, setRoomCode] = useState("");
    const router = useRouter();
    const [userCount, setUserCount] = useState(100);
    const [isRunning, setIsRunning] = useState(false);
    const [session, setSession] = useState<SessionData | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    const [joinedCount, setJoinedCount] = useState(0);
    const [answeringCount, setAnsweringCount] = useState(0);
    const [completedCount, setCompletedCount] = useState(0);
    const [errorCount, setErrorCount] = useState(0);
    const [gameEnded, setGameEnded] = useState(false);
    const [showCleanupDialog, setShowCleanupDialog] = useState(false);
    const [isCleaningUp, setIsCleaningUp] = useState(false);

    // Active bots state (to render BotInstance components)
    const [activeBots, setActiveBots] = useState<number[]>([]);

    const stopRef = useRef(false);
    const sessionChannelRef = useRef<any>(null);
    const firstBotFinishedRef = useRef(false);
    const gameStatusRef = useRef<string>("waiting");

    // Nickname generator (memoized)
    const nicknameGenerator = useMemo(() => new UniqueNicknameGenerator(), []);

    const addLog = useCallback((message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 199)]);
    }, []);

    // Fetch session from Supabase B
    const fetchSession = async (code: string): Promise<SessionData | null> => {
        const { data, error } = await supabaseB
            .from("sessions")
            .select("id, game_pin, status, settings, quiz_id, quiz_title")
            .eq("game_pin", code)
            .single();

        if (error || !data) {
            addLog(`❌ Session not found: ${code}`);
            return null;
        }
        return data;
    };

    // Subscribe to session changes (detect game start/end)
    const subscribeToSession = (sessionId: string) => {
        sessionChannelRef.current = supabaseB
            .channel(`test-session-${sessionId}`)
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
                (payload) => {
                    const newStatus = payload.new?.status;
                    gameStatusRef.current = newStatus;

                    if (newStatus === "finish") {
                        addLog("🛑 Game ended!");
                        setGameEnded(true);
                        stopRef.current = true;
                        setCompletedCount(joinedCount);
                        setActiveBots([]);
                        setIsRunning(false);
                    } else if (newStatus === "active") {
                        addLog("🚀 Game started!");
                    }
                }
            )
            .on(
                "postgres_changes",
                { event: "DELETE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
                () => {
                    addLog("🗑️ Session deleted!");
                    setGameEnded(true);
                    stopRef.current = true;
                    setActiveBots([]);
                    setIsRunning(false);
                }
            )
            .subscribe();
    };

    // Handle bot completion - game ends when first bot finishes
    const handleBotCompleted = useCallback(async (nickname: string) => {
        if (firstBotFinishedRef.current || !session) return;

        firstBotFinishedRef.current = true;
        stopRef.current = true;
        addLog(`🏁 ${nickname} finished! Ending game...`);

        try {
            const syncSuccess = await finalizeGame(session.id);
            if (syncSuccess) {
                addLog(`✅ Game finalized and synced!`);
            } else {
                addLog(`⚠️ Game ended but sync may have failed`);
            }
            setCompletedCount(joinedCount);
            setGameEnded(true);
            setActiveBots([]); // Clear bots
            setIsRunning(false); // Reset button to "Start"
        } catch (err) {
            console.error('Error ending game:', err);
            addLog(`❌ Error ending game: ${err}`);
            setIsRunning(false); // Reset even on error
        }
    }, [session, joinedCount, addLog]);

    // Bot event handlers
    const handleBotJoined = useCallback((nickname: string) => {
        setJoinedCount(prev => prev + 1);
        addLog(`✅ ${nickname} joined`);
    }, [addLog]);

    const handleBotAnswered = useCallback((nickname: string, questionIndex: number) => {
        addLog(`${nickname} → Q${questionIndex}`);
        setAnsweringCount(prev => Math.max(prev, questionIndex));
    }, [addLog]);

    const handleBotError = useCallback((nickname: string, error: string) => {
        setErrorCount(prev => prev + 1);
        addLog(`❌ ${nickname}: ${error}`);
    }, [addLog]);

    // Main test runner
    const startTest = async () => {
        if (!roomCode.trim()) {
            addLog("❌ Enter room code");
            return;
        }

        setIsRunning(true);
        setGameEnded(false);
        stopRef.current = false;
        firstBotFinishedRef.current = false;
        gameStatusRef.current = "waiting";
        setLogs([]);
        setJoinedCount(0);
        setAnsweringCount(0);
        setCompletedCount(0);
        setErrorCount(0);
        setActiveBots([]);
        nicknameGenerator.reset();

        addLog(`🧪 Starting test: ${roomCode}`);

        const sess = await fetchSession(roomCode);
        if (!sess) {
            setIsRunning(false);
            return;
        }

        gameStatusRef.current = sess.status;
        subscribeToSession(sess.id);
        addLog(`✅ Session found: ${sess.status} - ${sess.quiz_title}`);

        // Spawn all bot instances - set session first, then bots
        const botIds = Array.from({ length: userCount }, (_, i) => i);
        console.log(`[TestPage] Setting session and ${botIds.length} bots...`);

        // Set both at once to ensure they're in the same render
        setSession(sess);
        setActiveBots(botIds);

        addLog(`🤖 Spawned ${userCount} bots`);
        console.log(`[TestPage] Session ID: ${sess.id}, Bot count: ${botIds.length}`);
    };

    const stopTest = () => {
        stopRef.current = true;
        if (sessionChannelRef.current) {
            supabaseB.removeChannel(sessionChannelRef.current);
        }
        setActiveBots([]);
        setIsRunning(false);
        addLog("⛔ Test stopped");
    };

    const cleanupUsers = async () => {
        if (!session?.id) return;
        setIsCleaningUp(true);
        addLog("🧹 Cleaning up bots...");

        await supabaseB
            .from("participant")
            .delete()
            .eq("game_id", session.id);

        addLog("✅ Cleanup complete");
        setJoinedCount(0);
        setCompletedCount(0);
        setIsCleaningUp(false);
        setShowCleanupDialog(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (sessionChannelRef.current) {
                supabaseB.removeChannel(sessionChannelRef.current);
            }
        };
    }, []);

    // Show loading while checking auth
    if (authLoading || !isAdmin) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] via-[#0f0a2a] to-[#1a0a3a] flex items-center justify-center">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-4"
                    />
                    <p className="text-purple-300 font-mono">Verifying access...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] via-[#0f0a2a] to-[#1a0a3a] relative overflow-hidden font-mono">
            {/* Animated Stars Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {[...Array(50)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                            opacity: [0.2, 1, 0.2],
                            scale: [0.8, 1.2, 0.8],
                        }}
                        transition={{
                            duration: 2 + Math.random() * 3,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                        }}
                    />
                ))}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
            </div>

            {/* Scrollable Content Wrapper */}
            <div className="absolute inset-0 overflow-y-auto z-10">
                {/* Header */}
                <div className="w-full px-4 pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-4" onClick={() => router.replace("/")}>
                        <Image
                            src="/images/logo/spacequizv2.webp"
                            alt="Memory Quiz"
                            width={130}
                            height={50}
                            className="h-auto drop-shadow-xl hidden md:block"
                        />
                    </div>
                    <Image
                        src="/images/gameforsmartlogo.png"
                        alt="GameForSmart Logo"
                        width={200}
                        height={70}
                        className="hidden md:block"
                    />
                </div>
                <div className="w-full px-4 pb-6 flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex items-center gap-3"
                    >
                        <h1 className="text-4xl font-bold  bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            TEST
                        </h1>
                    </motion.div>
                </div>

                {/* Content */}
                <div className="max-w-4xl mx-auto p-4 pt-0 space-y-4">
                    {/* Control Panel */}
                    <Card className="bg-white/5 backdrop-blur-md border-purple-500/30 shadow-xl shadow-purple-500/10">
                        <CardContent className="space-y-4 pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-cyan-300 font-medium">Room Code</label>
                                    <Input
                                        value={roomCode}
                                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                        placeholder="XXXXXX"
                                        className="bg-black/30 border-cyan-500/30 text-white placeholder:text-gray-500 mt-1 focus:border-cyan-400"
                                        disabled={isRunning}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-cyan-300 font-medium">
                                        Bots: <span className="text-purple-400">{userCount}</span>
                                    </label>
                                    <Slider
                                        value={[userCount]}
                                        onValueChange={([v]) => setUserCount(v)}
                                        min={100}
                                        max={1000}
                                        step={100}
                                        disabled={isRunning}
                                        className="mt-3"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-3">
                                {!isRunning ? (
                                    <Button
                                        onClick={startTest}
                                        className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg shadow-cyan-500/25"
                                    >
                                        <Play className="w-4 h-4 mr-2" /> Start
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={stopTest}
                                        className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg shadow-red-500/25"
                                    >
                                        <StopCircle className="w-4 h-4 mr-2" /> Stop
                                    </Button>
                                )}
                                <Button
                                    onClick={() => setShowCleanupDialog(true)}
                                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25"
                                    disabled={isRunning || !session}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" /> Cleanup
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card className="bg-white/5 backdrop-blur-md border-cyan-500/30">
                            <CardContent className="p-3 text-center">
                                <div className="text-3xl font-bold text-cyan-400">{joinedCount}</div>
                                <div className="text-xs text-cyan-300/70">Joined</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white/5 backdrop-blur-md border-purple-500/30">
                            <CardContent className="p-3 text-center">
                                <div className="text-3xl font-bold text-purple-400">{answeringCount}</div>
                                <div className="text-xs text-purple-300/70">Questions</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white/5 backdrop-blur-md border-green-500/30">
                            <CardContent className="p-3 text-center">
                                <div className="text-3xl font-bold text-green-400">{completedCount}</div>
                                <div className="text-xs text-green-300/70">Completed</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white/5 backdrop-blur-md border-red-500/30">
                            <CardContent className="p-3 text-center">
                                <div className="text-3xl font-bold text-red-400">{errorCount}</div>
                                <div className="text-xs text-red-300/70">Errors</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Logs */}
                    <Card className="bg-white/5 backdrop-blur-md border-purple-500/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg text-purple-300 flex items-center gap-2">
                                📜 Logs
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64 overflow-y-auto bg-black/40 rounded-lg p-3 font-mono text-xs space-y-0.5 border border-purple-500/20">
                                {logs.length === 0 ? (
                                    <div className="text-gray-500">Waiting for test to start...</div>
                                ) : (
                                    logs.map((log, i) => (
                                        <div key={i} className="text-gray-300">
                                            {log}
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Render Bot Instances (no UI, just logic) */}
            {(() => {
                if (session && activeBots.length > 0) {
                    console.log(`[TestPage Render] Rendering ${activeBots.length} bots for session ${session.id}`);
                }
                return null;
            })()}
            {session && activeBots.map((botId) => (
                <BotInstance
                    key={botId}
                    botId={botId}
                    sessionId={session.id}
                    avatarOptions={AVATAR_OPTIONS}
                    nicknameGenerator={nicknameGenerator}
                    onJoined={handleBotJoined}
                    onAnswered={handleBotAnswered}
                    onCompleted={handleBotCompleted}
                    onError={handleBotError}
                    stopSignal={stopRef}
                    gameStatus={gameStatusRef}
                />
            ))}


            {/* Cleanup Confirmation Dialog */}
            <Dialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
                <DialogOverlay className="bg-black/70 backdrop-blur-sm fixed inset-0 z-50" />
                <DialogContent className="bg-[#0f0a2a]/95 border-2 border-purple-500 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent text-center">
                            🗑️ Cleanup Bots
                        </DialogTitle>
                        <DialogDescription className="text-center text-gray-300 text-sm mt-4">
                            Are you sure you want to delete all bots from this session?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setShowCleanupDialog(false)}
                            disabled={isCleaningUp}
                            className="flex-1 bg-transparent border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={cleanupUsers}
                            disabled={isCleaningUp}
                            className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white"
                        >
                            {isCleaningUp ? "Cleaning..." : "Delete All"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
