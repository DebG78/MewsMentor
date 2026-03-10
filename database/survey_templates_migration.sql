-- Survey Templates System - Database Migration
-- Run this migration in your Supabase SQL editor

-- 1. Create survey_templates table
CREATE TABLE IF NOT EXISTS survey_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('mentor', 'mentee')),
  steps JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one default per type
CREATE UNIQUE INDEX IF NOT EXISTS unique_default_per_type
ON survey_templates (type)
WHERE is_default = true AND is_active = true;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_survey_templates_type_active
ON survey_templates (type, is_active);

-- 2. Update cohorts table to include survey template references
DO $$
BEGIN
  -- Add mentor_survey_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cohorts' AND column_name = 'mentor_survey_id'
  ) THEN
    ALTER TABLE cohorts ADD COLUMN mentor_survey_id UUID REFERENCES survey_templates(id);
  END IF;

  -- Add mentee_survey_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cohorts' AND column_name = 'mentee_survey_id'
  ) THEN
    ALTER TABLE cohorts ADD COLUMN mentee_survey_id UUID REFERENCES survey_templates(id);
  END IF;
END $$;

-- 3. Update mentors table to include survey responses
DO $$
BEGIN
  -- Add survey_responses if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mentors' AND column_name = 'survey_responses'
  ) THEN
    ALTER TABLE mentors ADD COLUMN survey_responses JSONB;
  END IF;

  -- Add survey_template_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mentors' AND column_name = 'survey_template_id'
  ) THEN
    ALTER TABLE mentors ADD COLUMN survey_template_id UUID REFERENCES survey_templates(id);
  END IF;

  -- Add survey_version if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mentors' AND column_name = 'survey_version'
  ) THEN
    ALTER TABLE mentors ADD COLUMN survey_version INTEGER;
  END IF;
END $$;

-- 4. Update mentees table to include survey responses
DO $$
BEGIN
  -- Add survey_responses if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mentees' AND column_name = 'survey_responses'
  ) THEN
    ALTER TABLE mentees ADD COLUMN survey_responses JSONB;
  END IF;

  -- Add survey_template_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mentees' AND column_name = 'survey_template_id'
  ) THEN
    ALTER TABLE mentees ADD COLUMN survey_template_id UUID REFERENCES survey_templates(id);
  END IF;

  -- Add survey_version if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mentees' AND column_name = 'survey_version'
  ) THEN
    ALTER TABLE mentees ADD COLUMN survey_version INTEGER;
  END IF;
END $$;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE survey_templates ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies (adjust based on your auth setup)
-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Allow read access to survey templates" ON survey_templates;
DROP POLICY IF EXISTS "Allow full access to survey templates" ON survey_templates;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to survey templates"
ON survey_templates FOR SELECT
TO authenticated
USING (true);

-- Allow insert/update/delete for authenticated users (adjust as needed)
CREATE POLICY "Allow full access to survey templates"
ON survey_templates FOR ALL
TO authenticated
USING (true);

-- 7. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_survey_templates_updated_at ON survey_templates;
CREATE TRIGGER update_survey_templates_updated_at
  BEFORE UPDATE ON survey_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Insert default survey templates
-- This will be handled by the application code to ensure proper data structure