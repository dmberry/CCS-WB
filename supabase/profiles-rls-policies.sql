-- =============================================================================
-- Profiles Table RLS Policies
-- =============================================================================
-- These policies allow:
-- - Anyone authenticated to view profiles (for collaboration features)
-- - Users to update their own profile
-- - Admins to update any profile (including is_admin flag)
-- =============================================================================

-- Enable RLS on profiles table (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Authenticated users can view all profiles
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
CREATE POLICY "Authenticated users can view all profiles" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- UPDATE policy: Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (
    auth.uid() = id
  );

-- UPDATE policy: Admins can update any profile
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (
    is_admin(auth.uid())
  );

-- INSERT policy: Users can create their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );

-- Note: No DELETE policy - profiles should not be deleted via app
-- User deletion should be handled through admin functions with proper cascade
