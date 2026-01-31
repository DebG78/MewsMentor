-- Phase 6: Cohort Runbook Tables
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- COHORT STAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cohort_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  stage_type TEXT NOT NULL, -- setup, import, matching, review, launch, midpoint, closure, reporting
  stage_name TEXT NOT NULL,
  owner TEXT,
  due_date DATE,
  completed_date DATE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, blocked
  checklist JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cohort_stages_cohort_id ON cohort_stages(cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_stages_status ON cohort_stages(status);
CREATE INDEX IF NOT EXISTS idx_cohort_stages_due_date ON cohort_stages(due_date);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_cohort_stages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cohort_stages_updated_at ON cohort_stages;
CREATE TRIGGER trigger_cohort_stages_updated_at
  BEFORE UPDATE ON cohort_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_cohort_stages_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE cohort_stages ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users (admins)
DROP POLICY IF EXISTS "Allow authenticated users full access to cohort_stages" ON cohort_stages;
CREATE POLICY "Allow authenticated users full access to cohort_stages"
  ON cohort_stages
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- DEFAULT STAGE TEMPLATES
-- ============================================================================

-- Function to initialize default stages for a new cohort
CREATE OR REPLACE FUNCTION initialize_cohort_stages(p_cohort_id TEXT)
RETURNS void AS $$
DECLARE
  stage_templates JSONB := '[
    {
      "stage_type": "setup",
      "stage_name": "Program Setup",
      "display_order": 0,
      "checklist": [
        {"id": "1", "text": "Define program objectives", "completed": false},
        {"id": "2", "text": "Set timeline and key dates", "completed": false},
        {"id": "3", "text": "Configure matching model", "completed": false},
        {"id": "4", "text": "Prepare communication templates", "completed": false}
      ]
    },
    {
      "stage_type": "import",
      "stage_name": "Participant Import",
      "display_order": 1,
      "checklist": [
        {"id": "1", "text": "Import mentor profiles", "completed": false},
        {"id": "2", "text": "Import mentee profiles", "completed": false},
        {"id": "3", "text": "Validate profile data", "completed": false},
        {"id": "4", "text": "Review capacity settings", "completed": false}
      ]
    },
    {
      "stage_type": "matching",
      "stage_name": "Match Generation",
      "display_order": 2,
      "checklist": [
        {"id": "1", "text": "Run matching algorithm", "completed": false},
        {"id": "2", "text": "Review match scores", "completed": false},
        {"id": "3", "text": "Identify edge cases", "completed": false},
        {"id": "4", "text": "Generate alternatives for low scores", "completed": false}
      ]
    },
    {
      "stage_type": "review",
      "stage_name": "Match Review & Approval",
      "display_order": 3,
      "checklist": [
        {"id": "1", "text": "Review all proposed matches", "completed": false},
        {"id": "2", "text": "Handle constraint violations", "completed": false},
        {"id": "3", "text": "Make manual adjustments", "completed": false},
        {"id": "4", "text": "Final approval sign-off", "completed": false}
      ]
    },
    {
      "stage_type": "launch",
      "stage_name": "Program Launch",
      "display_order": 4,
      "checklist": [
        {"id": "1", "text": "Send match notifications", "completed": false},
        {"id": "2", "text": "Distribute welcome materials", "completed": false},
        {"id": "3", "text": "Schedule kickoff sessions", "completed": false},
        {"id": "4", "text": "Confirm mentor availability", "completed": false}
      ]
    },
    {
      "stage_type": "midpoint",
      "stage_name": "Midpoint Check-in",
      "display_order": 5,
      "checklist": [
        {"id": "1", "text": "Send midpoint surveys", "completed": false},
        {"id": "2", "text": "Conduct check-in calls", "completed": false},
        {"id": "3", "text": "Review engagement metrics", "completed": false},
        {"id": "4", "text": "Address at-risk pairs", "completed": false}
      ]
    },
    {
      "stage_type": "closure",
      "stage_name": "Program Closure",
      "display_order": 6,
      "checklist": [
        {"id": "1", "text": "Send final surveys", "completed": false},
        {"id": "2", "text": "Collect testimonials", "completed": false},
        {"id": "3", "text": "Host closing ceremony", "completed": false},
        {"id": "4", "text": "Gather feedback", "completed": false}
      ]
    },
    {
      "stage_type": "reporting",
      "stage_name": "Final Reporting",
      "display_order": 7,
      "checklist": [
        {"id": "1", "text": "Compile success metrics", "completed": false},
        {"id": "2", "text": "Generate final report", "completed": false},
        {"id": "3", "text": "Document lessons learned", "completed": false},
        {"id": "4", "text": "Archive program data", "completed": false}
      ]
    }
  ]'::jsonb;
  stage JSONB;
BEGIN
  -- Delete existing stages for this cohort
  DELETE FROM cohort_stages WHERE cohort_id = p_cohort_id;

  -- Insert new stages from template
  FOR stage IN SELECT * FROM jsonb_array_elements(stage_templates)
  LOOP
    INSERT INTO cohort_stages (
      cohort_id,
      stage_type,
      stage_name,
      display_order,
      checklist,
      status
    ) VALUES (
      p_cohort_id,
      stage->>'stage_type',
      stage->>'stage_name',
      (stage->>'display_order')::INTEGER,
      stage->'checklist',
      'pending'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Example usage (don't run this automatically):
-- SELECT initialize_cohort_stages('your-cohort-id');
