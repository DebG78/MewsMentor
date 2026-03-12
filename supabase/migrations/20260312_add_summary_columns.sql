-- Add pre-computed LLM summary columns for free-text fields
-- These store concise summaries used in message template placeholders
-- When NULL, the system falls back to the raw field value

ALTER TABLE mentees
  ADD COLUMN IF NOT EXISTS mentoring_goal_summary TEXT,
  ADD COLUMN IF NOT EXISTS bio_summary TEXT;

ALTER TABLE mentors
  ADD COLUMN IF NOT EXISTS bio_summary TEXT,
  ADD COLUMN IF NOT EXISTS hard_earned_lesson_summary TEXT,
  ADD COLUMN IF NOT EXISTS mentor_motivation_summary TEXT,
  ADD COLUMN IF NOT EXISTS mentoring_experience_summary TEXT;
