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

    if (!isSupabaseBAvailable()) {
        console.warn('[Sessions] Supabase B client not available, using Main DB fallback')
        return await createFallbackSessionInMainDb(sessionData)
    }

    try {
        const { data: session, error } = await supabaseB
            .from(TABLE_NAME)
            .insert(sessionData)
            .select()
            .single()

        if (error) {
            console.warn('[Sessions] Error creating session in Supabase B, falling back to Main DB:', error.message)
            return await createFallbackSessionInMainDb(sessionData)
        }

        console.log('[Sessions] Session created:', session.id, 'Game PIN:', session.game_pin)
        return session as GameSession
    } catch (err) {
        console.warn('[Sessions] Network error creating session in Supabase B, falling back to Main DB...', err)
        return await createFallbackSessionInMainDb(sessionData)
    }
}

// ============================================
// READ Operations
// ============================================

/**
 * Mendapatkan session berdasarkan ID
 */
export async function getGameSessionById(sessionId: string): Promise<GameSession | null> {
    if (!isSupabaseBAvailable()) return null

    try {
        const { data, error } = await supabaseB
            .from(TABLE_NAME)
            .select('*')
            .eq('id', sessionId)
            .single()

        if (error) {
            // Jika tidak ditemukan atau error lainnya, coba cari di Supabase Utama sebagai fallback
            console.warn('[Sessions] Session not found or error in Supabase B, falling back to Main DB...', error.message)
            return await getFallbackSessionFromMainDb('id', sessionId)
        }

        return data as GameSession
    } catch (err) {
        console.warn('[Sessions] Network error or timeout in Supabase B, falling back to Main DB...', err)
        return await getFallbackSessionFromMainDb('id', sessionId)
    }
}

/**
 * Mendapatkan session berdasarkan game PIN
 */
export async function getGameSessionByPin(gamePin: string): Promise<GameSession | null> {
    if (!isSupabaseBAvailable()) return null

    try {
        const { data, error } = await supabaseB
            .from(TABLE_NAME)
            .select('*')
            .eq('game_pin', gamePin.toUpperCase())
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows found - not an error, just no session with that PIN
                // Coba cari di Supabase Utama sebagai fallback (misal session sudah finish dan disync)
                console.log('[Sessions] PIN not found in Supabase B, checking Main DB fallback...')
                return await getFallbackSessionFromMainDb('game_pin', gamePin.toUpperCase())
            }
            console.warn('[Sessions] Error fetching session by PIN, checking Main DB fallback...', error.message)
            return await getFallbackSessionFromMainDb('game_pin', gamePin.toUpperCase())
        }

        return data as GameSession
    } catch (err) {
        console.warn('[Sessions] Network error or timeout in Supabase B, falling back to Main DB...', err)
        return await getFallbackSessionFromMainDb('game_pin', gamePin.toUpperCase())
    }
}

/**
 * Helper function: Fallback untuk mencari session di Supabase Utama
 * dan mengubah formatnya menjadi format Supabase B (GameSession)
 */
async function getFallbackSessionFromMainDb(field: 'id' | 'game_pin', value: string): Promise<GameSession | null> {
    const { supabase } = await import('./supabase')
    
    const { data: mainData, error: mainError } = await supabase
        .from('game_sessions')
        .select(`
            *,
            quizzes ( title )
        `)
        .eq(field, value)
        .single()

    if (mainError || !mainData) {
        if (mainError && mainError.code !== 'PGRST116') {
            console.error('[Sessions] Fallback error fetching from Main DB:', mainError)
        }
        return null
    }

    console.log(`[Sessions] Fallback SUCCESS: Found session in Main DB for ${field}=${value}`)
    
    // Konversi struktur game_sessions (Main DB) ke struktur GameSession (Supabase B)
    // agar aplikasi tetap bisa membaca data ini dengan format yang ia harapkan.
    return {
        id: mainData.id,
        game_pin: mainData.game_pin,
        host_id: mainData.host_id,
        quiz_id: mainData.quiz_id,
        quiz_title: mainData.quizzes && !Array.isArray(mainData.quizzes) ? mainData.quizzes.title : 'Quiz Title',
        status: mainData.status === 'finished' ? 'finish' : mainData.status as any,
        time_limit_title_status: '',
        settings: {
            timeLimit: mainData.total_time_minutes,
            questionCount: mainData.question_limit,
            application: mainData.application
        },
        question_order: null,
        game_end_mode: mainData.game_end_mode as any,
        current_questions: mainData.current_questions || null,
        timestamps: {
            created_at: mainData.created_at,
            started_at: mainData.started_at,
            ended_at: mainData.ended_at
        },
        countdown_position_mode: 0
    }
}

/**
 * Helper function: Fallback untuk membuat session di Supabase Utama
 */
async function createFallbackSessionInMainDb(data: GameSessionInsert): Promise<GameSession | null> {
    const { supabase } = await import('./supabase')
    
    console.warn('[Sessions] Falling back to creating session in Main DB...', data.game_pin)

    const insertData = {
        id: data.id || generateXID(),
        quiz_id: data.quiz_id,
        host_id: data.host_id,
        game_pin: data.game_pin || generateGameCode(),
        status: data.status === 'finish' ? 'finished' : (data.status || 'waiting'),
        total_time_minutes: data.settings?.timeLimit || 0,
        question_limit: data.settings?.questionCount?.toString() || 'all',
        game_end_mode: data.game_end_mode || 'time',
        application: data.settings?.application || 'space-quiz',
        created_at: data.timestamps?.created_at || new Date().toISOString(),
        current_questions: data.current_questions || [],
        participants: [],
        responses: [],
    }

    const { data: newSession, error } = await supabase
        .from('game_sessions')
        .insert(insertData)
        .select(`*, quizzes(title)`)
        .single()

    if (error || !newSession) {
        console.error('[Sessions] Fallback error creating session in Main DB:', error)
        return null
    }

    console.log('[Sessions] Fallback SUCCESS: Created session in Main DB', newSession.id)

    return {
        id: newSession.id,
        game_pin: newSession.game_pin,
        host_id: newSession.host_id,
        quiz_id: newSession.quiz_id,
        quiz_title: Array.isArray(newSession.quizzes) ? 'Quiz Title' : (newSession.quizzes?.title || data.quiz_title || 'Quiz Title'),
        status: newSession.status === 'finished' ? 'finish' : newSession.status as any,
        time_limit_title_status: '',
        settings: {
            timeLimit: newSession.total_time_minutes,
            questionCount: newSession.question_limit,
            application: newSession.application
        },
        question_order: null,
        game_end_mode: newSession.game_end_mode as any,
        current_questions: newSession.current_questions,
        timestamps: {
            created_at: newSession.created_at,
            started_at: newSession.started_at,
            ended_at: newSession.ended_at
        },
        countdown_position_mode: data.countdown_position_mode || 0
    }
}

/**
 * Helper function: Fallback untuk mengupdate session di Supabase Utama
 */
async function updateFallbackSessionInMainDb(sessionId: string, updates: GameSessionUpdate): Promise<GameSession | null> {
    const { supabase } = await import('./supabase')
    
    console.warn('[Sessions] Falling back to updating session in Main DB...', sessionId)

    const updateData: any = {}
    if (updates.status) updateData.status = updates.status === 'finish' ? 'finished' : updates.status
    if (updates.settings) {
        if (updates.settings.timeLimit !== undefined) updateData.total_time_minutes = updates.settings.timeLimit
        if (updates.settings.questionCount !== undefined) updateData.question_limit = updates.settings.questionCount.toString()
        if (updates.settings.application) updateData.application = updates.settings.application
    }
    if (updates.game_end_mode) updateData.game_end_mode = updates.game_end_mode
    if (updates.timestamps) {
        if (updates.timestamps.started_at) updateData.started_at = updates.timestamps.started_at
        if (updates.timestamps.ended_at) updateData.ended_at = updates.timestamps.ended_at
    }

    const { data: updatedSession, error } = await supabase
        .from('game_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select(`*, quizzes(title)`)
        .single()

    if (error || !updatedSession) {
        console.error('[Sessions] Fallback error updating session in Main DB:', error)
        return null
    }

    return {
        id: updatedSession.id,
        game_pin: updatedSession.game_pin,
        host_id: updatedSession.host_id,
        quiz_id: updatedSession.quiz_id,
        quiz_title: Array.isArray(updatedSession.quizzes) ? 'Quiz Title' : (updatedSession.quizzes?.title || 'Quiz Title'),
        status: updatedSession.status === 'finished' ? 'finish' : updatedSession.status as any,
        time_limit_title_status: '',
        settings: {
            timeLimit: updatedSession.total_time_minutes,
            questionCount: updatedSession.question_limit,
            application: updatedSession.application
        },
        question_order: null,
        game_end_mode: updatedSession.game_end_mode as any,
        current_questions: updatedSession.current_questions,
        timestamps: {
            created_at: updatedSession.created_at,
            started_at: updatedSession.started_at,
            ended_at: updatedSession.ended_at
        },
        countdown_position_mode: updates.countdown_position_mode || 0
    }
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

    try {
        const { data: sessionData, error: sessionError } = await supabaseB
            .from(TABLE_NAME)
            .update(updates)
            .eq('id', sessionId)
            .select()
            .single()

        if (sessionError) {
            console.warn('[Sessions] Error updating session in Supabase B, falling back to Main DB:', sessionError.message)
            return await updateFallbackSessionInMainDb(sessionId, updates)
        }

        return sessionData as GameSession
    } catch (err) {
        console.warn('[Sessions] Network error updating session in Supabase B, falling back to Main DB...', err)
        return await updateFallbackSessionInMainDb(sessionId, updates)
    }
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
