-- ============================================================================
-- PHASE 2: MATCHING MODELS - Configurable Matching Criteria
-- ============================================================================
-- This migration adds versioned matching models with configurable criteria
-- and rules for the mentoring matching algorithm.
--
-- Run Date: 2026-01-30
-- Version: 1.0
-- ============================================================================

-- ============================================================================
-- STEP 1: MATCHING MODELS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS matching_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  is_default BOOLEAN DEFAULT FALSE,

  -- Scoring weights (should sum to approximately 100 for easy reasoning)
  weights JSONB NOT NULL DEFAULT '{
    "topics": 40,
    "industry": 15,
    "seniority": 10,
    "semantic": 20,
    "timezone": 5,
    "language": 5,
    "capacity_penalty": 10
  }'::jsonb,

  -- Filter settings
  filters JSONB NOT NULL DEFAULT '{
    "min_language_overlap": 1,
    "max_timezone_difference": 3,
    "require_available_capacity": true
  }'::jsonb,

  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure unique name + version combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_matching_models_name_version ON matching_models(name, version);
CREATE INDEX IF NOT EXISTS idx_matching_models_status ON matching_models(status);
CREATE INDEX IF NOT EXISTS idx_matching_models_default ON matching_models(is_default) WHERE is_default = TRUE;

COMMENT ON TABLE matching_models IS 'Versioned matching configurations with weights and filters';

-- ============================================================================
-- STEP 2: MATCHING CRITERIA TABLE (Question Bank)
-- ============================================================================

CREATE TABLE IF NOT EXISTS matching_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matching_model_id UUID NOT NULL REFERENCES matching_models(id) ON DELETE CASCADE,

  -- Question definition
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('single_select', 'multi_select', 'scale', 'free_text')),
  applies_to TEXT NOT NULL CHECK (applies_to IN ('mentor', 'mentee', 'both')),

  -- Options for select types (array of {value, label, points})
  options JSONB,

  -- Scoring configuration
  scoring_attribute TEXT, -- Maps to which attribute for scoring (e.g., 'topics', 'experience')
  weight DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  is_must_have BOOLEAN NOT NULL DEFAULT FALSE,
  is_exclusion BOOLEAN NOT NULL DEFAULT FALSE, -- If true, matching answers = no match

  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matching_criteria_model ON matching_criteria(matching_model_id);
CREATE INDEX IF NOT EXISTS idx_matching_criteria_active ON matching_criteria(is_active);
CREATE INDEX IF NOT EXISTS idx_matching_criteria_order ON matching_criteria(matching_model_id, display_order);

COMMENT ON TABLE matching_criteria IS 'Question bank for matching - criteria and their scoring configuration';

-- ============================================================================
-- STEP 3: MATCHING RULES TABLE (Constraints & Modifiers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS matching_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matching_model_id UUID NOT NULL REFERENCES matching_models(id) ON DELETE CASCADE,

  rule_type TEXT NOT NULL CHECK (rule_type IN ('must_have', 'exclusion', 'bonus', 'penalty')),
  name TEXT NOT NULL,
  description TEXT,

  -- Rule condition (e.g., {field: "seniority_band", operator: ">=", value: "IC3"})
  condition JSONB NOT NULL,

  -- Rule action (e.g., {type: "exclude"} or {type: "points", value: 10})
  action JSONB NOT NULL,

  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matching_rules_model ON matching_rules(matching_model_id);
CREATE INDEX IF NOT EXISTS idx_matching_rules_type ON matching_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_matching_rules_active ON matching_rules(is_active);

COMMENT ON TABLE matching_rules IS 'Matching rules - must-have constraints, exclusions, bonuses, and penalties';

-- ============================================================================
-- STEP 4: ADD MATCHING MODEL REFERENCE TO COHORTS
-- ============================================================================

-- Add columns to link cohorts to specific matching model versions
ALTER TABLE cohorts
ADD COLUMN IF NOT EXISTS matching_model_id UUID REFERENCES matching_models(id),
ADD COLUMN IF NOT EXISTS matching_model_version INTEGER;

CREATE INDEX IF NOT EXISTS idx_cohorts_matching_model ON cohorts(matching_model_id);

-- ============================================================================
-- STEP 5: CREATE TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_matching_models_updated_at
  BEFORE UPDATE ON matching_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matching_criteria_updated_at
  BEFORE UPDATE ON matching_criteria
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matching_rules_updated_at
  BEFORE UPDATE ON matching_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE matching_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_rules ENABLE ROW LEVEL SECURITY;

-- Open policies for development (tighten for production)
CREATE POLICY "Allow all operations on matching_models" ON matching_models FOR ALL USING (true);
CREATE POLICY "Allow all operations on matching_criteria" ON matching_criteria FOR ALL USING (true);
CREATE POLICY "Allow all operations on matching_rules" ON matching_rules FOR ALL USING (true);

-- ============================================================================
-- STEP 7: INSERT DEFAULT MATCHING MODEL
-- ============================================================================

INSERT INTO matching_models (
  name,
  version,
  description,
  status,
  is_default,
  weights,
  filters,
  created_by
) VALUES (
  'Default Matching Model',
  1,
  'Standard matching model with balanced weights for topic matching, seniority fit, and logistics',
  'active',
  TRUE,
  '{
    "topics": 40,
    "industry": 15,
    "seniority": 10,
    "semantic": 20,
    "timezone": 5,
    "language": 5,
    "capacity_penalty": 10
  }'::jsonb,
  '{
    "min_language_overlap": 1,
    "max_timezone_difference": 3,
    "require_available_capacity": true
  }'::jsonb,
  'system'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 8: VERIFICATION QUERY
-- ============================================================================

SELECT
  table_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND information_schema.tables.table_name = t.table_name
    ) THEN 'Created'
    ELSE 'Missing'
  END as status
FROM (VALUES
  ('matching_models'),
  ('matching_criteria'),
  ('matching_rules')
) AS t(table_name)
ORDER BY table_name;
