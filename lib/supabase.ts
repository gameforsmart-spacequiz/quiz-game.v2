import { createClient } from "@supabase/supabase-js"

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = []
  if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  
  throw new Error(
    `❌ Missing required Supabase environment variables: ${missingVars.join(', ')}\n\n` +
    `Please create a .env.local file with:\n` +
    `NEXT_PUBLIC_SUPABASE_URL=your_supabase_url\n` +
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key\n\n` +
    `Get these values from: https://supabase.com/dashboard -> Your Project -> Settings -> API`
  )
}

// Validate URL format
try {
  new URL(supabaseUrl)
} catch {
  throw new Error(
    `❌ Invalid NEXT_PUBLIC_SUPABASE_URL format: ${supabaseUrl}\n` +
    `Expected format: https://your-project-id.supabase.co`
  )
}

// Validate anon key format (basic check)
if (!supabaseAnonKey.startsWith('eyJ')) {
  throw new Error(
    `❌ Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY format\n` +
    `Expected JWT token starting with 'eyJ'`
  )
}

console.log('✅ Supabase configured successfully:', supabaseUrl)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          code: string
          quiz_id: number
          status: "waiting" | "playing" | "finished"
          created_at: string
          host_id?: string
          time_limit?: number
          question_count?: number
        }
        Insert: {
          id?: string
          code: string
          quiz_id: number
          status?: "waiting" | "playing" | "finished"
          created_at?: string
          host_id?: string
          time_limit?: number
          question_count?: number
        }
        Update: {
          id?: string
          code?: string
          quiz_id?: number
          status?: "waiting" | "playing" | "finished"
          created_at?: string
          host_id?: string
          time_limit?: number
          question_count?: number
        }
      }
      players: {
        Row: {
          id: string
          game_id: string
          name: string
          avatar: string
          score: number
          current_question: number
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          name: string
          avatar: string
          score?: number
          current_question?: number
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          name?: string
          avatar?: string
          score?: number
          current_question?: number
          created_at?: string
        }
      }
      answers: {
        Row: {
          id: string
          player_id: string
          question_id: number
          answer: string
          is_correct: boolean
          created_at: string
        }
        Insert: {
          id?: string
          player_id: string
          question_id: number
          answer: string
          is_correct: boolean
          created_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          question_id?: number
          answer?: string
          is_correct?: boolean
          created_at?: string
        }
      }
    }
  }
}
