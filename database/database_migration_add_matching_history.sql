-- Migration: Add matching_history column to cohorts table
-- Run this in your Supabase SQL Editor

-- Add the matching_history column to the cohorts table
ALTER TABLE cohorts
ADD COLUMN matching_history JSONB;

-- Add a comment to document the column
COMMENT ON COLUMN cohorts.matching_history IS 'Stores the history of AI matching runs for this cohort, including generated and launched matches';

-- Optional: Create an index on the matching_history column for better query performance
CREATE INDEX idx_cohorts_matching_history ON cohorts USING GIN (matching_history);

-- Verify the migration
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cohorts'
  AND column_name = 'matching_history';