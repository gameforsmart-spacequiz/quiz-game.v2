import { supabaseB, GameSession, GameSessionInsert, GameSessionUpdate, isSupabaseBAvailable } from './supabase-b'
import { generateXID } from './id-generator'
import { generateGameCode } from './game-utils'

/**
 * API functions untuk mengelola game sessions di Supabase B
 * Tabel: sessions
 */

const TABLE_NAME = 'sessions'

// ============================================
// CREATE Operations
// ============================================

/**
 * Membuat session game baru
 */
export async function createGameSession(data: GameSessionInsert): Promise<GameSession | null> {
    if (!isSupabaseBAvailable()) {
        console.warn('[Sessions] Supabase B client not available')
        return null
    }

    const sessionId = data.id || generateXID()
    const gamePin = data.game_pin || generateGameCode()

    const sessionData: GameSessionInsert = {
        ...data,
        id: sessionId,
        game_pin: gamePin,
        status: data.status ?? 'waiting',
        countdown_position_mode: data.countdown_position_mode ?? 0,
        timestamps: data.timestamps ?? {
            created_at: new Date().toISOString(),
        },
        settings: data.settings ?? {},
    }

    const { data: session, error } = await supabaseB
        .from(TABLE_NAME)
        .insert(sessionData)
        .select()
        .single()

    if (error) {
        console.error('[Sessions] Error creating session:', error)
        return null
    }

    console.log('[Sessions] Session created:', session.id, 'Game PIN:', session.game_pin)
    return session as GameSession
}

// ============================================
// READ Operations
// ============================================

/**
 * Mendapatkan session berdasarkan ID
 */
export async function getGameSessionById(sessionId: string): Promise<GameSession | null> {
    if (!isSupabaseBAvailable()) return null

    const { data, error } = await supabaseB
        .from(TABLE_NAME)
        .select('*')
        .eq('id', sessionId)
        .single()

    if (error) {
        console.error('[Sessions] Error fetching session:', error)
        return null
    }

    return data as GameSession
}

/**
 * Mendapatkan session berdasarkan game PIN
 */
export async function getGameSessionByPin(gamePin: string): Promise<GameSession | null> {
    if (!isSupabaseBAvailable()) return null

    const { data, error } = await supabaseB
        .from(TABLE_NAME)
        .select('*')
        .eq('game_pin', gamePin.toUpperCase())
        .single()

    if (error) {
        if (error.code === 'PGRST116') {
            // No rows found - not an error, just no session with that PIN
            return null
        }
        console.error('[Sessions] Error fetching session by PIN:', error)
        return null
    }

    return data as GameSession
}

/**
 * Mendapatkan session berdasarkan host ID
 */
export async function getGameSessionsByHostId(hostId: string): Promise<GameSession[]> {
    if (!isSupabaseBAvailable()) return []

    const { data, error } = await supabaseB
        .from(TABLE_NAME)
        .select('*')
        .eq('host_id', hostId)
        .order('timestamps->created_at', { ascending: false })

    if (error) {
        console.error('[Sessions] Error fetching sessions by host:', error)
        return []
    }

    return data as GameSession[]
}

/**
 * Mendapatkan session aktif (waiting atau active)
 */
export async function getActiveGameSessions(): Promise<GameSession[]> {
    if (!isSupabaseBAvailable()) return []

    const { data, error } = await supabaseB
        .from(TABLE_NAME)
        .select('*')
        .in('status', ['waiting', 'active'])
        .order('timestamps->created_at', { ascending: false })

    if (error) {
        console.error('[Sessions] Error fetching active sessions:', error)
        return []
    }

    return data as GameSession[]
}

/**
 * Check apakah game PIN sudah digunakan
 */
export async function isGamePinTaken(gamePin: string): Promise<boolean> {
    const session = await getGameSessionByPin(gamePin)
    return session !== null
}

// ============================================
// UPDATE Operations
// ============================================

/**
 * Update session
 */
export async function updateGameSession(sessionId: string, updates: GameSessionUpdate): Promise<GameSession | null> {
    if (!isSupabaseBAvailable()) return null

    const { data, error } = await supabaseB
        .from(TABLE_NAME)
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single()

    if (error) {
        console.error('[Sessions] Error updating session:', error)
        return null
    }

    return data as GameSession
}

/**
 * Update session status
 */
export async function updateGameSessionStatus(
    sessionId: string,
    status: 'waiting' | 'active' | 'finish'
): Promise<GameSession | null> {
    const now = new Date().toISOString()
    const updates: GameSessionUpdate = { status }

    // Update timestamps based on status change
    const session = await getGameSessionById(sessionId)
    if (session) {
        const timestamps = session.timestamps ? { ...session.timestamps } : { created_at: now }

        switch (status) {
            case 'active':
                timestamps.started_at = now
                break
            case 'finish':
                timestamps.ended_at = now
                break
        }

        updates.timestamps = timestamps
    }

    return updateGameSession(sessionId, updates)
}

/**
 * Start game (set to active)
 */
export async function startGame(sessionId: string): Promise<GameSession | null> {
    return updateGameSessionStatus(sessionId, 'active')
}

/**
 * End game (set to finish) - tanpa sinkronisasi
 */
export async function endGame(sessionId: string): Promise<GameSession | null> {
    return updateGameSessionStatus(sessionId, 'finish')
}

/**
 * End game dan sinkronkan data ke Supabase Utama
 * Panggil fungsi ini saat game benar-benar selesai untuk menyimpan hasil permanen
 */
export async function endGameAndSync(sessionId: string): Promise<{ session: GameSession | null; synced: boolean }> {
    // Import sync manager dynamically untuk menghindari circular dependency
    const { finalizeGame } = await import('./sync-manager')

    // 1. Sync data ke Supabase Utama
    const synced = await finalizeGame(sessionId)

    // 2. Update status di Supabase B
    const session = await updateGameSessionStatus(sessionId, 'finish')

    return { session, synced }
}

/**
 * Update game settings
 */
export async function updateGameSessionSettings(sessionId: string, settings: any): Promise<GameSession | null> {
    return updateGameSession(sessionId, { settings })
}

/**
 * Update question order
 */
export async function updateQuestionOrder(sessionId: string, questionOrder: number[]): Promise<GameSession | null> {
    return updateGameSession(sessionId, { question_order: questionOrder })
}

// ============================================
// DELETE Operations
// ============================================

/**
 * Hapus session
 */
export async function deleteGameSession(sessionId: string): Promise<boolean> {
    if (!isSupabaseBAvailable()) return false

    const { error } = await supabaseB
        .from(TABLE_NAME)
        .delete()
        .eq('id', sessionId)

    if (error) {
        console.error('[Sessions] Error deleting session:', error)
        return false
    }

    console.log('[Sessions] Session deleted:', sessionId)
    return true
}

/**
 * Hapus session yang sudah selesai dan lebih tua dari waktu tertentu
 */
export async function cleanupOldSessions(hoursOld: number = 24): Promise<number> {
    if (!isSupabaseBAvailable()) return 0

    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - hoursOld)

    const { data, error } = await supabaseB
        .from(TABLE_NAME)
        .delete()
        .eq('status', 'finish')
        .lt('timestamps->ended_at', cutoffTime.toISOString())
        .select('id')

    if (error) {
        console.error('[Sessions] Error cleaning up old sessions:', error)
        return 0
    }

    const count = data?.length || 0
    console.log(`[Sessions] Cleaned up ${count} old sessions`)
    return count
}

// ============================================
// REALTIME Subscriptions
// ============================================

/**
 * Subscribe ke perubahan session tertentu
 */
export function subscribeToGameSession(
    sessionId: string,
    onUpdate?: (session: GameSession) => void,
    onDelete?: () => void
) {
    if (!isSupabaseBAvailable()) {
        console.warn('[Sessions] Supabase B client not available for subscription')
        return null
    }

    const channel = supabaseB
        .channel(`session-${sessionId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: TABLE_NAME,
                filter: `id=eq.${sessionId}`,
            },
            (payload) => {
                if (onUpdate) onUpdate(payload.new as GameSession)
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'DELETE',
                schema: 'public',
                table: TABLE_NAME,
                filter: `id=eq.${sessionId}`,
            },
            () => {
                if (onDelete) onDelete()
            }
        )
        .subscribe()

    return channel
}

/**
 * Subscribe ke session berdasarkan game PIN
 */
export function subscribeToGameSessionByPin(
    gamePin: string,
    onUpdate?: (session: GameSession) => void
) {
    if (!isSupabaseBAvailable()) {
        console.warn('[Sessions] Supabase B client not available for subscription')
        return null
    }

    const channel = supabaseB
        .channel(`session-pin-${gamePin}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: TABLE_NAME,
                filter: `game_pin=eq.${gamePin.toUpperCase()}`,
            },
            (payload) => {
                if (payload.eventType !== 'DELETE' && onUpdate) {
                    onUpdate(payload.new as GameSession)
                }
            }
        )
        .subscribe()

    return channel
}

/**
 * Unsubscribe dari channel
 */
export async function unsubscribeFromGameSession(channel: ReturnType<typeof supabaseB.channel>) {
    if (channel) {
        await channel.unsubscribe()
    }
}
