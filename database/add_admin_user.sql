-- Create an admin demo user in the new user_profiles table
-- This user can login and see the Growth Journey

INSERT INTO user_profiles (
  email,
  full_name,
  role_title,
  department,
  location_timezone,
  bio
) VALUES (
  'admin@skillpoint.com',
  'Admin Demo User',
  'Platform Administrator',
  'Technology',
  'America/Los_Angeles',
  'Demo admin account for testing the new Growth Journey dashboard.'
) ON CONFLICT (email) DO NOTHING;

-- Add them to a program as a mentee to see data
DO $$
DECLARE
  v_user_id UUID;
  v_cohort_id UUID;
BEGIN
  -- Get the user ID
  SELECT id INTO v_user_id FROM user_profiles WHERE email = 'admin@skillpoint.com';

  -- Get a cohort ID
  SELECT id INTO v_cohort_id FROM program_cohorts LIMIT 1;

  -- Add to program if cohort exists
  IF v_cohort_id IS NOT NULL THEN
    INSERT INTO program_participants (user_id, program_cohort_id, role_in_program, status)
    VALUES (v_user_id, v_cohort_id, 'mentee', 'active')
    ON CONFLICT (user_id, program_cohort_id, role_in_program) DO NOTHING;
  END IF;
END $$;

-- Add some growth events for this user
DO $$
DECLARE
  v_user_id UUID;
  v_cohort_id UUID;
  v_event_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM user_profiles WHERE email = 'admin@skillpoint.com';
  SELECT id INTO v_cohort_id FROM program_cohorts LIMIT 1;

  IF v_user_id IS NOT NULL AND v_cohort_id IS NOT NULL THEN
    -- Program joined event
    INSERT INTO growth_events (user_id, program_cohort_id, event_type, title, description, event_date)
    VALUES (
      v_user_id,
      v_cohort_id,
      'program_joined',
      'Joined Q1 2025 Mentoring Program',
      'Started your growth journey in the mentoring program',
      NOW() - INTERVAL '7 days'
    );

    -- Mentoring session
    INSERT INTO growth_events (user_id, program_cohort_id, event_type, title, description, event_date, skills_developed, rating)
    VALUES (
      v_user_id,
      v_cohort_id,
      'mentoring_session',
      'Career Development Discussion',
      'Discussed career goals and development path with mentor',
      NOW() - INTERVAL '3 days',
      ARRAY['Leadership', 'Communication'],
      4
    ) RETURNING id INTO v_event_id;

    -- Update skill progress
    INSERT INTO user_skill_progress (user_id, skill_id, proficiency_level, evidence_count)
    SELECT v_user_id, id, 'learning', 1
    FROM skills
    WHERE name IN ('Leadership', 'Communication')
    ON CONFLICT (user_id, skill_id) DO UPDATE
    SET evidence_count = user_skill_progress.evidence_count + 1;
  END IF;
END $$;

SELECT 'Admin user created! Login with: admin@skillpoint.com' as result;