-- Fix Survey Templates RLS Policies
-- This allows both authenticated and anonymous users to access survey templates

-- Drop existing policies
DROP POLICY IF EXISTS "Allow read access to survey templates" ON survey_templates;
DROP POLICY IF EXISTS "Allow full access to survey templates" ON survey_templates;

-- Create new policies that allow both authenticated and anonymous access
CREATE POLICY "Allow read access to survey templates"
ON survey_templates FOR SELECT
USING (true);

CREATE POLICY "Allow insert access to survey templates"
ON survey_templates FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update access to survey templates"
ON survey_templates FOR UPDATE
USING (true);

CREATE POLICY "Allow delete access to survey templates"
ON survey_templates FOR DELETE
USING (true);

-- Alternative: If you want to completely disable RLS for now
-- ALTER TABLE survey_templates DISABLE ROW LEVEL SECURITY;