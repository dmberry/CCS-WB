-- Diagnostic query to check pending submissions
-- Run this to see all projects that should be pending

-- Check all projects with their accession status
SELECT
  id,
  name,
  owner_id,
  accession_status,
  is_public,
  deleted_at,
  submitted_at,
  created_at,
  updated_at
FROM projects
WHERE accession_status IN ('draft', 'submitted', 'approved', 'rejected')
ORDER BY
  CASE
    WHEN accession_status = 'submitted' THEN 1
    WHEN accession_status = 'draft' THEN 2
    WHEN accession_status = 'approved' THEN 3
    ELSE 4
  END,
  submitted_at DESC NULLS LAST,
  created_at DESC;

-- Check specifically for submitted projects (what admin panel should show)
SELECT
  id,
  name,
  owner_id,
  accession_status,
  is_public,
  deleted_at,
  submitted_at
FROM projects
WHERE accession_status = 'submitted'
  AND deleted_at IS NULL
ORDER BY submitted_at ASC NULLS LAST;

-- Check if there are submitted projects with is_public = false (would be hidden)
SELECT
  id,
  name,
  owner_id,
  accession_status,
  is_public,
  deleted_at,
  submitted_at
FROM projects
WHERE accession_status = 'submitted'
  AND deleted_at IS NULL
  AND is_public = false;

-- Check if submitted_at is null for any submitted projects
SELECT
  id,
  name,
  owner_id,
  accession_status,
  submitted_at
FROM projects
WHERE accession_status = 'submitted'
  AND submitted_at IS NULL;
