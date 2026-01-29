-- Add profile_color column to profiles table
-- This allows users to choose a custom color for their replies
-- Falls back to hash-based color generation if not set

ALTER TABLE public.profiles
ADD COLUMN profile_color TEXT;

COMMENT ON COLUMN public.profiles.profile_color IS 'User-chosen color in hex format (e.g., #FF5733) for reply attribution. Falls back to hash-based color if null.';

-- No need to update RLS policies - existing policies cover this column
