-- Cleanup script: Remove old duplicate RLS policies from annotation_replies table
-- Run this to remove the old policies that were replaced by the new ones

-- Drop the old policies (role: public)
DROP POLICY IF EXISTS "Users can view annotation replies for accessible projects" ON public.annotation_replies;
DROP POLICY IF EXISTS "Authenticated users can insert annotation replies" ON public.annotation_replies;
DROP POLICY IF EXISTS "Users can update own annotation replies" ON public.annotation_replies;
DROP POLICY IF EXISTS "Users can delete own annotation replies" ON public.annotation_replies;

-- Verify only the new policies remain
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'annotation_replies'
ORDER BY cmd, policyname;
