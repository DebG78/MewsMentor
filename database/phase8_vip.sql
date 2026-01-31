-- Phase 8: VIP Engagement System Tables
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- VIP SCORES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vip_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id TEXT NOT NULL,
  person_type TEXT NOT NULL, -- mentor, mentee
  cohort_id TEXT REFERENCES cohorts(id) ON DELETE CASCADE,
  engagement_score DECIMAL(5,2) DEFAULT 0,
  session_score DECIMAL(5,2) DEFAULT 0,
  response_score DECIMAL(5,2) DEFAULT 0,
  feedback_score DECIMAL(5,2) DEFAULT 0,
  total_score DECIMAL(5,2) GENERATED ALWAYS AS (
    engagement_score + session_score + response_score + feedback_score
  ) STORED,
  is_vip BOOLEAN DEFAULT FALSE,
  vip_reason TEXT,
  manual_vip_override BOOLEAN DEFAULT FALSE,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(person_id, cohort_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_vip_scores_person_id ON vip_scores(person_id);
CREATE INDEX IF NOT EXISTS idx_vip_scores_cohort_id ON vip_scores(cohort_id);
CREATE INDEX IF NOT EXISTS idx_vip_scores_is_vip ON vip_scores(is_vip);
CREATE INDEX IF NOT EXISTS idx_vip_scores_total_score ON vip_scores(total_score);

-- ============================================================================
-- VIP RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vip_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  description TEXT,
  condition_type TEXT NOT NULL, -- score_threshold, component_threshold, percentile
  condition_config JSONB NOT NULL,
  applies_to TEXT DEFAULT 'both', -- mentor, mentee, both
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_vip_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_vip_scores_updated_at ON vip_scores;
CREATE TRIGGER trigger_vip_scores_updated_at
  BEFORE UPDATE ON vip_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_vip_scores_updated_at();

CREATE OR REPLACE FUNCTION update_vip_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_vip_rules_updated_at ON vip_rules;
CREATE TRIGGER trigger_vip_rules_updated_at
  BEFORE UPDATE ON vip_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_vip_rules_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE vip_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_rules ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (admins)
DROP POLICY IF EXISTS "Allow authenticated users full access to vip_scores" ON vip_scores;
CREATE POLICY "Allow authenticated users full access to vip_scores"
  ON vip_scores
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users full access to vip_rules" ON vip_rules;
CREATE POLICY "Allow authenticated users full access to vip_rules"
  ON vip_rules
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- DEFAULT VIP RULES
-- ============================================================================

INSERT INTO vip_rules (rule_name, description, condition_type, condition_config, applies_to, priority)
VALUES
  (
    'High Total Score',
    'VIP status for participants with total score above 80',
    'score_threshold',
    '{"threshold": 80, "score_type": "total"}'::jsonb,
    'both',
    1
  ),
  (
    'Top Engagement',
    'VIP status for participants in top 10% by engagement',
    'percentile',
    '{"percentile": 90, "score_type": "engagement"}'::jsonb,
    'both',
    2
  ),
  (
    'Perfect Response Rate',
    'VIP status for participants with 100% response score',
    'component_threshold',
    '{"threshold": 25, "component": "response_score"}'::jsonb,
    'both',
    3
  ),
  (
    'Session Champion',
    'VIP status for participants with excellent session scores',
    'component_threshold',
    '{"threshold": 25, "component": "session_score"}'::jsonb,
    'mentor',
    4
  )
ON CONFLICT DO NOTHING;
