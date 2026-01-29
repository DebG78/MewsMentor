-- Migration to simplify sessions table for lightweight meeting tracking
-- This removes scheduling complexity and focuses on logging completed meetings

-- Step 1: Add new meeting_date column (for when the meeting actually happened)
ALTER TABLE sessions ADD COLUMN meeting_date DATE;

-- Step 2: Migrate existing data (convert scheduled_datetime to meeting_date for completed sessions)
UPDATE sessions
SET meeting_date = DATE(scheduled_datetime)
WHERE status = 'completed';

-- Step 3: For scheduled/cancelled/no_show sessions, you may want to delete them or convert them
-- Option A: Delete non-completed sessions (recommended for clean slate)
-- DELETE FROM sessions WHERE status != 'completed';

-- Option B: Keep all and set meeting_date to scheduled date
-- UPDATE sessions SET meeting_date = DATE(scheduled_datetime) WHERE meeting_date IS NULL;

-- Step 4: Make meeting_date NOT NULL after data migration
-- ALTER TABLE sessions ALTER COLUMN meeting_date SET NOT NULL;

-- Step 5: Drop columns we no longer need
ALTER TABLE sessions DROP COLUMN scheduled_datetime;
ALTER TABLE sessions DROP COLUMN duration_minutes;
ALTER TABLE sessions DROP COLUMN status;
ALTER TABLE sessions DROP COLUMN meeting_url;
ALTER TABLE sessions DROP COLUMN meeting_id;

-- Note: Keep mentor_rating, mentee_rating, mentor_feedback, mentee_feedback for future use
-- Note: Keep notes for optional meeting context
-- Note: Keep created_at and updated_at for audit trail

-- Indexes (optimize queries by cohort and by user)
CREATE INDEX IF NOT EXISTS idx_sessions_cohort ON sessions(cohort_id);
CREATE INDEX IF NOT EXISTS idx_sessions_mentor ON sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_mentee ON sessions(mentee_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(meeting_date);
