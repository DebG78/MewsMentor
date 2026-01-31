-- ============================================================================
-- PHASE 5: CHECK-INS AND MILESTONES
-- ============================================================================
-- This migration adds check-in tracking and milestone management
--
-- Run Date: 2026-01-30
-- Version: 1.0
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK-INS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  mentor_id TEXT NOT NULL,
  mentee_id TEXT NOT NULL,

  -- Check-in details
  check_in_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'missed', 'cancelled')),

  -- Notes and risk tracking
  notes TEXT,
  risk_flag TEXT NOT NULL DEFAULT 'green' CHECK (risk_flag IN ('green', 'amber', 'red')),
  risk_reason TEXT,

  -- Next actions
  next_action TEXT,
  next_action_date DATE,
  next_action_owner TEXT,

  -- Session metadata
  session_count INTEGER DEFAULT 0,
  last_session_date DATE,

  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_check_ins_cohort ON check_ins(cohort_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_pair ON check_ins(cohort_id, mentor_id, mentee_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_risk ON check_ins(risk_flag);
CREATE INDEX IF NOT EXISTS idx_check_ins_status ON check_ins(status);
CREATE INDEX IF NOT EXISTS idx_check_ins_date ON check_ins(check_in_date);

COMMENT ON TABLE check_ins IS 'Tracks check-ins for mentor-mentee pairs with risk flagging';

-- ============================================================================
-- STEP 2: MILESTONES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  mentor_id TEXT,
  mentee_id TEXT,

  -- Milestone details
  title TEXT NOT NULL,
  description TEXT,
  milestone_type TEXT NOT NULL DEFAULT 'custom' CHECK (milestone_type IN ('kickoff', 'midpoint', 'closure', 'custom')),

  -- Dates and status
  target_date DATE,
  completed_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),

  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_cohort ON milestones(cohort_id);
CREATE INDEX IF NOT EXISTS idx_milestones_pair ON milestones(cohort_id, mentor_id, mentee_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_type ON milestones(milestone_type);

COMMENT ON TABLE milestones IS 'Tracks milestones for cohorts and individual pairs';

-- ============================================================================
-- STEP 3: CREATE TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_check_ins_updated_at
  BEFORE UPDATE ON check_ins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 4: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on check_ins" ON check_ins FOR ALL USING (true);
CREATE POLICY "Allow all operations on milestones" ON milestones FOR ALL USING (true);

-- ============================================================================
-- STEP 5: VERIFICATION QUERY
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
  ('check_ins'),
  ('milestones')
) AS t(table_name)
ORDER BY table_name;
