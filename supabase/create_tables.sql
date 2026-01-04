-- ============================================
-- SQL UNTUK SUPABASE SQL EDITOR
-- Copy-paste ini ke: Supabase Dashboard > SQL Editor
-- ============================================

-- ============================================
-- LANGKAH 1: Buat Tabel participant
-- ============================================

CREATE TABLE IF NOT EXISTS participant (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    user_id TEXT,
    nickname TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    score INTEGER DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_participant_game_id ON participant(game_id);
CREATE INDEX IF NOT EXISTS idx_participant_user_id ON participant(user_id);
CREATE INDEX IF NOT EXISTS idx_participant_score ON participant(score DESC);

-- ============================================
-- LANGKAH 2: Buat Tabel sessions
-- ============================================

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    game_pin TEXT NOT NULL UNIQUE,
    host_id TEXT NOT NULL,
    quiz_id TEXT NOT NULL,
    quiz_title TEXT NOT NULL,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finish')),
    time_limit_title_status TEXT DEFAULT '',
    settings JSONB DEFAULT '{}'::jsonb,
    question_order INTEGER[] DEFAULT NULL,
    game_end_mode TEXT DEFAULT NULL,
    countdown_position_mode INTEGER DEFAULT 0,
    timestamps JSONB DEFAULT jsonb_build_object('created_at', NOW())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_game_pin ON sessions(game_pin);
CREATE INDEX IF NOT EXISTS idx_sessions_host_id ON sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- ============================================
-- LANGKAH 3: Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE participant ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policy untuk akses publik (anonymous)
CREATE POLICY "Public access for participant" ON participant
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access for sessions" ON sessions
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- LANGKAH 4: Enable Realtime
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE participant;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;

-- ============================================
-- LANGKAH 5: Helper Functions (Optional)
-- ============================================

-- Get server time
CREATE OR REPLACE FUNCTION get_server_time()
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN NOW();
END;
$$ LANGUAGE plpgsql;

-- Cleanup old sessions
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
