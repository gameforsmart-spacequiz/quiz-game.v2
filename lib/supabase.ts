import { createClient } from "@supabase/supabase-js"

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// For build time, provide default values to prevent build failures
const isBuildTime = process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build'

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = []
  if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  
  if (isBuildTime) {
    console.warn(`⚠️  Missing Supabase environment variables during build: ${missingVars.join(', ')}`)
    console.warn('⚠️  Using placeholder values for build. Make sure to set environment variables in production.')
  } else {
    throw new Error(
      `❌ Missing required Supabase environment variables: ${missingVars.join(', ')}\n\n` +
      `Please create a .env.local file with:\n` +
      `NEXT_PUBLIC_SUPABASE_URL=your_supabase_url\n` +
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key\n\n` +
      `Get these values from: https://supabase.com/dashboard -> Your Project -> Settings -> API`
    )
  }
}

// Use actual values or placeholders for build
const finalUrl = supabaseUrl || 'https://placeholder.supabase.co'
const finalKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDU5NzQ0MDAsImV4cCI6MTk2MTU1MDQwMH0.placeholder'

// Validate URL format (only if not using placeholder)
if (finalUrl !== 'https://placeholder.supabase.co') {
  try {
    new URL(finalUrl)
  } catch {
    throw new Error(
      `❌ Invalid NEXT_PUBLIC_SUPABASE_URL format: ${finalUrl}\n` +
      `Expected format: https://your-project-id.supabase.co`
    )
  }

  // Validate anon key format (basic check)
  if (!finalKey.startsWith('eyJ')) {
    throw new Error(
      `❌ Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY format\n` +
      `Expected JWT token starting with 'eyJ'`
    )
  }
}

if (!isBuildTime) {
  console.log('✅ Supabase configured successfully:', finalUrl)
}

export const supabase = createClient(finalUrl, finalKey)

export type Database = {
  public: {
    Tables: {
      game_sessions: {
        Row: {
          id: string
          quiz_id: string
          host_id: string
          game_pin: string
          status: "waiting" | "playing" | "finished"
          total_time_minutes: number
          question_limit: string
          game_end_mode: string
          allow_join_after_start: boolean
          participants: any[]
          responses: any[]
          chat_messages: any[]
          created_at: string
          countdown_started_at?: string
          started_at?: string
          ended_at?: string
          current_questions: any[]
          application: string
        }
        Insert: {
          id?: string
          quiz_id: string
          host_id: string
          game_pin: string
          status?: "waiting" | "playing" | "finished"
          total_time_minutes?: number
          question_limit?: string
          game_end_mode?: string
          allow_join_after_start?: boolean
          participants?: any[]
          responses?: any[]
          chat_messages?: any[]
          created_at?: string
          countdown_started_at?: string
          started_at?: string
          ended_at?: string
          current_questions?: any[]
          application?: string
        }
        Update: {
          id?: string
          quiz_id?: string
          host_id?: string
          game_pin?: string
          status?: "waiting" | "playing" | "finished"
          total_time_minutes?: number
          question_limit?: string
          game_end_mode?: string
          allow_join_after_start?: boolean
          participants?: any[]
          responses?: any[]
          chat_messages?: any[]
          created_at?: string
          countdown_started_at?: string
          started_at?: string
          ended_at?: string
          current_questions?: any[]
          application?: string
        }
      }
      quizzes: {
        Row: {
          id: string
          title: string
          description?: string
          category?: string
          language: string
          image_url?: string
          cover_image?: string
          is_public: boolean
          creator_id: string
          questions: any[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          category?: string
          language?: string
          image_url?: string
          cover_image?: string
          is_public?: boolean
          creator_id: string
          questions?: any[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          category?: string
          language?: string
          image_url?: string
          cover_image?: string
          is_public?: boolean
          creator_id?: string
          questions?: any[]
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
