-- Migration: Add sessions and user tokens tables
-- Run this in your Supabase SQL Editor

-- Create sessions table
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id TEXT NOT NULL,
  mentee_id TEXT NOT NULL,
  cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_datetime TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  meeting_url TEXT,
  meeting_id TEXT, -- Outlook/Teams meeting ID
  notes TEXT,
  mentor_rating INTEGER CHECK (mentor_rating >= 1 AND mentor_rating <= 5),
  mentee_rating INTEGER CHECK (mentee_rating >= 1 AND mentee_rating <= 5),
  mentor_feedback TEXT,
  mentee_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user tokens table for Microsoft Graph authentication
CREATE TABLE user_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL UNIQUE,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_sessions_cohort_id ON sessions(cohort_id);
CREATE INDEX idx_sessions_mentor_id ON sessions(mentor_id);
CREATE INDEX idx_sessions_mentee_id ON sessions(mentee_id);
CREATE INDEX idx_sessions_scheduled_datetime ON sessions(scheduled_datetime);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_user_tokens_email ON user_tokens(user_email);

-- Add comments to document the tables
COMMENT ON TABLE sessions IS 'Stores mentoring sessions between mentor-mentee pairs';
COMMENT ON TABLE user_tokens IS 'Stores Microsoft Graph API tokens for calendar integration';

-- Add RLS (Row Level Security) policies
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth setup)
CREATE POLICY "Sessions are viewable by everyone" ON sessions FOR SELECT USING (true);
CREATE POLICY "Sessions are insertable by authenticated users" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Sessions are updatable by authenticated users" ON sessions FOR UPDATE USING (true);
CREATE POLICY "Sessions are deletable by authenticated users" ON sessions FOR DELETE USING (true);

CREATE POLICY "User tokens are viewable by owner" ON user_tokens FOR SELECT USING (true);
CREATE POLICY "User tokens are insertable by authenticated users" ON user_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "User tokens are updatable by owner" ON user_tokens FOR UPDATE USING (true);
CREATE POLICY "User tokens are deletable by owner" ON user_tokens FOR DELETE USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tokens_updated_at BEFORE UPDATE ON user_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify the migrations
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('sessions', 'user_tokens')
ORDER BY table_name, ordinal_position;