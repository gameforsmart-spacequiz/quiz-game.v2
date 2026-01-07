import { createClient, SupabaseClient } from "@supabase/supabase-js"

/**
 * Supabase B Client - untuk data participant dan game sessions
 * Database ini terpisah dari database utama (quizzes, profiles)
 * Digunakan untuk menyimpan data game yang bersifat temporary
 */

// Environment variables untuk Supabase B (Database kedua)
const supabaseBUrl = process.env.NEXT_PUBLIC_SUPABASE_B_URL
const supabaseBAnonKey = process.env.NEXT_PUBLIC_SUPABASE_B_ANON_KEY

// Build-time check
const isBuildTime = process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build'

// Validate environment variables
if (!supabaseBUrl || !supabaseBAnonKey) {
    const missingVars: string[] = []
    if (!supabaseBUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_B_URL')
    if (!supabaseBAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_B_ANON_KEY')

    if (isBuildTime) {
        console.warn(`⚠️  Missing Supabase B environment variables during build: ${missingVars.join(', ')}`)
        console.warn('⚠️  Using placeholder values for build. Make sure to set environment variables in production.')
    } else {
        console.warn(
            `⚠️  Missing Supabase B environment variables: ${missingVars.join(', ')}\n` +
            `Game features (participant, sessions) may not work.\n` +
            `Add these to your .env.local:\n` +
            `NEXT_PUBLIC_SUPABASE_B_URL=your_supabase_b_url\n` +
            `NEXT_PUBLIC_SUPABASE_B_ANON_KEY=your_supabase_b_anon_key`
        )
    }
}

// Use actual values or placeholders for build
const finalBUrl = supabaseBUrl || 'https://placeholder.supabase.co'
const finalBKey = supabaseBAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'

// Create Supabase B client
export const supabaseB: SupabaseClient = createClient(finalBUrl, finalBKey, {
    realtime: {
        params: {
            eventsPerSecond: 100,
        },
    },
    auth: {
        persistSession: false, // This database doesn't need auth persistence
    },
})

// ============================================
// TypeScript Types for Database B Tables
// ============================================

/**
 * Participant data stored in participant table
 */
export interface Participant {
    id: string              // XID - unique participant ID
    game_id: string         // XID - game session ID
    user_id: string | null  // XID - link to profiles if logged in
    nickname: string        // Player display name
    avatar: string          // Avatar image URL
    score: number           // Current score
    questions_answered: number  // Number of questions answered
    joined_at: string       // Timestamp when joined
    answers: { id: string; correct: boolean; answer_id: string; question_id: string }[] | null  // Array of answer objects
}

export interface ParticipantInsert {
    id?: string
    game_id: string
    user_id?: string | null
    nickname: string
    avatar: string
    score?: number
    questions_answered?: number
    joined_at?: string
}

export interface ParticipantUpdate {
    nickname?: string
    avatar?: string
    score?: number
    questions_answered?: number
    answers?: { id: string; correct: boolean; answer_id: string; question_id: string }[] | null
}

/**
 * Session data stored in sessions table
 */
export interface GameSession {
    id: string                    // XID - session ID
    game_pin: string              // Game join code (6 characters)
    host_id: string               // XID - host player ID
    quiz_id: string               // Reference to quiz
    quiz_title: string            // Quiz title for display
    status: 'waiting' | 'active' | 'finish'
    time_limit_title_status: string
    settings: any                 // JSON game settings
    question_order: number[] | null
    game_end_mode: 'time' | 'questions' | null
    current_questions: any[] | null  // Shuffled quiz questions for this session
    timestamps: {
        created_at: string
        started_at?: string
        ended_at?: string
    } | null
    countdown_position_mode: number
}

export interface GameSessionInsert {
    id?: string
    game_pin: string
    host_id: string
    quiz_id: string
    quiz_title: string
    status?: 'waiting' | 'active' | 'finish'
    time_limit_title_status?: string
    settings?: any
    question_order?: number[] | null
    game_end_mode?: 'time' | 'questions' | null
    current_questions?: any[] | null
    timestamps?: any
    countdown_position_mode?: number
}

export interface GameSessionUpdate {
    status?: 'waiting' | 'active' | 'finish'
    time_limit_title_status?: string
    settings?: any
    question_order?: number[] | null
    game_end_mode?: 'time' | 'questions' | null
    timestamps?: any
    countdown_position_mode?: number
}

// ============================================
// Database Type Definition
// ============================================

export type DatabaseB = {
    public: {
        Tables: {
            participant: {
                Row: Participant
                Insert: ParticipantInsert
                Update: ParticipantUpdate
            }
            sessions: {
                Row: GameSession
                Insert: GameSessionInsert
                Update: GameSessionUpdate
            }
        }
    }
}

// Helper to check if Supabase B client is available
export function isSupabaseBAvailable(): boolean {
    return !!(supabaseBUrl && supabaseBAnonKey)
}
