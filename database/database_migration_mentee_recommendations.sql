-- Migration: Add mentee_recommendations table
-- This table tracks recommended next moves for mentees and their completion status

CREATE TABLE IF NOT EXISTS mentee_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id TEXT NOT NULL,
  cohort_id TEXT NOT NULL,
  recommendation_key TEXT NOT NULL, -- unique identifier for the recommendation type
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- lucide icon name
  stage TEXT NOT NULL, -- which match status this recommendation is for
  display_order INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure a mentee can't have duplicate recommendations
  UNIQUE(mentee_id, recommendation_key)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_mentee_recommendations_mentee ON mentee_recommendations(mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentee_recommendations_cohort ON mentee_recommendations(cohort_id);
CREATE INDEX IF NOT EXISTS idx_mentee_recommendations_stage ON mentee_recommendations(stage);
CREATE INDEX IF NOT EXISTS idx_mentee_recommendations_completed ON mentee_recommendations(is_completed);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mentee_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mentee_recommendations_updated_at
  BEFORE UPDATE ON mentee_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_mentee_recommendations_updated_at();

-- Insert default recommendations for different stages
-- These will be the templates that get created for each mentee

COMMENT ON TABLE mentee_recommendations IS 'Tracks recommended next moves for mentees during different stages of the sprint';
COMMENT ON COLUMN mentee_recommendations.recommendation_key IS 'Unique identifier for recommendation type (e.g., "clarify_goals", "prepare_availability")';
COMMENT ON COLUMN mentee_recommendations.stage IS 'Match status stage: unassigned, awaiting_match, match_pending, or matched';