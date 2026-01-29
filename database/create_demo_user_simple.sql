-- Simple approach: Create a demo user in both systems
-- The mentees table doesn't have email/name, so we'll create minimal records

-- Step 1: Insert into OLD mentees table (minimal required fields)
INSERT INTO mentees (mentee_id, cohort_id, role)
VALUES ('demo-growth', 'demo-cohort', 'Software Engineer')
ON CONFLICT (mentee_id) DO NOTHING;

-- Step 2: Insert into NEW user_profiles table
INSERT INTO user_profiles (email, full_name, role_title, department, location_timezone)
VALUES ('demo-growth@skillpoint.com', 'Demo Growth User', 'Software Engineer', 'Technology', 'America/Los_Angeles')
ON CONFLICT (email) DO NOTHING;

-- Step 3: Add to program_participants
DO $$
DECLARE
  v_user_id UUID;
  v_cohort_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM user_profiles WHERE email = 'demo-growth@skillpoint.com';
  SELECT id INTO v_cohort_id FROM program_cohorts ORDER BY created_at DESC LIMIT 1;

  IF v_user_id IS NOT NULL AND v_cohort_id IS NOT NULL THEN
    INSERT INTO program_participants (user_id, program_cohort_id, role_in_program, status)
    VALUES (v_user_id, v_cohort_id, 'mentee', 'active')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Step 4: Create growth events
DO $$
DECLARE
  v_user_id UUID;
  v_cohort_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM user_profiles WHERE email = 'demo-growth@skillpoint.com';
  SELECT id INTO v_cohort_id FROM program_cohorts ORDER BY created_at DESC LIMIT 1;

  IF v_user_id IS NOT NULL AND v_cohort_id IS NOT NULL THEN
    INSERT INTO growth_events (user_id, program_cohort_id, event_type, title, event_date, skills_developed, rating)
    VALUES
      (v_user_id, v_cohort_id, 'program_joined', 'Joined Mentoring Program', NOW() - INTERVAL '10 days', NULL, NULL),
      (v_user_id, v_cohort_id, 'mentoring_session', 'First Mentoring Session', NOW() - INTERVAL '5 days', ARRAY['React', 'JavaScript'], 5),
      (v_user_id, v_cohort_id, 'mentoring_session', 'Career Planning', NOW() - INTERVAL '2 days', ARRAY['Leadership'], 4)
    ON CONFLICT DO NOTHING;

    -- Add skills
    INSERT INTO user_skill_progress (user_id, skill_id, proficiency_level, evidence_count)
    SELECT v_user_id, id, 'practicing', 2
    FROM skills WHERE name = 'React'
    ON CONFLICT (user_id, skill_id) DO UPDATE SET evidence_count = 2;

    INSERT INTO user_skill_progress (user_id, skill_id, proficiency_level, evidence_count)
    SELECT v_user_id, id, 'learning', 1
    FROM skills WHERE name = 'Leadership'
    ON CONFLICT (user_id, skill_id) DO UPDATE SET evidence_count = 1;
  END IF;
END $$;

SELECT 'User created! Login with ID: demo-growth (no password)' as message;