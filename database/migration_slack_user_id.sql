-- Migration: Add slack_user_id columns for email-free messaging
-- Email columns are left in place for legacy data but no longer written to.

ALTER TABLE mentees ADD COLUMN IF NOT EXISTS slack_user_id TEXT;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS slack_user_id TEXT;
ALTER TABLE message_log ADD COLUMN IF NOT EXISTS slack_user_id TEXT;
