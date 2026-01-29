-- ============================================================================
-- ADD PROFILE_COLOR COLUMN TO PROFILES TABLE
-- Allows users to set custom colors for their replies in shared projects
-- ============================================================================

-- Add profile_color column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_color TEXT;

-- Add check constraint to ensure valid hex color format or null
ALTER TABLE public.profiles
ADD CONSTRAINT profile_color_format CHECK (
  profile_color IS NULL OR profile_color ~ '^#[0-9A-Fa-f]{6}$'
);

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.profile_color IS
'Custom hex color for user replies in shared projects. Format: #RRGGBB. NULL means auto-generate from initials.';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'profile_color';
