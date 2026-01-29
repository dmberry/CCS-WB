-- Update RLS policies to allow project owners to insert and view replies
-- Run this after the initial policies were created

-- Drop the existing policies
DROP POLICY IF EXISTS "Users can view replies in their projects" ON public.annotation_replies;
DROP POLICY IF EXISTS "Users can insert replies in their projects" ON public.annotation_replies;

-- SELECT: Users can view all replies in projects they own or are members of
CREATE POLICY "Users can view replies in their projects"
ON public.annotation_replies
FOR SELECT
TO authenticated
USING (
  -- Project owner can view
  project_id IN (
    SELECT id
    FROM public.projects
    WHERE owner_id = auth.uid()
  )
  -- OR project member can view
  OR project_id IN (
    SELECT project_id
    FROM public.project_members
    WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can insert replies in projects they own or are members of
CREATE POLICY "Users can insert replies in their projects"
ON public.annotation_replies
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

-- Verify updated policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'annotation_replies'
ORDER BY cmd, policyname;
