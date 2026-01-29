-- Add profile_color column to annotation_replies table
-- This stores the user's profile color at the time of reply creation
-- to avoid repeated profile lookups on every poll

-- Add profile_color column
ALTER TABLE public.annotation_replies
ADD COLUMN IF NOT EXISTS profile_color TEXT;

COMMENT ON COLUMN public.annotation_replies.profile_color IS 'User profile color at time of reply creation in hex format (e.g., #FF5733). Stored to avoid repeated profile lookups.';

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'annotation_replies' AND column_name = 'profile_color';
