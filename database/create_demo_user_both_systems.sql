-- Create a demo user that works in BOTH old and new systems
-- This allows you to login with the old system and see data in the new Growth Journey

-- Step 1: Create user in OLD mentees table (for login to work)
INSERT INTO mentees (
  mentee_id,
  name,
  email,
  department,
  role,
  created_at
) VALUES (
  'demo-growth-user',
  'Demo Growth User',
  'demo@skillpoint.com',
  'Technology',
  'Software Engineer',
  NOW()
) ON CONFLICT (mentee_id) DO UPDATE
SET name = EXCLUDED.name,
    email = EXCLUDED.email;

-- Step 2: Create same user in NEW user_profiles table
INSERT INTO user_profiles (
  email,
  full_name,
  role_title,
  department,
  location_timezone,
  bio
) VALUES (
  'demo@skillpoint.com',
  'Demo Growth User',
  'Software Engineer',
  'Technology',
  'America/Los_Angeles',
  'Demo user to test the new Growth Journey dashboard.'
) ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    role_title = EXCLUDED.role_title;

-- Step 3: Add to a program
DO $$
DECLARE
  v_user_id UUID;
  v_cohort_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM user_profiles WHERE email = 'demo@skillpoint.com';
  SELECT id INTO v_cohort_id FROM program_cohorts ORDER BY created_at DESC LIMIT 1;

  IF v_user_id IS NOT NULL AND v_cohort_id IS NOT NULL THEN
    INSERT INTO program_participants (user_id, program_cohort_id, role_in_program, status)
    VALUES (v_user_id, v_cohort_id, 'mentee', 'active')
    ON CONFLICT (user_id, program_cohort_id, role_in_program) DO NOTHING;
  END IF;
END $$;

-- Step 4: Add growth events
DO $$
DECLARE
  v_user_id UUID;
  v_cohort_id UUID;
  v_skill_react UUID;
  v_skill_leadership UUID;
BEGIN
  SELECT id INTO v_user_id FROM user_profiles WHERE email = 'demo@skillpoint.com';
  SELECT id INTO v_cohort_id FROM program_cohorts ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_skill_react FROM skills WHERE name = 'React';
  SELECT id INTO v_skill_leadership FROM skills WHERE name = 'Leadership';

  IF v_user_id IS NOT NULL AND v_cohort_id IS NOT NULL THEN
    -- Program joined event
    INSERT INTO growth_events (user_id, program_cohort_id, event_type, title, description, event_date)
    VALUES (
      v_user_id, v_cohort_id, 'program_joined',
      'Joined Mentoring Program', 'Started your growth journey',
      NOW() - INTERVAL '14 days'
    );

    -- Mentoring session 1
    INSERT INTO growth_events (user_id, program_cohort_id, event_type, title, description, event_date, skills_developed, rating, reflection)
    VALUES (
      v_user_id, v_cohort_id, 'mentoring_session',
      'React Best Practices Discussion',
      'Discussed component architecture and state management patterns',
      NOW() - INTERVAL '10 days',
      ARRAY['React', 'JavaScript'],
      5,
      'Learned about the importance of component composition and when to lift state up. My mentor shared great real-world examples from their projects.'
    );

    -- Mentoring session 2
    INSERT INTO growth_events (user_id, program_cohort_id, event_type, title, description, event_date, skills_developed, rating)
    VALUES (
      v_user_id, v_cohort_id, 'mentoring_session',
      'Career Development Planning',
      'Discussed career goals and created a 6-month development plan',
      NOW() - INTERVAL '3 days',
      ARRAY['Leadership', 'Communication'],
      4
    );

    -- Reflection event
    INSERT INTO growth_events (user_id, program_cohort_id, event_type, title, description, event_date, reflection)
    VALUES (
      v_user_id, v_cohort_id, 'reflection',
      'Week 2 Reflection',
      'Reflecting on my progress in the mentoring program',
      NOW() - INTERVAL '7 days',
      'The mentoring sessions have been incredibly valuable. I feel more confident in my technical skills and have a clearer path forward for my career.'
    );

    -- Update skill progress for React
    IF v_skill_react IS NOT NULL THEN
      INSERT INTO user_skill_progress (user_id, skill_id, proficiency_level, evidence_count)
      VALUES (v_user_id, v_skill_react, 'practicing', 2)
      ON CONFLICT (user_id, skill_id) DO UPDATE
      SET evidence_count = user_skill_progress.evidence_count + 2,
          proficiency_level = 'practicing';
    END IF;

    -- Update skill progress for Leadership
    IF v_skill_leadership IS NOT NULL THEN
      INSERT INTO user_skill_progress (user_id, skill_id, proficiency_level, evidence_count)
      VALUES (v_user_id, v_skill_leadership, 'learning', 1)
      ON CONFLICT (user_id, skill_id) DO UPDATE
      SET evidence_count = user_skill_progress.evidence_count + 1;
    END IF;
  END IF;
END $$;

-- Return login instructions
SELECT
  'Demo user created successfully!' as message,
  'Login with User ID: demo-growth-user' as login_instructions,
  '(Leave password blank)' as note;