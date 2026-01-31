-- Phase 7: Success Metrics Tables
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- SUCCESS TARGETS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS success_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id TEXT REFERENCES cohorts(id) ON DELETE CASCADE, -- NULL = global target
  metric_name TEXT NOT NULL,
  metric_category TEXT NOT NULL DEFAULT 'engagement', -- engagement, satisfaction, completion, retention
  target_value DECIMAL(10,2) NOT NULL,
  target_unit TEXT, -- percentage, count, rating, days
  warning_threshold DECIMAL(10,2), -- yellow zone threshold
  critical_threshold DECIMAL(10,2), -- red zone threshold
  comparison_direction TEXT NOT NULL DEFAULT 'higher_is_better', -- higher_is_better, lower_is_better
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_success_targets_cohort_id ON success_targets(cohort_id);
CREATE INDEX IF NOT EXISTS idx_success_targets_metric_name ON success_targets(metric_name);
CREATE INDEX IF NOT EXISTS idx_success_targets_category ON success_targets(metric_category);

-- ============================================================================
-- METRIC SNAPSHOTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS metric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  actual_value DECIMAL(10,2) NOT NULL,
  snapshot_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for time-series queries
CREATE INDEX IF NOT EXISTS idx_metric_snapshots_cohort_id ON metric_snapshots(cohort_id);
CREATE INDEX IF NOT EXISTS idx_metric_snapshots_date ON metric_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_metric_snapshots_metric_name ON metric_snapshots(metric_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_metric_snapshots_unique
  ON metric_snapshots(cohort_id, metric_name, snapshot_date);

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_success_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_success_targets_updated_at ON success_targets;
CREATE TRIGGER trigger_success_targets_updated_at
  BEFORE UPDATE ON success_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_success_targets_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE success_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_snapshots ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (admins)
DROP POLICY IF EXISTS "Allow authenticated users full access to success_targets" ON success_targets;
CREATE POLICY "Allow authenticated users full access to success_targets"
  ON success_targets
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users full access to metric_snapshots" ON metric_snapshots;
CREATE POLICY "Allow authenticated users full access to metric_snapshots"
  ON metric_snapshots
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- DEFAULT GLOBAL TARGETS
-- ============================================================================

INSERT INTO success_targets (cohort_id, metric_name, metric_category, target_value, target_unit, warning_threshold, critical_threshold, comparison_direction, description)
VALUES
  -- Engagement metrics
  (NULL, 'session_completion_rate', 'engagement', 80, 'percentage', 70, 50, 'higher_is_better', 'Percentage of scheduled sessions completed'),
  (NULL, 'average_sessions_per_pair', 'engagement', 6, 'count', 4, 2, 'higher_is_better', 'Average number of sessions per mentoring pair'),
  (NULL, 'check_in_response_rate', 'engagement', 90, 'percentage', 75, 60, 'higher_is_better', 'Percentage of check-ins with responses'),

  -- Satisfaction metrics
  (NULL, 'mentee_satisfaction_score', 'satisfaction', 4.0, 'rating', 3.5, 3.0, 'higher_is_better', 'Average mentee satisfaction (1-5 scale)'),
  (NULL, 'mentor_satisfaction_score', 'satisfaction', 4.0, 'rating', 3.5, 3.0, 'higher_is_better', 'Average mentor satisfaction (1-5 scale)'),
  (NULL, 'nps_score', 'satisfaction', 50, 'count', 30, 10, 'higher_is_better', 'Net Promoter Score (-100 to 100)'),

  -- Completion metrics
  (NULL, 'program_completion_rate', 'completion', 85, 'percentage', 75, 60, 'higher_is_better', 'Percentage of pairs completing full program'),
  (NULL, 'goal_achievement_rate', 'completion', 70, 'percentage', 55, 40, 'higher_is_better', 'Percentage of stated goals achieved'),

  -- Retention metrics
  (NULL, 'mentor_retention_rate', 'retention', 75, 'percentage', 60, 45, 'higher_is_better', 'Percentage of mentors returning for next cohort'),
  (NULL, 'early_dropout_rate', 'retention', 10, 'percentage', 15, 25, 'lower_is_better', 'Percentage dropping out in first month')
ON CONFLICT DO NOTHING;
