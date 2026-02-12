-- Migration: Phase 9 - Survey Revamp (Capability-Based Model)
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
--
-- Adds new columns for the revamped mentoring survey:
--   - Mentees: 9 new columns (capabilities, proficiency, practice scenarios, etc.)
--   - Mentors: 13 new columns (motivation, capabilities, strengths, exclusions, etc.)
--   - Sessions: journey_phase column for phase-based next-steps messaging
--   - New tables: message_templates, message_log (for Zapier-based Slack messaging)
--
-- Old columns are kept for backward compatibility with existing cohorts.

-- =============================================
-- MENTEES TABLE - Add 9 new columns
-- =============================================
ALTER TABLE public.mentees
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS primary_capability text,
ADD COLUMN IF NOT EXISTS primary_capability_detail text,
ADD COLUMN IF NOT EXISTS secondary_capability text,
ADD COLUMN IF NOT EXISTS secondary_capability_detail text,
ADD COLUMN IF NOT EXISTS primary_proficiency integer,
ADD COLUMN IF NOT EXISTS secondary_proficiency integer,
ADD COLUMN IF NOT EXISTS mentoring_goal text,
ADD COLUMN IF NOT EXISTS practice_scenarios text[];

-- =============================================
-- MENTORS TABLE - Add 13 new columns
-- =============================================
ALTER TABLE public.mentors
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS mentor_motivation text,
ADD COLUMN IF NOT EXISTS mentoring_experience text,
ADD COLUMN IF NOT EXISTS first_time_support text[],
ADD COLUMN IF NOT EXISTS primary_capability text,
ADD COLUMN IF NOT EXISTS primary_capability_detail text,
ADD COLUMN IF NOT EXISTS secondary_capabilities text[],
ADD COLUMN IF NOT EXISTS secondary_capability_detail text,
ADD COLUMN IF NOT EXISTS primary_proficiency integer,
ADD COLUMN IF NOT EXISTS practice_scenarios text[],
ADD COLUMN IF NOT EXISTS hard_earned_lesson text,
ADD COLUMN IF NOT EXISTS natural_strengths text[],
ADD COLUMN IF NOT EXISTS excluded_scenarios text[],
ADD COLUMN IF NOT EXISTS match_exclusions text;

-- =============================================
-- SESSIONS TABLE - Add journey_phase for next-steps messaging
-- =============================================
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS journey_phase text;

-- =============================================
-- MESSAGE TEMPLATES TABLE (new)
-- =============================================
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id TEXT REFERENCES public.cohorts(id) NULL,   -- NULL = global default
  template_type TEXT NOT NULL,                          -- 'welcome_mentee', 'welcome_mentor', 'channel_announcement', 'next_steps'
  journey_phase TEXT NULL,                              -- 'getting_started', 'building', 'midpoint', 'wrapping_up' (for next_steps only)
  body TEXT NOT NULL,                                   -- Template with {PLACEHOLDER} syntax
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- MESSAGE LOG TABLE (new)
-- =============================================
CREATE TABLE IF NOT EXISTS public.message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id TEXT REFERENCES public.cohorts(id),
  template_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  message_text TEXT NOT NULL,
  delivery_status TEXT DEFAULT 'pending',  -- 'pending', 'sent', 'failed'
  error_detail TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- DISABLE RLS on new tables (matches existing pattern)
-- =============================================
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_log ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (same pattern as other tables)
CREATE POLICY "Allow all for authenticated users" ON public.message_templates
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.message_log
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- Verify the changes
-- =============================================
SELECT 'mentees' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'mentees' AND column_name IN (
  'bio', 'primary_capability', 'primary_capability_detail',
  'secondary_capability', 'secondary_capability_detail',
  'primary_proficiency', 'secondary_proficiency',
  'mentoring_goal', 'practice_scenarios'
)
UNION ALL
SELECT 'mentors' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'mentors' AND column_name IN (
  'bio', 'mentor_motivation', 'mentoring_experience', 'first_time_support',
  'primary_capability', 'primary_capability_detail',
  'secondary_capabilities', 'secondary_capability_detail',
  'primary_proficiency', 'practice_scenarios', 'hard_earned_lesson',
  'natural_strengths', 'excluded_scenarios', 'match_exclusions'
)
UNION ALL
SELECT 'sessions' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sessions' AND column_name = 'journey_phase'
UNION ALL
SELECT 'message_templates' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'message_templates'
UNION ALL
SELECT 'message_log' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'message_log'
ORDER BY table_name, column_name;
