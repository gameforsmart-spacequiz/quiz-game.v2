import { supabase } from "./supabase"

// Cache server time offset to avoid repeated calls
let serverTimeOffset: number | null = null
let lastSyncTime = 0
const SYNC_INTERVAL = 60000 // Re-sync every 60 seconds

// Base URL for Supabase (extracted from the client)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

export async function syncServerTime(): Promise<number> {
  const now = Date.now()

  // Use cached offset if valid and recent
  if (serverTimeOffset !== null && (now - lastSyncTime < SYNC_INTERVAL)) {
    return now + serverTimeOffset
  }

  try {
    let serverTime = 0
    const start = Date.now()

    // 1. First priority: Try fetching the HTML header Date from Supabase (Most reliable & lightweight)
    // This avoids DB overhead and works even if RPC/Tables are missing.
    try {
      if (supabaseUrl) {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
          }
        })

        const dateHeader = response.headers.get('Date')
        if (dateHeader) {
          serverTime = new Date(dateHeader).getTime()
        }
      }
    } catch (e) {
      console.warn("[TimeSync] HTTP HEAD sync failed", e)
    }

    // 2. Second priority: Try RPC if HTTP header failed
    if (!serverTime) {
      const { data, error } = await supabase.rpc("get_server_time")
      if (!error && data) {
        serverTime = new Date(data).getTime()
      }
    }

    // 3. Fallback: Just return local time if all else fails
    if (!serverTime) {
      console.warn("[TimeSync] All sync methods failed, using local time.")
      // Don't update offset effectively (assume 0 offset), but update timestamps to prevent retry loops
      lastSyncTime = now
      return now
    }

    const end = Date.now()
    const networkDelay = (end - start) / 2

    // Calculate offset: ServerTime - (ClientEnd - Delay)
    // Essentially trying to estimate what the server time is NOW
    const estimatedServerNow = serverTime + networkDelay
    const newOffset = estimatedServerNow - end

    // Apply smoothing if we already have an offset (to prevent glitching/jumping)
    if (serverTimeOffset !== null) {
      // weighted average: 80% old, 20% new
      serverTimeOffset = (serverTimeOffset * 0.8) + (newOffset * 0.2)
    } else {
      serverTimeOffset = newOffset
    }

    lastSyncTime = end
    console.log(`[TimeSync] Synced. Offset: ${serverTimeOffset}ms (Latency: ${networkDelay}ms)`)

    return Date.now() + serverTimeOffset

  } catch (error) {
    console.error("[TimeSync] Error during sync:", error)
    // Return best guess
    return Date.now() + (serverTimeOffset || 0)
  }
}

// Legacy export compatibility
export const getServerTime = syncServerTime
