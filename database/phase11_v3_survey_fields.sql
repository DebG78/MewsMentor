-- Phase 11: V3 simplified survey fields + Workday enrichment columns
-- Adds new columns for Q2 2026 survey format (25 questions) and Workday HR data.
-- All columns are nullable to preserve backward compatibility with V1/V2 cohorts.

-- ============================================================================
-- MENTEES: V3 survey + Workday fields
-- ============================================================================

ALTER TABLE mentees ADD COLUMN IF NOT EXISTS capabilities_wanted text;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS role_specific_area text;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS specific_challenge text;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS open_to_first_time_mentor text;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS business_title text;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS compensation_grade text;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS org_level_04 text;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS org_level_05 text;
ALTER TABLE mentees ADD COLUMN IF NOT EXISTS seniority_band text;

-- ============================================================================
-- MENTORS: V3 survey + Workday fields
-- ============================================================================

ALTER TABLE mentors ADD COLUMN IF NOT EXISTS capabilities_offered text;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS role_specific_offering text;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS meaningful_impact text;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS mentor_support_wanted text[];
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS mentor_session_style text;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS topics_prefer_not text;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS business_title text;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS compensation_grade text;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS org_level_04 text;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS org_level_05 text;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS seniority_band text;
