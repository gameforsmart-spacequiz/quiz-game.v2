-- ============================================
-- Supabase B Database Schema
-- Database untuk menyimpan data participant dan game sessions
-- ============================================

-- Enable UUID extension jika belum ada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABEL: participant
-- Menyimpan data player dalam game session
-- ============================================

CREATE TABLE IF NOT EXISTS participant (
    -- Primary key menggunakan XID (string 20 karakter)
    id TEXT PRIMARY KEY,
    
    -- Game reference
    game_id TEXT NOT NULL,
    
    -- User reference (link to profiles if logged in)
    user_id TEXT,
    
    -- Player info
    nickname TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    
    -- Game stats
    score INTEGER DEFAULT 0,
    
    -- Timestamps
    joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes untuk performa query
CREATE INDEX IF NOT EXISTS idx_participant_game_id ON participant(game_id);
CREATE INDEX IF NOT EXISTS idx_participant_user_id ON participant(user_id);
CREATE INDEX IF NOT EXISTS idx_participant_score ON participant(score DESC);
CREATE INDEX IF NOT EXISTS idx_participant_joined_at ON participant(joined_at DESC);

-- ============================================
-- TABEL: sessions
-- Menyimpan data game session
-- ============================================

CREATE TABLE IF NOT EXISTS sessions (
    -- Primary key menggunakan XID (string 20 karakter)
    id TEXT PRIMARY KEY,
    
    -- Game identifiers
    game_pin TEXT NOT NULL UNIQUE,
    host_id TEXT NOT NULL,
    
    -- Quiz reference
    quiz_id TEXT NOT NULL,
    quiz_title TEXT NOT NULL,
    
    -- Game status: waiting, active, finish
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finish')),
    
    -- Time settings
    time_limit_title_status TEXT DEFAULT '',
    
    -- Game settings (JSON)
    settings JSONB DEFAULT '{}'::jsonb,
    
    -- Question management
    question_order INTEGER[] DEFAULT NULL,
    game_end_mode TEXT DEFAULT NULL CHECK (game_end_mode IN ('time', 'questions', NULL)),
    
    -- Countdown settings
    countdown_position_mode INTEGER DEFAULT 0,
    
    -- Timestamps (JSON untuk fleksibilitas)
    timestamps JSONB DEFAULT jsonb_build_object('created_at', NOW())
);

-- Indexes untuk performa query
CREATE INDEX IF NOT EXISTS idx_sessions_game_pin ON sessions(game_pin);
CREATE INDEX IF NOT EXISTS idx_sessions_host_id ON sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_quiz_id ON sessions(quiz_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS pada tabel
ALTER TABLE participant ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policy untuk participant: Semua user bisa CRUD (untuk anonymous access)
CREATE POLICY "Allow all operations on participant" ON participant
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy untuk sessions: Semua user bisa CRUD (untuk anonymous access)
CREATE POLICY "Allow all operations on sessions" ON sessions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- Enable realtime untuk kedua tabel
-- ============================================

-- Untuk participant
ALTER PUBLICATION supabase_realtime ADD TABLE participant;

-- Untuk sessions
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;

-- ============================================
-- FUNCTIONS (Optional - untuk fitur tambahan)
-- ============================================

-- Function untuk mendapatkan server time (untuk sinkronisasi)
CREATE OR REPLACE FUNCTION get_server_time()
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN NOW();
END;
$$ LANGUAGE plpgsql;

-- Function untuk cleanup old sessions (dipanggil via cron atau manual)
CREATE OR REPLACE FUNCTION cleanup_old_sessions(hours_old INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM sessions
        WHERE status = 'finish'
        AND (timestamps->>'ended_at')::TIMESTAMPTZ < NOW() - (hours_old || ' hours')::INTERVAL
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function untuk cleanup participant dari session yang sudah dihapus
CREATE OR REPLACE FUNCTION cleanup_orphan_participant()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM participant p
        WHERE NOT EXISTS (
            SELECT 1 FROM sessions s WHERE s.id = p.game_id
        )
        RETURNING p.id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
