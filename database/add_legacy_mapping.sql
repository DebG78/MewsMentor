-- Add a field to map old mentee_id/mentor_id to new user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS legacy_user_id TEXT;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_legacy_id ON user_profiles(legacy_user_id);

-- Now create the demo user with mapping
INSERT INTO mentees (mentee_id, cohort_id, role)
VALUES ('demo-growth', 'demo-cohort', 'Software Engineer')
ON CONFLICT (mentee_id) DO NOTHING;

INSERT INTO user_profiles (email, full_name, role_title, department, location_timezone, legacy_user_id)
VALUES ('demo-growth@skillpoint.com', 'Demo Growth User', 'Software Engineer', 'Technology', 'America/Los_Angeles', 'demo-growth')
ON CONFLICT (email) DO UPDATE SET legacy_user_id = EXCLUDED.legacy_user_id;

-- Add to program
DO $$
DECLARE
  v_user_id UUID;
  v_cohort_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM user_profiles WHERE legacy_user_id = 'demo-growth';
  SELECT id INTO v_cohort_id FROM program_cohorts ORDER BY created_at DESC LIMIT 1;

  IF v_user_id IS NOT NULL AND v_cohort_id IS NOT NULL THEN
    INSERT INTO program_participants (user_id, program_cohort_id, role_in_program, status)
    VALUES (v_user_id, v_cohort_id, 'mentee', 'active')
    ON CONFLICT DO NOTHING;

    -- Add growth events
    INSERT INTO growth_events (user_id, program_cohort_id, event_type, title, event_date, skills_developed, rating)
    VALUES
      (v_user_id, v_cohort_id, 'program_joined', 'Joined Mentoring Program', NOW() - INTERVAL '10 days', NULL, NULL),
      (v_user_id, v_cohort_id, 'mentoring_session', 'React Deep Dive', NOW() - INTERVAL '5 days', ARRAY['React', 'JavaScript'], 5),
      (v_user_id, v_cohort_id, 'mentoring_session', 'Career Planning', NOW() - INTERVAL '2 days', ARRAY['Leadership'], 4);

    -- Add skills
    INSERT INTO user_skill_progress (user_id, skill_id, proficiency_level, evidence_count)
    SELECT v_user_id, id, 'practicing', 2 FROM skills WHERE name = 'React'
    ON CONFLICT (user_id, skill_id) DO UPDATE SET evidence_count = 2, proficiency_level = 'practicing';

    INSERT INTO user_skill_progress (user_id, skill_id, proficiency_level, evidence_count)
    SELECT v_user_id, id, 'learning', 1 FROM skills WHERE name = 'Leadership'
    ON CONFLICT (user_id, skill_id) DO UPDATE SET evidence_count = 1;
  END IF;
END $$;

SELECT 'Demo user ready! Login with: demo-growth' as result;