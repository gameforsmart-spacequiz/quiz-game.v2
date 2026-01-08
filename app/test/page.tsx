"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { supabaseB } from "@/lib/supabase-b";
import { finalizeGame } from "@/lib/sync-manager";
import { generateXID } from "@/lib/id-generator";
import { Play, Trash2, StopCircle, Rocket, Star, Sparkles } from "lucide-react";
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

// Avatar using DiceBear micah style (same as join-game-dialog.tsx)
const ANIMAL_AVATARS = [
    "https://api.dicebear.com/9.x/micah/svg?seed=cat",
    "https://api.dicebear.com/9.x/micah/svg?seed=dog",
    "https://api.dicebear.com/9.x/micah/svg?seed=rabbit",
    "https://api.dicebear.com/9.x/micah/svg?seed=elephant",
    "https://api.dicebear.com/9.x/micah/svg?seed=monkey",
    "https://api.dicebear.com/9.x/micah/svg?seed=tiger",
    "https://api.dicebear.com/9.x/micah/svg?seed=panda",
    "https://api.dicebear.com/9.x/micah/svg?seed=koala",
];

// Combined name list (Indonesian + Foreign, all mixed)
const NAMES = [
    // Indonesian
    "Andi", "Budi", "Cahya", "Dewi", "Eka", "Fajar", "Gita", "Hendra", "Indra", "Joko",
    "Kartika", "Lina", "Maya", "Nia", "Putra", "Rahmat", "Sari", "Tono", "Wati", "Yudi",
    "Zahra", "Agus", "Bayu", "Dian", "Firman", "Galih", "Hesti", "Iwan", "Kevin", "Luna",
    "Mega", "Nova", "Okta", "Prima", "Rio", "Tiara", "Vino", "Wulan", "Yoga", "Zara",
    "Ahmad", "Bambang", "Cinta", "Deni", "Elsa", "Fandi", "Gilang", "Hana", "Irfan", "Jihan",
    "Nur", "Dwi", "Tri", "Sri", "Adi", "Bima", "Candra", "Dewa", "Rama", "Perdana",
    "Pratama", "Wijaya", "Saputra", "Kusuma", "Hidayat", "Santoso", "Nugraha", "Permana",
    "Setiawan", "Wibowo", "Anggraini", "Lestari", "Putri", "Rahayu", "Utami", "Purnama",
    // Foreign
    "John", "James", "Michael", "David", "Chris", "Alex", "Ryan", "Daniel", "Matthew", "Andrew",
    "Emma", "Olivia", "Sophia", "Mia", "Isabella", "Charlotte", "Amelia", "Harper", "Evelyn", "Abigail",
    "Tom", "Jack", "Harry", "Oliver", "George", "Noah", "Liam", "Ethan", "Mason", "Lucas",
    "William", "Benjamin", "Henry", "Sebastian", "Alexander", "Emily", "Ava", "Grace", "Chloe", "Lily",
    "Robert", "Joseph", "Thomas", "Charles", "Edward", "Victoria", "Elizabeth", "Margaret", "Catherine", "Alice",
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Wilson", "Moore",
    "Taylor", "Anderson", "Jackson", "White", "Harris", "Martin", "Thompson", "Lee", "Walker", "King"
];

// Helper to pick random from array
const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Generate random nickname with 1-4 words (pure random, with spaces)
const generateRandomNickname = (): string => {
    const wordCount = Math.floor(Math.random() * 4) + 1; // 1 to 4 words

    const words: string[] = [];
    for (let i = 0; i < wordCount; i++) {
        words.push(pickRandom(NAMES));
    }

    return words.join(" "); // "John Smith Lee Davis"
};



interface TestUser {
    id: string;
    nickname: string;
    currentQuestion: number;
    completed: boolean;
}

interface SessionData {
    id: string;
    game_pin: string;
    status: string;
    settings: any;
    quiz_id: string;
    quiz_title: string;
}

export default function StressTestPage() {
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

    // Answer interval settings (in seconds)
    const [answerIntervalMin, setAnswerIntervalMin] = useState(3);
    const [answerIntervalMax, setAnswerIntervalMax] = useState(10);

    const stopRef = useRef(false);
    const usersRef = useRef<TestUser[]>([]);
    const sessionChannelRef = useRef<any>(null);
    const firstBotFinishedRef = useRef(false);

    const addLog = useCallback((message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 199)]);
    }, []);

    // Random delay between min and max milliseconds
    const randomDelayRange = (minMs: number, maxMs: number) =>
        new Promise(resolve => setTimeout(resolve, minMs + Math.random() * (maxMs - minMs)));

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

    // Subscribe to session changes (detect game end)
    const subscribeToSession = (sessionId: string) => {
        sessionChannelRef.current = supabaseB
            .channel(`stress-test-session-${sessionId}`)
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
                (payload) => {
                    const newStatus = payload.new?.status;
                    if (newStatus === "finish") {
                        addLog("🛑 Host ended the game!");
                        setGameEnded(true);
                        stopRef.current = true;
                        // Mark all users as completed when game ends
                        usersRef.current.forEach(user => {
                            if (!user.completed) {
                                user.completed = true;
                            }
                        });
                        setCompletedCount(usersRef.current.length);
                    } else if (newStatus === "active") {
                        addLog("🚀 Game started by host!");
                    }
                }
            )
            .on(
                "postgres_changes",
                { event: "DELETE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
                () => {
                    addLog("🗑️ Session deleted by host!");
                    setGameEnded(true);
                    stopRef.current = true;
                }
            )
            .subscribe();
    };

    // Phase 1: Join all users CONCURRENTLY with random delays (1-10s each)
    const joinUsersConcurrently = async (sessionId: string) => {
        addLog(`🚀 Joining ${userCount} users concurrently (1-10s delays)...`);

        const joinPromises = Array.from({ length: userCount }, async (_, i) => {
            // Each bot has random delay 1-10 seconds
            await randomDelayRange(1000, 10000);

            if (stopRef.current) return null;

            const userId = generateXID();
            const nickname = generateRandomNickname();
            // Use DiceBear micah avatar (matching join-game-dialog.tsx pattern)
            const avatar = ANIMAL_AVATARS[Math.floor(Math.random() * ANIMAL_AVATARS.length)];

            const { error } = await supabaseB
                .from("participant")
                .insert({
                    id: userId,
                    game_id: sessionId,
                    nickname,
                    avatar,
                    score: 0,
                    questions_answered: 0,
                });

            if (error) {
                setErrorCount(prev => prev + 1);
                addLog(`❌ ${nickname} failed to join`);
                return null;
            }

            setJoinedCount(prev => prev + 1);
            addLog(`✅ ${nickname} joined`);
            return { id: userId, nickname, currentQuestion: 0, completed: false } as TestUser;
        });

        const results = await Promise.all(joinPromises);
        const users = results.filter(Boolean) as TestUser[];
        usersRef.current = users;
        addLog(`📊 Total joined: ${users.length} users`);
    };

    // Phase 2: Lobby - Wait for game to start (silent polling, NO avatar changes)
    const waitForGameStart = async () => {
        addLog("⏳ Waiting for host to start game...");

        while (!stopRef.current) {
            // Silent check - don't log every poll
            const sess = await fetchSession(roomCode);
            if (sess?.status === "active") {
                addLog("🎮 Game started! Bots will answer...");
                break;
            }
            // Check every 3 seconds
            await randomDelayRange(2500, 3500);
        }
    };

    // Phase 3: Each bot answers independently with configurable intervals
    // Game ends when FIRST bot finishes (one finishes = all finish)
    const answerQuestionsIndependently = async (sessionId: string, totalQuestions: number) => {
        // Score: max 100, each question worth 100/totalQuestions
        const scorePerQuestion = Math.round(100 / totalQuestions);

        addLog(`📝 Starting game with ${totalQuestions} questions...`);
        addLog(`🎯 Score per correct answer: ${scorePerQuestion} (max 100)`);
        addLog(`🤖 Each bot thinks independently (${answerIntervalMin}-${answerIntervalMax}s per answer)...`);

        // Reset first bot finished ref
        firstBotFinishedRef.current = false;

        // Each bot runs independently
        const botPromises = usersRef.current.map(async (user) => {
            for (let qIndex = 0; qIndex < totalQuestions; qIndex++) {
                if (stopRef.current || user.completed) break;

                // Random thinking time based on user settings
                await randomDelayRange(answerIntervalMin * 1000, answerIntervalMax * 1000);
                if (stopRef.current) break;

                const isCorrect = Math.random() > 0.3; // 70% correct rate
                const score = isCorrect ? scorePerQuestion : 0;

                const isLastQuestion = qIndex === totalQuestions - 1;

                try {
                    // Get current participant data
                    const { data: currentData } = await supabaseB
                        .from("participant")
                        .select("score, questions_answered, answers")
                        .eq("id", user.id)
                        .single();

                    if (stopRef.current) break;

                    const currentScore = currentData?.score || 0;
                    const currentQuestionsAnswered = currentData?.questions_answered || 0;

                    // Build new answer object
                    const newAnswer = {
                        id: generateXID(),
                        correct: isCorrect,
                        answer_id: String(Math.floor(Math.random() * 4)), // Random answer 0-3
                        question_id: `q-${qIndex + 1}` // Simulated question ID
                    };

                    // Append to existing answers array
                    const existingAnswers = Array.isArray(currentData?.answers) ? (currentData?.answers || []) : [];
                    const updatedAnswers = [...existingAnswers, newAnswer];

                    // Update participant score, questions_answered, and answers
                    await supabaseB
                        .from("participant")
                        .update({
                            score: currentScore + score,
                            questions_answered: currentQuestionsAnswered + 1,
                            answers: updatedAnswers,
                        })
                        .eq("id", user.id);

                    if (stopRef.current) break;

                    user.currentQuestion = qIndex + 1;
                    addLog(`${user.nickname} → Q${qIndex + 1} ${isCorrect ? "✓" : "✗"}`);
                    setAnsweringCount(prev => Math.max(prev, qIndex + 1));

                    if (isLastQuestion) {
                        user.completed = true;
                        setCompletedCount(prev => prev + 1);

                        // 🚀 TRIGGER GAME END: When first bot finishes, end game for all
                        if (!firstBotFinishedRef.current && !stopRef.current) {
                            firstBotFinishedRef.current = true;
                            stopRef.current = true; // Stop all other bots IMMEDIATELY
                            addLog(`🏁 ${user.nickname} finished first! Ending game...`);

                            try {
                                // Use finalizeGame which handles:
                                // 1. Update status to 'finish' in Supabase B
                                // 2. Sync participants to main Supabase A (INSERT if not exists, UPDATE if exists)
                                addLog(`📍 Finalizing game session ${sessionId}...`);

                                const syncSuccess = await finalizeGame(sessionId);

                                if (syncSuccess) {
                                    addLog(`✅ Game finalized and synced to main database!`);
                                } else {
                                    addLog(`⚠️ Game ended but sync may have failed`);
                                }

                                // Set completed count to all joined users
                                setCompletedCount(usersRef.current.length);
                                setGameEnded(true);
                            } catch (err) {
                                console.error('Error ending game:', err);
                                addLog(`❌ Error ending game: ${err}`);
                            }
                        }
                    }
                } catch (err) {
                    if (!stopRef.current) {
                        setErrorCount(prev => prev + 1);
                        addLog(`❌ ${user.nickname} error on Q${qIndex + 1}`);
                    }
                }
            }
        });

        await Promise.all(botPromises);
        if (!firstBotFinishedRef.current) {
            addLog(`🎉 All bots completed!`);
        }
    };

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
        setLogs([]);
        setJoinedCount(0);
        setAnsweringCount(0);
        setCompletedCount(0);
        setErrorCount(0);
        usersRef.current = [];

        addLog(`🧪 Starting stress test: ${roomCode}`);

        const sess = await fetchSession(roomCode);
        if (!sess) {
            setIsRunning(false);
            return;
        }
        setSession(sess);
        subscribeToSession(sess.id);
        addLog(`✅ Session found: ${sess.status} - ${sess.quiz_title}`);

        await joinUsersConcurrently(sess.id);
        if (stopRef.current) { setIsRunning(false); return; }

        if (sess.status === "waiting") {
            await waitForGameStart();
        }
        if (stopRef.current) { setIsRunning(false); return; }

        // Get question count from settings
        const questionCount = sess.settings?.questionCount || 10;
        await answerQuestionsIndependently(sess.id, questionCount);

        setIsRunning(false);
        if (!stopRef.current) addLog("🎉 Test completed successfully!");
    };

    const stopTest = () => {
        stopRef.current = true;
        if (sessionChannelRef.current) {
            supabaseB.removeChannel(sessionChannelRef.current);
        }
        addLog("⛔ Test stopped");
    };

    const cleanupUsers = async () => {
        if (!session?.id) return;
        setIsCleaningUp(true);
        addLog("🧹 Cleaning up bots...");

        await supabaseB
            .from("participant")
            .delete()
            .eq("game_id", session.id)
            .like("nickname", "Bot_%");

        addLog("✅ Cleanup complete");
        usersRef.current = [];
        setJoinedCount(0);
        setCompletedCount(0);
        setIsCleaningUp(false);
        setShowCleanupDialog(false);
    };

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
                {/* Stars */}
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
                {/* Nebula glow effects */}
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

                            {/* Answer Interval Settings */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-cyan-300 font-medium">
                                        Min Interval: <span className="text-purple-400">{answerIntervalMin}s</span>
                                    </label>
                                    <Slider
                                        value={[answerIntervalMin]}
                                        onValueChange={([v]) => {
                                            setAnswerIntervalMin(v);
                                            if (v > answerIntervalMax) setAnswerIntervalMax(v);
                                        }}
                                        min={1}
                                        max={30}
                                        step={1}
                                        disabled={isRunning}
                                        className="mt-3"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-cyan-300 font-medium">
                                        Max Interval: <span className="text-purple-400">{answerIntervalMax}s</span>
                                    </label>
                                    <Slider
                                        value={[answerIntervalMax]}
                                        onValueChange={([v]) => {
                                            setAnswerIntervalMax(v);
                                            if (v < answerIntervalMin) setAnswerIntervalMin(v);
                                        }}
                                        min={1}
                                        max={60}
                                        step={1}
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
                                        <div
                                            key={i}
                                            className={`${log.includes("✓") || log.includes("✅") ? "text-green-400" :
                                                log.includes("✗") || log.includes("❌") ? "text-red-400" :
                                                    log.includes("🏁") ? "text-yellow-400" :
                                                        log.includes("🚀") ? "text-cyan-400" :
                                                            log.includes("🎉") ? "text-pink-400" :
                                                                "text-gray-300"
                                                }`}
                                        >
                                            {log}
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

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
