-- =============================================================================
-- Annotation Replies Table
-- =============================================================================
-- Allows users to reply to annotations for threaded discussions
-- =============================================================================

CREATE TABLE IF NOT EXISTS annotation_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID,
  added_by_initials TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_annotation_replies_annotation_id ON annotation_replies(annotation_id);
CREATE INDEX IF NOT EXISTS idx_annotation_replies_project_id ON annotation_replies(project_id);

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE annotation_replies ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view replies for projects they have access to
DROP POLICY IF EXISTS "Users can view annotation replies for accessible projects" ON annotation_replies;
CREATE POLICY "Users can view annotation replies for accessible projects" ON annotation_replies
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = annotation_replies.project_id
        AND (
          p.owner_id = auth.uid() OR
          is_project_member(p.id, auth.uid()) OR
          (p.is_public = TRUE AND p.accession_status = 'approved')
        )
      )
    )
  );

-- INSERT: Authenticated users can add replies to annotations
DROP POLICY IF EXISTS "Authenticated users can insert annotation replies" ON annotation_replies;
CREATE POLICY "Authenticated users can insert annotation replies" ON annotation_replies
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- UPDATE: Users can update their own replies
DROP POLICY IF EXISTS "Users can update own annotation replies" ON annotation_replies;
CREATE POLICY "Users can update own annotation replies" ON annotation_replies
  FOR UPDATE USING (
    auth.uid() = user_id
  );

-- DELETE: Users can delete their own replies
DROP POLICY IF EXISTS "Users can delete own annotation replies" ON annotation_replies;
CREATE POLICY "Users can delete own annotation replies" ON annotation_replies
  FOR DELETE USING (
    auth.uid() = user_id
  );
