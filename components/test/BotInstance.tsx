"use client";

import { useEffect, useRef } from "react";
import { supabaseB } from "@/lib/supabase-b";
import { generateXID } from "@/lib/id-generator";

// ========== BOT BRAIN (IQ-based intelligence) ==========
class BotBrain {
    iq: number;

    constructor() {
        // Bell curve distribution: mean=100, stddev=15, range 70-130
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        this.iq = Math.max(70, Math.min(130, Math.round(100 + z * 15)));
    }

    // Join delay: IQ 70 → 8-10s, IQ 130 → 1-3s
    getJoinDelay(): number {
        const factor = (130 - this.iq) / 60;
        const min = 1000 + factor * 7000;
        const max = 3000 + factor * 7000;
        return min + Math.random() * (max - min);
    }

    // Answer delay: IQ 70 → 8-15s, IQ 130 → 3-6s
    getAnswerDelay(): number {
        const factor = (130 - this.iq) / 60;
        const min = 3000 + factor * 5000;
        const max = 6000 + factor * 9000;
        return min + Math.random() * (max - min);
    }

    // Accuracy: IQ 70 → 40%, IQ 130 → 95%
    getAccuracy(): number {
        return 0.4 + ((this.iq - 70) / 60) * 0.55;
    }

    chooseAnswer(correctIndex: number, totalOptions: number = 4): number {
        if (Math.random() < this.getAccuracy()) {
            return correctIndex;
        }
        return Math.floor(Math.random() * totalOptions);
    }
}

// ========== HELPER ==========
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ========== BOT INSTANCE COMPONENT ==========
export interface BotInstanceProps {
    botId: number;
    sessionId: string;
    avatarOptions: string[];
    nicknameGenerator: { generate: () => string };
    onJoined: (nickname: string) => void;
    onAnswered: (nickname: string, questionIndex: number) => void;
    onCompleted: (nickname: string) => void;
    onError: (nickname: string, error: string) => void;
    stopSignal: React.MutableRefObject<boolean>;
    gameStatus: React.MutableRefObject<string>;
}

export function BotInstance({
    botId,
    sessionId,
    avatarOptions,
    nicknameGenerator,
    onJoined,
    onAnswered,
    onCompleted,
    onError,
    stopSignal,
    gameStatus,
}: BotInstanceProps) {
    // Store all props in refs to avoid dependency issues
    const propsRef = useRef({
        botId,
        sessionId,
        avatarOptions,
        nicknameGenerator,
        onJoined,
        onAnswered,
        onCompleted,
        onError,
        stopSignal,
        gameStatus,
    });

    // Update refs when props change
    propsRef.current = {
        botId,
        sessionId,
        avatarOptions,
        nicknameGenerator,
        onJoined,
        onAnswered,
        onCompleted,
        onError,
        stopSignal,
        gameStatus,
    };

    // Use refs that are regenerated on each mount
    const participantIdRef = useRef<string | null>(null);
    const nicknameRef = useRef("");
    const brainRef = useRef<BotBrain | null>(null);

    useEffect(() => {
        // Generate new IDs for each mount (fixes React Strict Mode issue)
        participantIdRef.current = generateXID();
        brainRef.current = new BotBrain();

        const brain = brainRef.current;
        const participantId = participantIdRef.current;

        console.log(`[Bot ${botId}] Mounted with IQ ${brain.iq}`);

        let mounted = true;

        const runBot = async () => {
            const props = propsRef.current;

            try {
                // ========== PHASE 1: JOIN ==========
                const joinDelay = brain.getJoinDelay();
                console.log(`[Bot ${botId}] Waiting ${Math.round(joinDelay / 1000)}s to join...`);

                await delay(joinDelay);

                // Check both mounted and stopSignal
                if (!mounted) {
                    console.log(`[Bot ${botId}] Unmounted, stopping`);
                    return;
                }
                if (props.stopSignal.current) {
                    console.log(`[Bot ${botId}] Stop signal received`);
                    return;
                }

                nicknameRef.current = props.nicknameGenerator.generate();
                const avatar = props.avatarOptions[Math.floor(Math.random() * props.avatarOptions.length)];

                console.log(`[Bot ${botId}] Joining as "${nicknameRef.current}"...`);

                const { error: joinError } = await supabaseB.from("participant").insert({
                    id: participantId,
                    game_id: props.sessionId,
                    nickname: nicknameRef.current,
                    avatar,
                    score: 0,
                    questions_answered: 0,
                    answers: [],
                });

                if (joinError) {
                    console.error(`[Bot ${botId}] Join error:`, joinError);
                    props.onError(nicknameRef.current || `Bot#${botId}`, joinError.message);
                    return;
                }

                console.log(`[Bot ${botId}] Joined!`);
                props.onJoined(nicknameRef.current);

                // ========== PHASE 2: WAIT FOR GAME TO START ==========
                while (props.gameStatus.current === "waiting" && !props.stopSignal.current && mounted) {
                    await delay(500);
                }

                while (props.gameStatus.current !== "active" && !props.stopSignal.current && mounted) {
                    await delay(500);
                }

                if (!mounted || props.stopSignal.current) return;

                // Wait 5 seconds after game starts to ensure questions are loaded
                // console.log(`[Bot ${botId}] Game active! Waiting 5s for questions to load...`);
                await delay(5000);
                if (!mounted || props.stopSignal.current) return;

                // ========== PHASE 3: FETCH QUESTIONS ==========
                const { data: sessData, error: sessError } = await supabaseB
                    .from("sessions")
                    .select("current_questions")
                    .eq("id", props.sessionId)
                    .single();

                if (sessError || !sessData?.current_questions?.length) {
                    props.onError(nicknameRef.current, "No questions available");
                    return;
                }

                const questions = sessData.current_questions;
                const totalQuestions = questions.length;
                const scorePerQuestion = Math.max(1, Math.floor(100 / totalQuestions));

                // ========== PHASE 4: ANSWER QUESTIONS ==========
                for (let qIndex = 0; qIndex < totalQuestions; qIndex++) {
                    if (!mounted || props.stopSignal.current) break;

                    await delay(brain.getAnswerDelay());
                    if (!mounted || props.stopSignal.current) break;

                    const question = questions[qIndex];
                    const correctIndex = parseInt(question.correct, 10);
                    const chosenAnswer = brain.chooseAnswer(correctIndex, 4);
                    const isCorrect = chosenAnswer === correctIndex;
                    const score = isCorrect ? scorePerQuestion : 0;

                    const newAnswer = {
                        id: generateXID(),
                        correct: isCorrect,
                        answer_id: chosenAnswer.toString(),
                        question_id: question.id,
                    };

                    const isLastQuestion = qIndex === totalQuestions - 1;

                    try {
                        const { data: currentData } = await supabaseB
                            .from("participant")
                            .select("score, questions_answered, answers")
                            .eq("id", participantId)
                            .single();

                        if (!mounted || props.stopSignal.current) break;

                        const currentScore = currentData?.score || 0;
                        const currentQuestionsAnswered = currentData?.questions_answered || 0;
                        const existingAnswers = Array.isArray(currentData?.answers) ? (currentData?.answers ?? []) : [];
                        const updatedAnswers = [...existingAnswers, newAnswer];

                        await supabaseB
                            .from("participant")
                            .update({
                                score: currentScore + score,
                                questions_answered: currentQuestionsAnswered + 1,
                                answers: updatedAnswers,
                            })
                            .eq("id", participantId);

                        if (!mounted || props.stopSignal.current) break;

                        props.onAnswered(nicknameRef.current, qIndex + 1);

                        if (isLastQuestion) {
                            props.onCompleted(nicknameRef.current);
                        }
                    } catch (err: any) {
                        if (!props.stopSignal.current) {
                            props.onError(nicknameRef.current, err.message || "Answer failed");
                        }
                    }
                }
            } catch (err: any) {
                console.error(`[Bot ${botId}] Error:`, err);
                propsRef.current.onError(nicknameRef.current || `Bot#${botId}`, err.message || "Unknown error");
            }
        };

        runBot();

        return () => {
            console.log(`[Bot ${botId}] Unmounting...`);
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - runs once on mount

    return null;
}
