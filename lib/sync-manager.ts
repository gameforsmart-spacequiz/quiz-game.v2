import { supabase } from './supabase'
import { supabaseB, GameSession, Participant, isSupabaseBAvailable } from './supabase-b'
import { getGameSessionById } from './sessions-api'
import { getParticipantsByGameId, deleteParticipantsByGameId } from './participants-api'
import { generateXID } from './id-generator'

/**
 * Sync Manager - Mengelola sinkronisasi data antara Supabase B (temporary) dan Supabase Utama (permanent)
 * 
 * Flow:
 * 1. Selama game berlangsung → data disimpan di Supabase B (sessions & participant)
 * 2. Saat game selesai (finish) → data disinkronkan ke Supabase Utama (game_sessions)
 * 3. Setelah sinkronisasi → data di Supabase B dihapus (cleanup)
 */

// ============================================
// SYNC TO MAIN DATABASE
// ============================================

/**
 * Sinkronisasi session dan participant ke tabel game_sessions di Supabase Utama
 * Dipanggil saat game status berubah menjadi 'finish'
 */
export async function syncGameToMainDatabase(sessionId: string): Promise<boolean> {
    if (!isSupabaseBAvailable()) {
        console.error('[SyncManager] Supabase B not available')
        return false
    }

    try {
        console.log('[SyncManager] Starting sync for session:', sessionId)

        // 1. Ambil data session dari Supabase B
        const session = await getGameSessionById(sessionId)
        if (!session) {
            console.error('[SyncManager] Session not found:', sessionId)
            return false
        }

        // 2. Ambil data participant dari Supabase B
        const participants = await getParticipantsByGameId(sessionId)
        console.log('[SyncManager] Found', participants.length, 'participants')

        // 3. Format participant data untuk disimpan ke game_sessions.participants
        const participantsData = participants.map(p => ({
            id: p.id,
            user_id: p.user_id,
            nickname: p.nickname,
            avatar: p.avatar,
            score: p.score,
            questions_answered: p.questions_answered || 0,
            joined_at: p.joined_at,
        }))

        // 4. Build responses data from participant answers
        // Format: [{ id, answers: [...], participant: string }]
        const responsesData = participants.map(p => ({
            id: generateXID(),
            answers: Array.isArray(p.answers) ? p.answers : [],
            participant: p.id
        }))

        // 5. Cari game_session di Supabase Utama berdasarkan game_pin
        const { data: existingSession, error: findError } = await supabase
            .from('game_sessions')
            .select('id')
            .eq('game_pin', session.game_pin)
            .single()

        if (findError && findError.code !== 'PGRST116') {
            console.error('[SyncManager] Error finding game_session:', findError)
            return false
        }

        let mainSessionId: string

        if (existingSession) {
            // 6a. Update existing game_session
            console.log('[SyncManager] Updating existing game_session:', existingSession.id)

            const { error: updateError } = await supabase
                .from('game_sessions')
                .update({
                    status: 'finished',
                    participants: participantsData,
                    responses: responsesData,
                    current_questions: session.current_questions || [],
                    started_at: session.timestamps?.started_at,
                    ended_at: session.timestamps?.ended_at || new Date().toISOString(),
                })
                .eq('id', existingSession.id)

            if (updateError) {
                console.error('[SyncManager] Error updating game_session:', updateError)
                return false
            }

            mainSessionId = existingSession.id
        } else {
            // 6b. Insert new game_session
            console.log('[SyncManager] Creating new game_session')

            const { data: newSession, error: insertError } = await supabase
                .from('game_sessions')
                .insert({
                    quiz_id: session.quiz_id,
                    host_id: session.host_id,
                    game_pin: session.game_pin,
                    status: 'finished',
                    participants: participantsData,
                    responses: responsesData,
                    current_questions: session.current_questions || [],
                    total_time_minutes: session.settings?.timeLimit || 0,
                    question_limit: session.settings?.questionCount?.toString() || 'all',
                    game_end_mode: session.game_end_mode || 'time',
                    application: session.settings?.application || 'space-quiz',
                    created_at: session.timestamps?.created_at || new Date().toISOString(),
                    started_at: session.timestamps?.started_at,
                    ended_at: session.timestamps?.ended_at || new Date().toISOString(),
                })

                .select('id')
                .single()

            if (insertError) {
                console.error('[SyncManager] Error inserting game_session:', insertError)
                return false
            }

            mainSessionId = newSession.id
        }

        console.log('[SyncManager] Sync completed for game_session:', mainSessionId)
        return true

    } catch (error) {
        console.error('[SyncManager] Sync failed:', error)
        return false
    }
}

/**
 * Sinkronisasi dan hapus data dari Supabase B setelah game selesai
 * Ini adalah fungsi utama yang dipanggil saat endGame()
 */
export async function finalizeGame(sessionId: string): Promise<boolean> {
    try {
        console.log('[SyncManager] Finalizing game:', sessionId)

        // 1. Update status session di Supabase B menjadi 'finish' TERLEBIH DAHULU
        // Ini agar player langsung ter-redirect tanpa menunggu proses sync yang lama
        // Get current timestamps first
        const { data: currentSession } = await supabaseB
            .from('sessions')
            .select('timestamps')
            .eq('id', sessionId)
            .single()

        let currentTimestamps = currentSession?.timestamps || {}
        if (typeof currentTimestamps === 'string') {
            try {
                currentTimestamps = JSON.parse(currentTimestamps)
                if (typeof currentTimestamps === 'string') currentTimestamps = JSON.parse(currentTimestamps)
            } catch (e) {
                console.error('[SyncManager] Failed to parse timestamps', e)
                if (typeof currentTimestamps === 'string') currentTimestamps = {}
            }
        }

        const { error: updateError } = await supabaseB
            .from('sessions')
            .update({
                status: 'finish',
                timestamps: {
                    ...currentTimestamps,
                    ended_at: new Date().toISOString()
                }
            })
            .eq('id', sessionId)

        if (updateError) {
            console.error('[SyncManager] Error updating session status:', updateError)
            return false
        }

        // 2. Sync data ke Supabase Utama (Background Process)
        // Kita await di sini agar Host tau kalau sync gagal, tapi Player sudah redirect duluan
        const syncSuccess = await syncGameToMainDatabase(sessionId)
        if (!syncSuccess) {
            console.error('[SyncManager] Failed to sync to main database')
            // Note: Game sudah finish di Supabase B, jadi user experience aman.
            // Log error sudah tercatat untuk debugging.
            return false
        }

        console.log('[SyncManager] Game finalized successfully')
        return true

    } catch (error) {
        console.error('[SyncManager] Finalize failed:', error)
        return false
    }
}

/**
 * Cleanup data di Supabase B setelah sinkronisasi
 * Bisa dipanggil secara manual atau via cron job
 */
export async function cleanupFinishedGame(sessionId: string): Promise<boolean> {
    try {
        console.log('[SyncManager] Cleaning up session:', sessionId)

        // 1. Hapus semua participant
        await deleteParticipantsByGameId(sessionId)

        // 2. Hapus session
        const { error } = await supabaseB
            .from('sessions')
            .delete()
            .eq('id', sessionId)

        if (error) {
            console.error('[SyncManager] Error deleting session:', error)
            return false
        }

        console.log('[SyncManager] Cleanup completed for session:', sessionId)
        return true

    } catch (error) {
        console.error('[SyncManager] Cleanup failed:', error)
        return false
    }
}

/**
 * Cleanup semua game yang sudah finish dan lebih dari X jam
 */
export async function cleanupOldGames(hoursOld: number = 24): Promise<number> {
    if (!isSupabaseBAvailable()) return 0

    try {
        const cutoffTime = new Date()
        cutoffTime.setHours(cutoffTime.getHours() - hoursOld)

        // Ambil session yang sudah finish dan lebih tua dari cutoff
        const { data: oldSessions, error: fetchError } = await supabaseB
            .from('sessions')
            .select('id')
            .eq('status', 'finish')

        if (fetchError || !oldSessions) {
            console.error('[SyncManager] Error fetching old sessions:', fetchError)
            return 0
        }

        let cleanedCount = 0
        for (const session of oldSessions) {
            const success = await cleanupFinishedGame(session.id)
            if (success) cleanedCount++
        }

        console.log(`[SyncManager] Cleaned up ${cleanedCount} old games`)
        return cleanedCount

    } catch (error) {
        console.error('[SyncManager] Cleanup old games failed:', error)
        return 0
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check apakah session sudah di-sync ke main database
 */
export async function isSessionSynced(gamePin: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('game_sessions')
        .select('id')
        .eq('game_pin', gamePin)
        .single()

    return !error && !!data
}

/**
 * Get session dari Supabase Utama berdasarkan game_pin
 */
export async function getMainSessionByPin(gamePin: string) {
    const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('game_pin', gamePin)
        .single()

    if (error) {
        console.error('[SyncManager] Error fetching main session:', error)
        return null
    }

    return data
}
