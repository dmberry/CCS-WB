-- Migration 006: Library Ratings System
-- Adds project favorites and ratings functionality

-- ==================================================
-- project_favorites table
-- ==================================================
CREATE TABLE IF NOT EXISTS project_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(project_id, user_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_project_favorites_project ON project_favorites(project_id);
CREATE INDEX IF NOT EXISTS idx_project_favorites_user ON project_favorites(user_id);

-- ==================================================
-- project_ratings table
-- ==================================================
CREATE TABLE IF NOT EXISTS project_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(project_id, user_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_project_ratings_project ON project_ratings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_ratings_user ON project_ratings(user_id);

-- ==================================================
-- RLS Policies for project_favorites
-- ==================================================

-- Enable RLS
ALTER TABLE project_favorites ENABLE ROW LEVEL SECURITY;

-- Everyone can view favorites (for counts)
CREATE POLICY "project_favorites_select" ON project_favorites
  FOR SELECT USING (true);

-- Authenticated users can add favorites
CREATE POLICY "project_favorites_insert" ON project_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own favorites
CREATE POLICY "project_favorites_delete" ON project_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- ==================================================
-- RLS Policies for project_ratings
-- ==================================================

-- Enable RLS
ALTER TABLE project_ratings ENABLE ROW LEVEL SECURITY;

-- Everyone can view ratings (for averages)
CREATE POLICY "project_ratings_select" ON project_ratings
  FOR SELECT USING (true);

-- Authenticated users can add ratings
CREATE POLICY "project_ratings_insert" ON project_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own ratings
CREATE POLICY "project_ratings_update" ON project_ratings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own ratings
CREATE POLICY "project_ratings_delete" ON project_ratings
  FOR DELETE USING (auth.uid() = user_id);
