-- ============================================================================
-- FIX ANNOTATION REPLIES DELETE RLS POLICY
-- Allow project owners to delete member replies in their projects
-- ============================================================================

-- Drop existing DELETE policy if it exists
DROP POLICY IF EXISTS "Users can delete own replies" ON public.annotation_replies;
DROP POLICY IF EXISTS "Users can delete replies in their projects" ON public.annotation_replies;

-- Create new DELETE policy that allows:
-- 1. Users to delete their own replies
-- 2. Project owners to delete any reply in their projects
CREATE POLICY "Users can delete replies in their projects"
ON public.annotation_replies
FOR DELETE
USING (
  -- User can delete their own replies
  auth.uid() = user_id
  OR
  -- OR user is the owner of the project that this reply belongs to
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = annotation_replies.project_id
    AND p.owner_id = auth.uid()
  )
);

-- Verify the policy was created
SELECT
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'annotation_replies'
AND cmd = 'DELETE';
