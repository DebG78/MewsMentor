-- ============================================================================
-- SEED DATA SCRIPT - SkillPoint Phase 1 (With Proper UUIDs)
-- ============================================================================
-- Run this in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: CREATE SAMPLE USER PROFILES (Using gen_random_uuid())
-- ============================================================================

-- Insert sample users (let PostgreSQL generate UUIDs)
INSERT INTO user_profiles (email, full_name, role_title, department, location_timezone, languages, experience_years, bio, current_skills, target_skills) VALUES
  ('alice.johnson@example.com', 'Alice Johnson', 'Senior Software Engineer', 'Engineering', 'America/Los_Angeles', ARRAY['English'], 8, 'Passionate about building scalable systems and mentoring junior developers.', ARRAY['JavaScript', 'React', 'Node.js', 'System Design'], ARRAY['Leadership', 'Technical Writing']),

  ('bob.smith@example.com', 'Bob Smith', 'Product Manager', 'Product', 'America/New_York', ARRAY['English', 'Spanish'], 5, 'Focused on user-centered design and data-driven product decisions.', ARRAY['Product Strategy', 'Data Analysis', 'Roadmapping'], ARRAY['Technical Skills', 'Public Speaking']),

  ('carol.wong@example.com', 'Carol Wong', 'Junior Developer', 'Engineering', 'America/Los_Angeles', ARRAY['English', 'Mandarin'], 2, 'Eager to learn and grow as a software engineer.', ARRAY['JavaScript', 'HTML', 'CSS'], ARRAY['React', 'System Design', 'Testing']),

  ('david.kumar@example.com', 'David Kumar', 'Engineering Manager', 'Engineering', 'Asia/Kolkata', ARRAY['English', 'Hindi'], 12, 'Leading engineering teams with focus on delivery and growth.', ARRAY['Leadership', 'System Design', 'Agile', 'Mentoring'], ARRAY['Executive Presence', 'Strategic Planning']),

  ('emily.chen@example.com', 'Emily Chen', 'UX Designer', 'Design', 'America/Los_Angeles', ARRAY['English'], 4, 'Creating delightful user experiences through research and iteration.', ARRAY['UI Design', 'User Research', 'Figma', 'Prototyping'], ARRAY['Design Systems', 'Accessibility']),

  ('frank.martinez@example.com', 'Frank Martinez', 'Data Analyst', 'Data', 'America/Chicago', ARRAY['English', 'Spanish'], 3, 'Turning data into actionable insights for business growth.', ARRAY['SQL', 'Python', 'Data Visualization', 'Statistics'], ARRAY['Machine Learning', 'A/B Testing']),

  ('grace.liu@example.com', 'Grace Liu', 'Marketing Manager', 'Marketing', 'America/Los_Angeles', ARRAY['English'], 6, 'Building brand awareness and driving customer acquisition.', ARRAY['Marketing Strategy', 'Content Marketing', 'SEO', 'Analytics'], ARRAY['Growth Marketing', 'Technical Marketing']),

  ('henry.patel@example.com', 'Henry Patel', 'DevOps Engineer', 'Engineering', 'Europe/London', ARRAY['English'], 7, 'Passionate about infrastructure, automation, and reliability.', ARRAY['AWS', 'Kubernetes', 'CI/CD', 'Monitoring'], ARRAY['Security', 'Cost Optimization'])

ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- STEP 2: CREATE SAMPLE SKILLS
-- ============================================================================

INSERT INTO skills (name, category, description) VALUES
  -- Technical Skills
  ('JavaScript', 'Programming', 'Programming language for web development'),
  ('React', 'Frontend', 'JavaScript library for building user interfaces'),
  ('Node.js', 'Backend', 'JavaScript runtime for server-side development'),
  ('Python', 'Programming', 'General-purpose programming language'),
  ('System Design', 'Architecture', 'Designing scalable and maintainable systems'),
  ('SQL', 'Database', 'Database query language'),
  ('AWS', 'Cloud', 'Amazon Web Services cloud platform'),
  ('Kubernetes', 'DevOps', 'Container orchestration platform'),

  -- Soft Skills
  ('Leadership', 'Management', 'Leading and inspiring teams'),
  ('Communication', 'Soft Skills', 'Effective verbal and written communication'),
  ('Public Speaking', 'Soft Skills', 'Presenting to audiences'),
  ('Mentoring', 'Management', 'Guiding and supporting others growth'),
  ('Problem Solving', 'Soft Skills', 'Analytical thinking and solution finding'),
  ('Time Management', 'Soft Skills', 'Prioritizing and managing time effectively'),

  -- Product & Design
  ('Product Strategy', 'Product', 'Strategic product planning and roadmapping'),
  ('User Research', 'Design', 'Understanding user needs through research'),
  ('UI Design', 'Design', 'User interface design and visual design'),
  ('Data Analysis', 'Analytics', 'Analyzing data to derive insights'),
  ('A/B Testing', 'Analytics', 'Experimentation and hypothesis testing'),

  -- Business Skills
  ('Marketing Strategy', 'Marketing', 'Planning and executing marketing initiatives'),
  ('Growth Marketing', 'Marketing', 'Data-driven user acquisition and retention'),
  ('Strategic Planning', 'Business', 'Long-term organizational planning'),
  ('Stakeholder Management', 'Business', 'Managing relationships with stakeholders'),
  ('Figma', 'Design', 'Design and prototyping tool'),
  ('CI/CD', 'DevOps', 'Continuous integration and deployment')

ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- STEP 3: CREATE MENTORING COHORT
-- ============================================================================

-- Create a mentoring cohort (using program ID from programs table)
INSERT INTO program_cohorts (program_id, name, description, status, start_date, end_date, program_manager, target_skills)
SELECT
  id,
  'Q1 2025 Mentoring Program',
  'First quarter mentoring cohort focusing on technical and leadership growth',
  'active',
  '2025-01-15',
  '2025-04-15',
  'Sarah Johnson',
  ARRAY['Leadership', 'System Design', 'Communication']
FROM programs WHERE type = 'mentoring' LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 4: ADD PROGRAM PARTICIPANTS (Using actual user IDs)
-- ============================================================================

-- Store cohort ID in a variable for reference
DO $$
DECLARE
  v_cohort_id UUID;
  v_alice_id UUID;
  v_carol_id UUID;
  v_david_id UUID;
  v_frank_id UUID;
  v_henry_id UUID;
  v_bob_id UUID;
  v_emily_id UUID;
  v_grace_id UUID;
BEGIN
  -- Get the cohort ID we just created
  SELECT id INTO v_cohort_id FROM program_cohorts WHERE name = 'Q1 2025 Mentoring Program' LIMIT 1;

  -- Get user IDs by email
  SELECT id INTO v_alice_id FROM user_profiles WHERE email = 'alice.johnson@example.com';
  SELECT id INTO v_carol_id FROM user_profiles WHERE email = 'carol.wong@example.com';
  SELECT id INTO v_david_id FROM user_profiles WHERE email = 'david.kumar@example.com';
  SELECT id INTO v_frank_id FROM user_profiles WHERE email = 'frank.martinez@example.com';
  SELECT id INTO v_henry_id FROM user_profiles WHERE email = 'henry.patel@example.com';
  SELECT id INTO v_bob_id FROM user_profiles WHERE email = 'bob.smith@example.com';
  SELECT id INTO v_emily_id FROM user_profiles WHERE email = 'emily.chen@example.com';
  SELECT id INTO v_grace_id FROM user_profiles WHERE email = 'grace.liu@example.com';

  -- Add mentors
  INSERT INTO program_participants (user_id, program_cohort_id, role_in_program, role_data, status)
  VALUES
    (v_alice_id, v_cohort_id, 'mentor',
     '{"capacity": 2, "topics_to_mentor": ["System Design", "React", "Mentoring"], "meeting_frequency": "bi-weekly"}'::jsonb,
     'active'),
    (v_david_id, v_cohort_id, 'mentor',
     '{"capacity": 2, "topics_to_mentor": ["Leadership", "Management", "Career Growth"], "meeting_frequency": "bi-weekly"}'::jsonb,
     'active'),
    (v_henry_id, v_cohort_id, 'mentor',
     '{"capacity": 2, "topics_to_mentor": ["DevOps", "AWS", "Infrastructure"], "meeting_frequency": "bi-weekly"}'::jsonb,
     'active')
  ON CONFLICT (user_id, program_cohort_id, role_in_program) DO NOTHING;

  -- Add mentees
  INSERT INTO program_participants (user_id, program_cohort_id, role_in_program, role_data, status)
  VALUES
    (v_carol_id, v_cohort_id, 'mentee',
     '{"topics_to_learn": ["React", "System Design", "Testing"], "meeting_frequency": "bi-weekly", "goals": ["Build confidence in system design", "Learn testing best practices"]}'::jsonb,
     'active'),
    (v_frank_id, v_cohort_id, 'mentee',
     '{"topics_to_learn": ["Leadership", "Communication"], "meeting_frequency": "bi-weekly", "goals": ["Improve presentation skills", "Learn to lead projects"]}'::jsonb,
     'active')
  ON CONFLICT (user_id, program_cohort_id, role_in_program) DO NOTHING;

  -- Add growth events
  INSERT INTO growth_events (user_id, program_cohort_id, event_type, title, description, event_date, skills_developed)
  VALUES
    (v_alice_id, v_cohort_id, 'program_joined', 'Joined Q1 2025 Mentoring Program', 'Enrolled as a mentor', '2025-01-15', ARRAY['Mentoring']),
    (v_carol_id, v_cohort_id, 'program_joined', 'Joined Q1 2025 Mentoring Program', 'Enrolled as a mentee', '2025-01-15', ARRAY['Mentoring']),
    (v_david_id, v_cohort_id, 'program_joined', 'Joined Q1 2025 Mentoring Program', 'Enrolled as a mentor', '2025-01-15', ARRAY['Mentoring']),
    (v_frank_id, v_cohort_id, 'program_joined', 'Joined Q1 2025 Mentoring Program', 'Enrolled as a mentee', '2025-01-15', ARRAY['Mentoring']),
    (v_henry_id, v_cohort_id, 'program_joined', 'Joined Q1 2025 Mentoring Program', 'Enrolled as a mentor', '2025-01-15', ARRAY['Mentoring']);

  -- Add mentoring session events
  INSERT INTO growth_events (user_id, program_cohort_id, event_type, title, description, event_date, related_user_id, skills_developed, reflection, rating)
  VALUES
    (v_carol_id, v_cohort_id, 'mentoring_session', 'React Best Practices Session',
     'Discussed React patterns, hooks, and component architecture', '2025-02-01 10:00:00',
     v_alice_id, ARRAY['React', 'System Design'],
     'Learned about custom hooks and state management patterns. Very helpful session!', 5),

    (v_alice_id, v_cohort_id, 'mentoring_session', 'Mentored Carol on React',
     'Shared React best practices and architectural patterns', '2025-02-01 10:00:00',
     v_carol_id, ARRAY['Mentoring', 'Communication'],
     'Carol is making great progress. Need to focus more on testing patterns next time.', 5);

  -- Add skill progress
  INSERT INTO user_skill_progress (user_id, skill_id, proficiency_level, evidence_count, first_recorded, last_updated)
  SELECT v_carol_id, s.id, 'practicing', 3, '2025-01-15', '2025-02-07'
  FROM skills s WHERE s.name = 'React'
  ON CONFLICT (user_id, skill_id) DO NOTHING;

  INSERT INTO user_skill_progress (user_id, skill_id, proficiency_level, evidence_count, first_recorded, last_updated)
  SELECT v_carol_id, s.id, 'learning', 2, '2025-01-15', '2025-02-07'
  FROM skills s WHERE s.name = 'System Design'
  ON CONFLICT (user_id, skill_id) DO NOTHING;

  -- Add host offerings
  INSERT INTO host_offerings (host_user_id, title, description, skills_offered, topics_covered, what_shadow_will_do, availability, max_concurrent_shadows, slots_per_week, is_active, is_accepting_bookings)
  VALUES
    (v_bob_id,
     'Product Strategy in Action',
     'Shadow me during product roadmap planning, user interviews, and stakeholder meetings.',
     ARRAY['Product Strategy', 'User Research', 'Stakeholder Management'],
     ARRAY['Roadmap Planning', 'User Interviews', 'Data-Driven Decisions'],
     'Observe user interviews, participate in planning discussions, review product metrics together',
     '{"monday": [{"start": "09:00", "end": "12:00"}], "wednesday": [{"start": "14:00", "end": "17:00"}]}'::jsonb,
     2, 3, true, true),

    (v_emily_id,
     'UX Design Process Deep Dive',
     'Experience the full UX design process from research to final designs.',
     ARRAY['UI Design', 'User Research', 'Figma'],
     ARRAY['User Research', 'Wireframing', 'Prototyping', 'User Testing'],
     'Participate in user research sessions, observe design critiques, learn Figma tips',
     '{"tuesday": [{"start": "10:00", "end": "13:00"}], "thursday": [{"start": "10:00", "end": "13:00"}]}'::jsonb,
     1, 2, true, true);

  -- Add recommendations
  INSERT INTO growth_recommendations (user_id, program_cohort_id, recommendation_key, title, description, icon, stage, display_order, is_completed, completed_at)
  VALUES
    (v_carol_id, v_cohort_id, 'complete_profile', 'Complete your profile', 'Add your skills, goals, and preferences', 'User', 'getting_started', 1, true, '2025-01-16'),
    (v_carol_id, v_cohort_id, 'set_goals', 'Set your learning goals', 'Define what you want to achieve', 'Target', 'getting_started', 2, true, '2025-01-17'),
    (v_carol_id, v_cohort_id, 'add_reflection', 'Add a reflection', 'Reflect on your recent session', 'PenTool', 'active', 3, false, NULL);

  RAISE NOTICE '✅ Seed data loaded successfully!';
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT 'user_profiles' as table_name, COUNT(*) as record_count FROM user_profiles
UNION ALL
SELECT 'skills', COUNT(*) FROM skills
UNION ALL
SELECT 'program_cohorts', COUNT(*) FROM program_cohorts
UNION ALL
SELECT 'program_participants', COUNT(*) FROM program_participants
UNION ALL
SELECT 'growth_events', COUNT(*) FROM growth_events
UNION ALL
SELECT 'user_skill_progress', COUNT(*) FROM user_skill_progress
UNION ALL
SELECT 'host_offerings', COUNT(*) FROM host_offerings
UNION ALL
SELECT 'growth_recommendations', COUNT(*) FROM growth_recommendations
ORDER BY table_name;

-- Show sample data
SELECT
  'Total Users: ' || (SELECT COUNT(*) FROM user_profiles) ||
  ' | Mentors: ' || (SELECT COUNT(DISTINCT user_id) FROM program_participants WHERE role_in_program = 'mentor') ||
  ' | Mentees: ' || (SELECT COUNT(DISTINCT user_id) FROM program_participants WHERE role_in_program = 'mentee') ||
  ' | Growth Events: ' || (SELECT COUNT(*) FROM growth_events) ||
  ' | Skills: ' || (SELECT COUNT(*) FROM skills) as summary;