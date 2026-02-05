-- Migration: Add missing columns to mentees and mentors tables
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- Project: fjjvhrxpqnoonffrcuqq

-- =============================================
-- MENTEES TABLE - Add missing columns
-- =============================================
ALTER TABLE public.mentees
ADD COLUMN IF NOT EXISTS pronouns text,
ADD COLUMN IF NOT EXISTS life_experiences text[],
ADD COLUMN IF NOT EXISTS other_experience text,
ADD COLUMN IF NOT EXISTS motivation text,
ADD COLUMN IF NOT EXISTS main_reason text,
ADD COLUMN IF NOT EXISTS preferred_style text,
ADD COLUMN IF NOT EXISTS preferred_energy text,
ADD COLUMN IF NOT EXISTS feedback_preference text,
ADD COLUMN IF NOT EXISTS mentor_experience_importance text,
ADD COLUMN IF NOT EXISTS unwanted_qualities text,
ADD COLUMN IF NOT EXISTS mentor_qualities text,
ADD COLUMN IF NOT EXISTS expectations text,
ADD COLUMN IF NOT EXISTS has_participated_before boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS seniority_band text;

-- =============================================
-- MENTORS TABLE - Add missing columns
-- =============================================
ALTER TABLE public.mentors
ADD COLUMN IF NOT EXISTS pronouns text,
ADD COLUMN IF NOT EXISTS life_experiences text[],
ADD COLUMN IF NOT EXISTS other_experiences text,
ADD COLUMN IF NOT EXISTS has_mentored_before boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mentoring_style text,
ADD COLUMN IF NOT EXISTS meeting_style text,
ADD COLUMN IF NOT EXISTS meeting_frequency text,
ADD COLUMN IF NOT EXISTS mentor_energy text,
ADD COLUMN IF NOT EXISTS feedback_style text,
ADD COLUMN IF NOT EXISTS preferred_mentee_level text,
ADD COLUMN IF NOT EXISTS topics_not_to_mentor text,
ADD COLUMN IF NOT EXISTS motivation text,
ADD COLUMN IF NOT EXISTS expectations text,
ADD COLUMN IF NOT EXISTS seniority_band text;

-- =============================================
-- Verify the changes
-- =============================================
SELECT 'mentees' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'mentees'
UNION ALL
SELECT 'mentors' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'mentors'
ORDER BY table_name, column_name;
