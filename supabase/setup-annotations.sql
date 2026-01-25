-- Annotations Table for Real-time Collaboration
-- Run this in the Supabase SQL Editor

-- Drop existing tables if they have wrong schema
DROP TABLE IF EXISTS pending_deletions CASCADE;
DROP TABLE IF EXISTS code_files CASCADE;
DROP TABLE IF EXISTS annotations CASCADE;

-- Create annotations table
CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL,
  project_id UUID NOT NULL,
  user_id UUID,
  added_by_initials TEXT,  -- User initials shown on annotation
  line_number INTEGER NOT NULL,
  end_line_number INTEGER,
  line_content TEXT,
  type TEXT NOT NULL CHECK (type IN ('observation', 'question', 'metaphor', 'pattern', 'context', 'critique')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create code_files table for syncing files between collaborators
CREATE TABLE IF NOT EXISTS code_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  filename TEXT NOT NULL,
  language TEXT,
  content TEXT NOT NULL,
  original_content TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create pending_deletions table for file deletion requests
CREATE TABLE IF NOT EXISTS pending_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL,
  project_id UUID NOT NULL,
  requested_by UUID,
  filename TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Auto-expire after 24 hours if not responded to
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_annotations_project_id ON annotations(project_id);
CREATE INDEX IF NOT EXISTS idx_annotations_file_id ON annotations(file_id);
CREATE INDEX IF NOT EXISTS idx_code_files_project_id ON code_files(project_id);
CREATE INDEX IF NOT EXISTS idx_pending_deletions_project_id ON pending_deletions(project_id);

-- RLS Policies
-- Using simple authenticated user policies for now
-- Tighten these once project ownership verification is confirmed working

-- Enable RLS
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_deletions ENABLE ROW LEVEL SECURITY;

-- Annotations: Authenticated users can manage
CREATE POLICY "Authenticated users can view annotations" ON annotations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert annotations" ON annotations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update annotations" ON annotations
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete annotations" ON annotations
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Code files: Authenticated users can manage
CREATE POLICY "Authenticated users can view code_files" ON code_files
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert code_files" ON code_files
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update code_files" ON code_files
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete code_files" ON code_files
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Pending deletions: Authenticated users can manage
CREATE POLICY "Authenticated users can view pending_deletions" ON pending_deletions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert pending_deletions" ON pending_deletions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete pending_deletions" ON pending_deletions
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Set REPLICA IDENTITY FULL to allow filtering on any column in Realtime
-- This is required for project_id filters to work
ALTER TABLE annotations REPLICA IDENTITY FULL;
ALTER TABLE code_files REPLICA IDENTITY FULL;
ALTER TABLE pending_deletions REPLICA IDENTITY FULL;

-- Enable Realtime for these tables
-- First try to remove if they already exist (ignore errors)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS annotations;
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS code_files;
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS pending_deletions;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE annotations;
ALTER PUBLICATION supabase_realtime ADD TABLE code_files;
ALTER PUBLICATION supabase_realtime ADD TABLE pending_deletions;

-- =============================================================================
-- Project Invites Table for Shareable Invite Links
-- =============================================================================

-- Create project_invites table
CREATE TABLE IF NOT EXISTS project_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('editor', 'viewer')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_project_invites_token ON project_invites(token);
CREATE INDEX IF NOT EXISTS idx_project_invites_project_id ON project_invites(project_id);

-- RLS Policies for project_invites
ALTER TABLE project_invites ENABLE ROW LEVEL SECURITY;

-- Anyone can read invites (needed for join flow - token is the auth)
CREATE POLICY "Anyone can view invites by token" ON project_invites
  FOR SELECT USING (true);

-- Only project owners can create invites (enforced in app code, RLS just checks auth)
CREATE POLICY "Authenticated users can create invites" ON project_invites
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Project owners can delete their invites
CREATE POLICY "Authenticated users can delete invites" ON project_invites
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- Project Members RLS Policies
-- =============================================================================
-- Note: project_members table is created elsewhere, but we need RLS policies
-- for the invite join flow to work

-- Enable RLS (safe to run even if already enabled)
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Allow users to see memberships for projects they're part of
DROP POLICY IF EXISTS "Users can view project memberships" ON project_members;
CREATE POLICY "Users can view project memberships" ON project_members
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      -- User is the member
      user_id = auth.uid() OR
      -- User is the project owner
      EXISTS (
        SELECT 1 FROM projects WHERE id = project_members.project_id AND owner_id = auth.uid()
      ) OR
      -- User is a member of this project
      EXISTS (
        SELECT 1 FROM project_members pm WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid()
      )
    )
  );

-- Allow authenticated users to insert themselves as members (for invite join flow)
DROP POLICY IF EXISTS "Users can join projects" ON project_members;
CREATE POLICY "Users can join projects" ON project_members
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()  -- Can only add yourself, not others
  );

-- Allow project owners to update member roles
DROP POLICY IF EXISTS "Owners can update member roles" ON project_members;
CREATE POLICY "Owners can update member roles" ON project_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE id = project_members.project_id AND owner_id = auth.uid()
    )
  );

-- Allow project owners to remove members, or members to remove themselves
DROP POLICY IF EXISTS "Owners can remove members" ON project_members;
CREATE POLICY "Owners can remove members" ON project_members
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND (
      -- User is removing themselves
      user_id = auth.uid() OR
      -- User is the project owner
      EXISTS (
        SELECT 1 FROM projects WHERE id = project_members.project_id AND owner_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- Helper Function for RLS (avoids infinite recursion)
-- =============================================================================

-- This function uses SECURITY DEFINER to bypass RLS when checking membership
-- Required because RLS policies cannot query their own table without recursion
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members WHERE project_id = p_project_id AND user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================================
-- Projects Table RLS Policies (for member access)
-- =============================================================================
-- Note: The projects table is created elsewhere, but we need RLS policies
-- for members to be able to read projects they've joined

-- Enable RLS (safe to run even if already enabled)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Allow users to read projects they own OR are members of
DROP POLICY IF EXISTS "Users can view own and member projects" ON projects;
CREATE POLICY "Users can view own and member projects" ON projects
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      -- User is the owner
      owner_id = auth.uid() OR
      -- User is a member (using helper function to avoid recursion)
      is_project_member(id, auth.uid())
    )
  );

-- Allow authenticated users to create projects
DROP POLICY IF EXISTS "Users can create projects" ON projects;
CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow owners to update their projects
DROP POLICY IF EXISTS "Owners can update projects" ON projects;
CREATE POLICY "Owners can update projects" ON projects
  FOR UPDATE USING (owner_id = auth.uid());

-- Allow owners to delete their projects
DROP POLICY IF EXISTS "Owners can delete projects" ON projects;
CREATE POLICY "Owners can delete projects" ON projects
  FOR DELETE USING (owner_id = auth.uid());

-- =============================================================================
-- Library Feature: Public Projects & Accessioning Workflow
-- =============================================================================

-- Add library-related columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS accession_status TEXT DEFAULT 'draft'
  CHECK (accession_status IN ('draft', 'submitted', 'reviewed', 'approved'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);

-- Index for efficient library queries
CREATE INDEX IF NOT EXISTS idx_projects_library ON projects(is_public, accession_status)
  WHERE is_public = TRUE AND accession_status = 'approved';

-- Add admin flag to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Helper function for admin check (used in RLS policies)
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = p_user_id), FALSE);
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================================
-- Library RLS Policies
-- =============================================================================

-- Update projects SELECT policy to include library access
DROP POLICY IF EXISTS "Users can view own and member projects" ON projects;
CREATE POLICY "Users can view own, member, and library projects" ON projects
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      -- User is the owner
      owner_id = auth.uid() OR
      -- User is a member (using helper function to avoid recursion)
      is_project_member(id, auth.uid()) OR
      -- Project is in the public library (approved)
      (is_public = TRUE AND accession_status = 'approved')
    )
  );

-- Update code_files SELECT policy to include library access
DROP POLICY IF EXISTS "Authenticated users can view code_files" ON code_files;
CREATE POLICY "Users can view code_files for accessible projects" ON code_files
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = code_files.project_id
        AND (
          p.owner_id = auth.uid() OR
          is_project_member(p.id, auth.uid()) OR
          (p.is_public = TRUE AND p.accession_status = 'approved')
        )
      )
    )
  );

-- Update annotations SELECT policy to include library access
DROP POLICY IF EXISTS "Authenticated users can view annotations" ON annotations;
CREATE POLICY "Users can view annotations for accessible projects" ON annotations
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = annotations.project_id
        AND (
          p.owner_id = auth.uid() OR
          is_project_member(p.id, auth.uid()) OR
          (p.is_public = TRUE AND p.accession_status = 'approved')
        )
      )
    )
  );

-- Admins can update accession status on any project
DROP POLICY IF EXISTS "Admins can update accession status" ON projects;
CREATE POLICY "Admins can update accession status" ON projects
  FOR UPDATE USING (
    is_admin(auth.uid()) OR owner_id = auth.uid()
  )
  WITH CHECK (
    is_admin(auth.uid()) OR owner_id = auth.uid()
  );
