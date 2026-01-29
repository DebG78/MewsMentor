-- Migration to add missing mentee survey columns
-- These columns store detailed survey responses from the mentee signup form

-- Add missing survey response columns to mentees table
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS other_experience TEXT;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS other_topics TEXT;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS motivation TEXT;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS main_reason TEXT;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS preferred_style TEXT;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS preferred_energy TEXT;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS feedback_preference TEXT;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS mentor_experience_importance TEXT;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS unwanted_qualities TEXT;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS mentor_qualities TEXT;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS expectations TEXT;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS has_participated_before BOOLEAN DEFAULT FALSE;

-- Add comments to document what each column stores
COMMENT ON COLUMN mentees.other_experience IS 'Additional life experience details when "Other" is selected';
COMMENT ON COLUMN mentees.other_topics IS 'Additional topics to learn when "Other" is selected';
COMMENT ON COLUMN mentees.motivation IS 'Mentee motivation for joining the program';
COMMENT ON COLUMN mentees.main_reason IS 'Main reason for seeking mentorship';
COMMENT ON COLUMN mentees.preferred_style IS 'Preferred mentoring style (directive, collaborative, etc.)';
COMMENT ON COLUMN mentees.preferred_energy IS 'Preferred mentor energy level';
COMMENT ON COLUMN mentees.feedback_preference IS 'How mentee prefers to receive feedback';
COMMENT ON COLUMN mentees.mentor_experience_importance IS 'How important is mentor experience level';
COMMENT ON COLUMN mentees.unwanted_qualities IS 'Qualities mentee does not want in a mentor';
COMMENT ON COLUMN mentees.mentor_qualities IS 'Desired qualities in a mentor';
COMMENT ON COLUMN mentees.expectations IS 'Mentee expectations from the mentorship';
COMMENT ON COLUMN mentees.has_participated_before IS 'Whether mentee has participated in mentorship before';
