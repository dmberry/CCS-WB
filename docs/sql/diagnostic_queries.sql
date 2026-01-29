-- ============================================================================
-- DIAGNOSTIC QUERIES FOR CCS-WB CRITICAL ISSUES
-- Run these in Supabase SQL Editor to diagnose annotation sync problems
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CHECK RLS POLICIES ON ANNOTATIONS TABLE
-- ----------------------------------------------------------------------------
-- This shows what policies are controlling access to the annotations table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'annotations'
ORDER BY cmd, policyname;

-- ----------------------------------------------------------------------------
-- 2. CHECK RLS POLICIES ON ANNOTATION_REPLIES TABLE
-- ----------------------------------------------------------------------------
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'annotation_replies'
ORDER BY cmd, policyname;

-- ----------------------------------------------------------------------------
-- 3. CHECK FOREIGN KEY CONSTRAINTS (for cascade delete)
-- ----------------------------------------------------------------------------
-- This shows if annotation_replies will auto-delete when parent annotation is deleted
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'annotation_replies';

-- ----------------------------------------------------------------------------
-- 4. TEST ANNOTATION VISIBILITY
-- Replace 'YOUR_PROJECT_ID' with an actual project ID you're testing with
-- ----------------------------------------------------------------------------
-- Run this to see what annotations are visible to the current authenticated user
-- SELECT * FROM annotations
-- WHERE project_id = 'YOUR_PROJECT_ID'
-- ORDER BY created_at DESC;

-- ----------------------------------------------------------------------------
-- 5. TEST ANNOTATION REPLIES VISIBILITY
-- Replace 'YOUR_PROJECT_ID' with an actual project ID
-- ----------------------------------------------------------------------------
-- SELECT * FROM annotation_replies
-- WHERE project_id = 'YOUR_PROJECT_ID'
-- ORDER BY created_at DESC;

-- ----------------------------------------------------------------------------
-- 6. CHECK IF RLS IS ENABLED
-- ----------------------------------------------------------------------------
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('annotations', 'annotation_replies');

-- ----------------------------------------------------------------------------
-- 7. FIX CASCADE DELETE (if needed)
-- ----------------------------------------------------------------------------
-- If the foreign key doesn't have ON DELETE CASCADE, uncomment and run:
/*
ALTER TABLE public.annotation_replies
DROP CONSTRAINT IF EXISTS annotation_replies_annotation_id_fkey;

ALTER TABLE public.annotation_replies
ADD CONSTRAINT annotation_replies_annotation_id_fkey
FOREIGN KEY (annotation_id)
REFERENCES public.annotations(id)
ON DELETE CASCADE;
*/
