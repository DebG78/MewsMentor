-- Phase 10: End-of-Mentoring Survey Responses
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- END SURVEY RESPONSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS end_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  slack_user_id TEXT,
  respondent_name TEXT,
  respondent_type TEXT NOT NULL CHECK (respondent_type IN ('mentor', 'mentee', 'both')),
  survey_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Mentor questions (Q3-Q7)
  mentor_support_growth DECIMAL(3,1),         -- Q3: Mentoring helped me improve how I support others' growth (1-5)
  mentor_used_new_skills DECIMAL(3,1),        -- Q4: I used skills in mentoring that I don't regularly use in my role (1-5)
  mentor_saw_impact DECIMAL(3,1),             -- Q5: I could see a positive impact on my mentee (1-5)
  mentor_time_worthwhile DECIMAL(3,1),        -- Q6: The time I invested in mentoring felt worthwhile (1-5)
  mentor_behavior_change TEXT,                -- Q7: How has mentoring changed the way you support or interact with others at work?

  -- Mentee questions (Q8-Q12)
  mentee_skill_clarity DECIMAL(3,1),          -- Q8: I now have a clearer understanding of how to practice this skill in my day-to-day work (1-5)
  mentee_focus_clarity DECIMAL(3,1),          -- Q9: My mentor helped me clarify what I should focus on developing next (1-5)
  mentee_perspective_challenged DECIMAL(3,1), -- Q10: My mentor challenged my perspective rather than just giving answers (1-5)
  mentee_prepared_between DECIMAL(3,1),       -- Q11: I actively prepared or reflected between sessions (1-5)
  mentee_unexpected_development TEXT,         -- Q12: What is something you ended up developing through mentoring that you didn't expect at the start?

  -- Experience questions (Q13-Q21, both roles)
  cross_team_collaboration DECIMAL(3,1),      -- Q13: Mentoring improved how I collaborate or communicate outside my usual team or domain (1-5)
  match_satisfaction DECIMAL(3,1),            -- Q14: How well did your mentor-mentee pairing work for you? (1-5)
  comfortable_being_open DECIMAL(3,1),        -- Q15: I felt comfortable being open during mentoring conversations (1-5)
  meeting_frequency TEXT,                     -- Q16: How often did you meet?
  session_became_useful TEXT,                 -- Q17: Around which session did conversations start becoming genuinely useful?
  overall_worth DECIMAL(3,1),                 -- Q18: Overall, this mentoring relationship was worth the time invested (1-5)
  easy_momentum DECIMAL(3,1),                -- Q19: It was easy to maintain momentum between sessions (1-5)
  would_join_again TEXT CHECK (would_join_again IN ('yes', 'no', 'maybe')),  -- Q20: Would you join mentoring again?
  open_feedback TEXT,                         -- Q21: Anything you would like to share with us?

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_end_survey_cohort ON end_survey_responses(cohort_id);
CREATE INDEX IF NOT EXISTS idx_end_survey_type ON end_survey_responses(respondent_type);

-- Unique constraint: one response per person per cohort (based on slack_user_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_end_survey_unique
  ON end_survey_responses(cohort_id, slack_user_id) WHERE slack_user_id IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE end_survey_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users full access to end_survey_responses" ON end_survey_responses;
CREATE POLICY "Allow authenticated users full access to end_survey_responses"
  ON end_survey_responses
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- DEFAULT SUCCESS TARGET: Match Satisfaction
-- ============================================================================

INSERT INTO success_targets (cohort_id, metric_name, metric_category, target_value, target_unit, warning_threshold, critical_threshold, comparison_direction, description)
VALUES
  (NULL, 'match_satisfaction_score', 'satisfaction', 4.0, 'rating', 3.5, 3.0, 'higher_is_better', 'Average match pairing satisfaction from end-of-mentoring survey (1-5 scale)')
ON CONFLICT DO NOTHING;
