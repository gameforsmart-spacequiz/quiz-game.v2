import { supabaseB, Participant, ParticipantInsert, ParticipantUpdate, isSupabaseBAvailable } from './supabase-b'
import { generateXID } from './id-generator'

/**
 * API functions untuk mengelola data participant di Supabase B
 * Tabel: participant
 */

const TABLE_NAME = 'participant'

// ============================================
// CREATE Operations
// ============================================

/**
 * Menambahkan participant baru ke game session
 */
export async function createParticipant(data: ParticipantInsert): Promise<Participant | null> {
    if (!isSupabaseBAvailable()) {
        console.warn('[Participant] Supabase B client not available')
        return null
    }

    const participantId = data.id || generateXID()

    const participantData: ParticipantInsert = {
        ...data,
        id: participantId,
        score: data.score ?? 0,
        joined_at: data.joined_at || new Date().toISOString(),
    }

    const { data: participant, error } = await supabaseB
        .from(TABLE_NAME)
        .insert(participantData)
        .select()
        .single()

    if (error) {
        console.error('[Participant] Error creating participant:', error)
        return null
    }

    return participant as Participant
}

/**
 * Menambahkan multiple participant sekaligus (batch insert)
 */
export async function createParticipants(participants: ParticipantInsert[]): Promise<Participant[]> {
    if (!isSupabaseBAvailable()) {
        console.warn('[Participant] Supabase B client not available')
        return []
    }

    const participantsData = participants.map(data => ({
        ...data,
        id: data.id || generateXID(),
        score: data.score ?? 0,
        joined_at: data.joined_at || new Date().toISOString(),
    }))

    const { data, error } = await supabaseB
        .from(TABLE_NAME)
        .insert(participantsData)
        .select()

    if (error) {
        console.error('[Participant] Error creating participants:', error)
        return []
    }

    return data as Participant[]
}

// ============================================
// READ Operations
// ============================================

/**
 * Mendapatkan participant berdasarkan ID
 */
export async function getParticipantById(participantId: string): Promise<Participant | null> {
    if (!isSupabaseBAvailable()) return null

    const { data, error } = await supabaseB
        .from(TABLE_NAME)
        .select('*')
        .eq('id', participantId)
        .single()

    if (error) {
        console.error('[Participant] Error fetching participant:', error)
        return null
    }

    return data as Participant
}

/**
 * Mendapatkan semua participant dalam game tertentu
 */
export async function getParticipantsByGameId(gameId: string): Promise<Participant[]> {
    if (!isSupabaseBAvailable()) return []

    const { data, error } = await supabaseB
        .from(TABLE_NAME)
        .select('*')
        .eq('game_id', gameId)
        .order('score', { ascending: false })

    if (error) {
        console.error('[Participant] Error fetching participants:', error)
        return []
    }

    return data as Participant[]
}

/**
 * Mendapatkan participant berdasarkan user_id dalam game tertentu
 */
export async function getParticipantByUserId(gameId: string, userId: string): Promise<Participant | null> {
    if (!isSupabaseBAvailable()) return null

    const { data, error } = await supabaseB
        .from(TABLE_NAME)
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null // Not found
        console.error('[Participant] Error fetching participant by user_id:', error)
        return null
    }

    return data as Participant
}

/**
 * Mendapatkan leaderboard (top participant by score)
 */
export async function getLeaderboard(gameId: string, limit: number = 10): Promise<Participant[]> {
    if (!isSupabaseBAvailable()) return []

    const { data, error } = await supabaseB
        .from(TABLE_NAME)
        .select('*')
        .eq('game_id', gameId)
        .order('score', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('[Participant] Error fetching leaderboard:', error)
        return []
    }

    return data as Participant[]
}

/**
 * Mendapatkan participant count dalam game
 */
export async function getParticipantCount(gameId: string): Promise<number> {
    if (!isSupabaseBAvailable()) return 0

    const { count, error } = await supabaseB
        .from(TABLE_NAME)
        .select('*', { count: 'exact', head: true })
        .eq('game_id', gameId)

    if (error) {
        console.error('[Participant] Error counting participants:', error)
        return 0
    }

    return count || 0
}

// ============================================
// UPDATE Operations
// ============================================

/**
 * Update data participant
 */
export async function updateParticipant(participantId: string, updates: ParticipantUpdate): Promise<Participant | null> {
    if (!isSupabaseBAvailable()) return null

    const { data, error } = await supabaseB
        .from(TABLE_NAME)
        .update(updates)
        .eq('id', participantId)
        .select()
        .single()

    if (error) {
        console.error('[Participant] Error updating participant:', error)
        return null
    }

    return data as Participant
}

/**
 * Update score participant
 */
export async function updateParticipantScore(participantId: string, score: number): Promise<Participant | null> {
    return updateParticipant(participantId, { score })
}

/**
 * Increment participant score (menambahkan ke score saat ini)
 */
export async function incrementParticipantScore(participantId: string, pointsToAdd: number): Promise<Participant | null> {
    if (!isSupabaseBAvailable()) return null

    // Get current score first
    const currentParticipant = await getParticipantById(participantId)
    if (!currentParticipant) return null

    const newScore = currentParticipant.score + pointsToAdd
    return updateParticipant(participantId, { score: newScore })
}

// ============================================
// DELETE Operations
// ============================================

/**
 * Hapus participant dari game
 */
export async function deleteParticipant(participantId: string): Promise<boolean> {
    if (!isSupabaseBAvailable()) return false

    const { error } = await supabaseB
        .from(TABLE_NAME)
        .delete()
        .eq('id', participantId)

    if (error) {
        console.error('[Participant] Error deleting participant:', error)
        return false
    }

    return true
}

/**
 * Hapus semua participant dalam game (untuk cleanup)
 */
export async function deleteParticipantsByGameId(gameId: string): Promise<boolean> {
    if (!isSupabaseBAvailable()) return false

    const { error } = await supabaseB
        .from(TABLE_NAME)
        .delete()
        .eq('game_id', gameId)

    if (error) {
        console.error('[Participant] Error deleting participants:', error)
        return false
    }

    return true
}

// ============================================
// REALTIME Subscriptions
// ============================================

/**
 * Subscribe ke perubahan participant dalam game
 */
export function subscribeToGameParticipants(
    gameId: string,
    onInsert?: (participant: Participant) => void,
    onUpdate?: (participant: Participant) => void,
    onDelete?: (oldParticipant: Participant) => void
) {
    if (!isSupabaseBAvailable()) {
        console.warn('[Participant] Supabase B client not available for subscription')
        return null
    }

    const channel = supabaseB
        .channel(`game-participant-${gameId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: TABLE_NAME,
                filter: `game_id=eq.${gameId}`,
            },
            (payload) => {
                if (onInsert) onInsert(payload.new as Participant)
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: TABLE_NAME,
                filter: `game_id=eq.${gameId}`,
            },
            (payload) => {
                if (onUpdate) onUpdate(payload.new as Participant)
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'DELETE',
                schema: 'public',
                table: TABLE_NAME,
                filter: `game_id=eq.${gameId}`,
            },
            (payload) => {
                if (onDelete) onDelete(payload.old as Participant)
            }
        )
        .subscribe()

    return channel
}

/**
 * Unsubscribe dari channel
 */
export async function unsubscribeFromParticipants(channel: ReturnType<typeof supabaseB.channel>) {
    if (channel) {
        await channel.unsubscribe()
    }
}
