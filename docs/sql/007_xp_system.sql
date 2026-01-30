-- Migration 007: Experience Points (XP) System
-- Adds gamification with XP earning and level progression

-- ==================================================
-- Update profiles table with XP columns
-- ==================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_daily_login DATE,
  ADD COLUMN IF NOT EXISTS created_annotations INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_replies INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_projects INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS library_submissions INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS library_approvals INTEGER NOT NULL DEFAULT 0;

-- Indexes for leaderboards and sorting
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON profiles(xp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON profiles(level DESC);

-- ==================================================
-- xp_transactions table (XP earning history)
-- ==================================================
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'annotation', 'reply', 'submit', 'approved', etc.
  xp_earned INTEGER NOT NULL,
  reference_id UUID, -- ID of related object (annotation, project, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created ON xp_transactions(created_at DESC);

-- ==================================================
-- RLS Policies for xp_transactions
-- ==================================================

-- Enable RLS
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own XP history
CREATE POLICY "xp_transactions_select" ON xp_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Only system (via service role) can insert XP transactions
-- No INSERT policy for regular users - XP must be awarded via backend logic
