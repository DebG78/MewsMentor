-- Migration: Add stage_type column to message_templates
-- Run this in your Supabase SQL Editor
--
-- Adds a stage_type column so templates can be tagged to a runbook stage
-- (launch, midpoint, closure, etc.). This is used for filtering and
-- auto-populating templates in the Cohort Runbook.

ALTER TABLE public.message_templates
ADD COLUMN IF NOT EXISTS stage_type TEXT NULL;

-- Backfill existing templates with sensible defaults
UPDATE public.message_templates
SET stage_type = 'launch'
WHERE template_type IN ('welcome_mentee', 'welcome_mentor', 'channel_announcement')
  AND stage_type IS NULL;

UPDATE public.message_templates
SET stage_type = 'midpoint'
WHERE template_type LIKE 'next_steps%'
  AND journey_phase = 'midpoint'
  AND stage_type IS NULL;

UPDATE public.message_templates
SET stage_type = 'closure'
WHERE template_type LIKE 'next_steps%'
  AND journey_phase = 'wrapping_up'
  AND stage_type IS NULL;

-- Verify
SELECT id, template_type, journey_phase, stage_type
FROM public.message_templates
ORDER BY template_type, journey_phase;
