-- ============================================================================
-- FIX ANNOTATIONS RLS POLICIES
-- This fixes annotations not syncing between clients
-- ============================================================================

-- Enable RLS
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view annotations" ON public.annotations;
DROP POLICY IF EXISTS "Authenticated users can insert annotations" ON public.annotations;
DROP POLICY IF EXISTS "Authenticated users can update annotations" ON public.annotations;
DROP POLICY IF EXISTS "Authenticated users can delete annotations" ON public.annotations;
DROP POLICY IF EXISTS "Users can view annotations for accessible projects" ON public.annotations;

-- SELECT: Users can view ALL annotations in projects they own or are members of
CREATE POLICY "Users can view annotations in their projects"
ON public.annotations
FOR SELECT
TO authenticated
USING (
  -- Project owner can view all annotations
  project_id IN (
    SELECT id
    FROM public.projects
    WHERE owner_id = auth.uid()
  )
  -- OR project member can view all annotations
  OR project_id IN (
    SELECT project_id
    FROM public.project_members
    WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can insert annotations in projects they own or are members of
CREATE POLICY "Users can insert annotations in their projects"
ON public.annotations
FOR INSERT
TO authenticated
WITH CHECK (
  (
    -- Project owner can insert
    project_id IN (
      SELECT id
      FROM public.projects
      WHERE owner_id = auth.uid()
    )
    -- OR project member can insert
    OR project_id IN (
      SELECT project_id
      FROM public.project_members
      WHERE user_id = auth.uid()
    )
  )
  AND user_id = auth.uid()
);

-- UPDATE: Users can update their own annotations
CREATE POLICY "Users can update their own annotations"
ON public.annotations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete their own annotations OR project owners can delete any
CREATE POLICY "Users can delete their own annotations"
ON public.annotations
FOR DELETE
TO authenticated
USING (
  -- User can delete their own annotation
  user_id = auth.uid()
  -- OR project owner can delete any annotation in their project
  OR project_id IN (
    SELECT id
    FROM public.projects
    WHERE owner_id = auth.uid()
  )
);

-- Grant permissions
GRANT SELECT, INSERT, DELETE, UPDATE ON public.annotations TO authenticated;
