-- RLS Policies for annotation_replies table
-- Ensures users can view all replies in projects they're members of,
-- but can only delete their own replies

-- Enable RLS on annotation_replies table
ALTER TABLE public.annotation_replies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view replies in their projects" ON public.annotation_replies;
DROP POLICY IF EXISTS "Users can insert replies in their projects" ON public.annotation_replies;
DROP POLICY IF EXISTS "Users can delete their own replies" ON public.annotation_replies;
DROP POLICY IF EXISTS "Users can update their own replies" ON public.annotation_replies;

-- SELECT: Users can view all replies in projects they're members of
CREATE POLICY "Users can view replies in their projects"
ON public.annotation_replies
FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT project_id
    FROM public.project_members
    WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can insert replies in projects they're members of
CREATE POLICY "Users can insert replies in their projects"
ON public.annotation_replies
FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT project_id
    FROM public.project_members
    WHERE user_id = auth.uid()
  )
  AND user_id = auth.uid()
);

-- DELETE: Users can only delete their own replies
CREATE POLICY "Users can delete their own replies"
ON public.annotation_replies
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
);

-- UPDATE: Users can only update their own replies (for content edits)
CREATE POLICY "Users can update their own replies"
ON public.annotation_replies
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Grant appropriate table permissions
GRANT SELECT, INSERT, DELETE, UPDATE ON public.annotation_replies TO authenticated;

-- Verify policies are enabled
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'annotation_replies';
