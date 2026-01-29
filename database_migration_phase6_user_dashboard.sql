-- Migration: Phase 6 - Enhanced User Dashboard & Profile System
-- Run this in your Supabase SQL Editor

-- Add profile_goals and private_notes columns to mentees table
ALTER TABLE mentees
ADD COLUMN profile_goals JSONB DEFAULT '[]'::jsonb,
ADD COLUMN private_notes TEXT;

-- Add profile_goals and private_notes columns to mentors table
ALTER TABLE mentors
ADD COLUMN profile_goals JSONB DEFAULT '[]'::jsonb,
ADD COLUMN private_notes TEXT;

-- Add survey columns to cohorts table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'mentor_survey_id') THEN
        ALTER TABLE cohorts ADD COLUMN mentor_survey_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'mentee_survey_id') THEN
        ALTER TABLE cohorts ADD COLUMN mentee_survey_id TEXT;
    END IF;
END $$;

-- Create messages table for communication between mentors and mentees
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('mentor', 'mentee')),
  recipient_id TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('mentor', 'mentee')),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'voice')),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  is_read BOOLEAN DEFAULT false,
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create action_items table for tracking goals and tasks
CREATE TABLE IF NOT EXISTS action_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id TEXT NOT NULL,
  assignee_type TEXT NOT NULL CHECK (assignee_type IN ('mentor', 'mentee')),
  assigner_id TEXT NOT NULL,
  assigner_type TEXT NOT NULL CHECK (assigner_type IN ('mentor', 'mentee')),
  cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create shared_notes table for collaborative notes between mentor-mentee pairs
CREATE TABLE IF NOT EXISTS shared_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  mentor_id TEXT NOT NULL,
  mentee_id TEXT NOT NULL,
  cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  last_edited_by_id TEXT NOT NULL,
  last_edited_by_type TEXT NOT NULL CHECK (last_edited_by_type IN ('mentor', 'mentee')),
  version INTEGER DEFAULT 1,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conversations table to manage chat conversations
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  mentor_id TEXT NOT NULL,
  mentee_id TEXT NOT NULL,
  cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  mentor_last_read_at TIMESTAMPTZ DEFAULT NOW(),
  mentee_last_read_at TIMESTAMPTZ DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mentor_id, mentee_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mentees_profile_goals ON mentees USING GIN (profile_goals);
CREATE INDEX IF NOT EXISTS idx_mentors_profile_goals ON mentors USING GIN (profile_goals);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

CREATE INDEX IF NOT EXISTS idx_action_items_assignee_id ON action_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_action_items_assigner_id ON action_items(assigner_id);
CREATE INDEX IF NOT EXISTS idx_action_items_cohort_id ON action_items(cohort_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_due_date ON action_items(due_date);

CREATE INDEX IF NOT EXISTS idx_shared_notes_mentor_id ON shared_notes(mentor_id);
CREATE INDEX IF NOT EXISTS idx_shared_notes_mentee_id ON shared_notes(mentee_id);
CREATE INDEX IF NOT EXISTS idx_shared_notes_cohort_id ON shared_notes(cohort_id);
CREATE INDEX IF NOT EXISTS idx_shared_notes_is_archived ON shared_notes(is_archived);

CREATE INDEX IF NOT EXISTS idx_conversations_mentor_id ON conversations(mentor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_mentee_id ON conversations(mentee_id);
CREATE INDEX IF NOT EXISTS idx_conversations_cohort_id ON conversations(cohort_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);

-- Add comments to document the new columns and tables
COMMENT ON COLUMN mentees.profile_goals IS 'JSON array of personal goals and objectives set by the mentee';
COMMENT ON COLUMN mentees.private_notes IS 'Private notes visible only to the mentee';
COMMENT ON COLUMN mentors.profile_goals IS 'JSON array of mentoring goals and objectives set by the mentor';
COMMENT ON COLUMN mentors.private_notes IS 'Private notes visible only to the mentor';

COMMENT ON TABLE messages IS 'Messages exchanged between mentors and mentees';
COMMENT ON TABLE action_items IS 'Action items and tasks assigned between mentors and mentees';
COMMENT ON TABLE shared_notes IS 'Shared notes that both mentor and mentee can edit collaboratively';
COMMENT ON TABLE conversations IS 'Conversation threads between mentor-mentee pairs';

-- Enable Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (adjust based on your security requirements)
-- Messages policies
CREATE POLICY "Messages are viewable by conversation participants" ON messages
  FOR SELECT USING (true);
CREATE POLICY "Messages are insertable by authenticated users" ON messages
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Messages are updatable by sender" ON messages
  FOR UPDATE USING (true);
CREATE POLICY "Messages are deletable by sender" ON messages
  FOR DELETE USING (true);

-- Action items policies
CREATE POLICY "Action items are viewable by participants" ON action_items
  FOR SELECT USING (true);
CREATE POLICY "Action items are insertable by authenticated users" ON action_items
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Action items are updatable by participants" ON action_items
  FOR UPDATE USING (true);
CREATE POLICY "Action items are deletable by creator" ON action_items
  FOR DELETE USING (true);

-- Shared notes policies
CREATE POLICY "Shared notes are viewable by mentor-mentee pair" ON shared_notes
  FOR SELECT USING (true);
CREATE POLICY "Shared notes are insertable by authenticated users" ON shared_notes
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Shared notes are updatable by mentor-mentee pair" ON shared_notes
  FOR UPDATE USING (true);
CREATE POLICY "Shared notes are deletable by creator" ON shared_notes
  FOR DELETE USING (true);

-- Conversations policies
CREATE POLICY "Conversations are viewable by participants" ON conversations
  FOR SELECT USING (true);
CREATE POLICY "Conversations are insertable by authenticated users" ON conversations
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Conversations are updatable by participants" ON conversations
  FOR UPDATE USING (true);
CREATE POLICY "Conversations are deletable by participants" ON conversations
  FOR DELETE USING (true);

-- Create triggers to automatically update updated_at timestamps
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_action_items_updated_at
  BEFORE UPDATE ON action_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_notes_updated_at
  BEFORE UPDATE ON shared_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create conversation when first message is sent
CREATE OR REPLACE FUNCTION create_conversation_if_not_exists()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO conversations (id, mentor_id, mentee_id, cohort_id, last_message_at)
  VALUES (NEW.conversation_id,
          CASE WHEN NEW.sender_type = 'mentor' THEN NEW.sender_id ELSE NEW.recipient_id END,
          CASE WHEN NEW.sender_type = 'mentee' THEN NEW.sender_id ELSE NEW.recipient_id END,
          (SELECT cohort_id FROM mentees WHERE mentee_id = CASE WHEN NEW.sender_type = 'mentee' THEN NEW.sender_id ELSE NEW.recipient_id END LIMIT 1),
          NEW.created_at)
  ON CONFLICT (mentor_id, mentee_id) DO UPDATE SET
    last_message_at = NEW.created_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create conversation when message is inserted
CREATE TRIGGER create_conversation_on_message
  BEFORE INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION create_conversation_if_not_exists();

-- Function to update conversation last_message_at when new message is sent
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamps
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Verify the migration by checking all new columns and tables
SELECT 'mentees_profile_goals' as item,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mentees' AND column_name = 'profile_goals')
            THEN '✓ Added' ELSE '✗ Missing' END as status
UNION ALL
SELECT 'mentees_private_notes',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mentees' AND column_name = 'private_notes')
            THEN '✓ Added' ELSE '✗ Missing' END
UNION ALL
SELECT 'mentors_profile_goals',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mentors' AND column_name = 'profile_goals')
            THEN '✓ Added' ELSE '✗ Missing' END
UNION ALL
SELECT 'mentors_private_notes',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mentors' AND column_name = 'private_notes')
            THEN '✓ Added' ELSE '✗ Missing' END
UNION ALL
SELECT 'messages_table',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages')
            THEN '✓ Created' ELSE '✗ Missing' END
UNION ALL
SELECT 'action_items_table',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'action_items')
            THEN '✓ Created' ELSE '✗ Missing' END
UNION ALL
SELECT 'shared_notes_table',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shared_notes')
            THEN '✓ Created' ELSE '✗ Missing' END
UNION ALL
SELECT 'conversations_table',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations')
            THEN '✓ Created' ELSE '✗ Missing' END;