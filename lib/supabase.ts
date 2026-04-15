import { createClient } from "@supabase/supabase-js"

/**
 * Simpan access_token + refresh_token ke shared cookie (.gameforsmart.com)
 * Format: access_token|refresh_token (~1.5KB, aman di bawah batas 4KB)
 */
export function syncSessionCookie(tokens: { access_token: string; refresh_token: string } | null) {
    if (typeof document === 'undefined') return;
    const hostname = window.location.hostname;
    const isGfs = hostname.endsWith('gameforsmart.com');
    const isHttps = window.location.protocol === 'https:';

    if (!tokens) {
        // Hapus cookie dengan parameter yang persis sama saat dibuat agar browser (Chrome/Safari) mengizinkan penghapusan
        const parts = [
            `gfs-session=`,
            `path=/`,
            `expires=Thu, 01 Jan 1970 00:00:00 GMT`,
            `max-age=0`,
            `SameSite=Lax`
        ];
        if (isGfs) parts.push(`domain=.gameforsmart.com`);
        if (isHttps) parts.push(`Secure`);
        
        document.cookie = parts.join('; ');
        return;
    }

    const value = `${tokens.access_token}|${tokens.refresh_token}`;
    const parts = [
        `gfs-session=${encodeURIComponent(value)}`,
        `path=/`,
        `max-age=${60 * 60 * 24 * 365}`,
        `SameSite=Lax`,
    ];
    if (isGfs) parts.push(`domain=.gameforsmart.com`);
    if (isHttps) parts.push(`Secure`);
    document.cookie = parts.join('; ');
}

/**
 * Baca access_token + refresh_token dari shared cookie
 */
export function getSessionFromCookie(): { access_token: string; refresh_token: string } | null {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split('; ');
    const found = cookies.find(c => c.startsWith('gfs-session='));
    if (!found) return null;
    try {
        const eqIndex = found.indexOf('=');
        const value = decodeURIComponent(found.substring(eqIndex + 1));
        const pipeIndex = value.indexOf('|');
        if (pipeIndex === -1) return null;
        const access_token = value.substring(0, pipeIndex);
        const refresh_token = value.substring(pipeIndex + 1);
        if (!access_token || !refresh_token) return null;
        return { access_token, refresh_token };
    } catch {
        return null;
    }
}

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

}

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    storageKey: 'gfs-auth-token',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
})

export type Database = {
  public: {
    Tables: {
      game_sessions: {
        Row: {
          id: string
          quiz_id: string
          host_id: string
          game_pin: string
          status: "waiting" | "active" | "finished"
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
          status?: "waiting" | "active" | "finished"
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
          status?: "waiting" | "active" | "finished"
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
