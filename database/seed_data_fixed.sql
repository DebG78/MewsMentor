-- ============================================================================
-- SEED DATA SCRIPT - SkillPoint Phase 1 (RLS-Safe Version)
-- ============================================================================
-- This script populates the database with sample data for testing
-- Run this AFTER the phase1_foundation_migration.sql has been executed
--
-- IMPORTANT: This script disables RLS temporarily for seeding
-- ============================================================================

-- Temporarily disable RLS for seeding (requires superuser/service_role)
-- If you're running this in Supabase dashboard, you're already using service_role

BEGIN;

-- ============================================================================
-- STEP 1: CREATE SAMPLE USER PROFILES
-- ============================================================================

-- Insert sample users
INSERT INTO user_profiles (id, email, full_name, role_title, department, location_timezone, languages, experience_years, bio, current_skills, target_skills) VALUES
  ('user_001', 'alice.johnson@example.com', 'Alice Johnson', 'Senior Software Engineer', 'Engineering', 'America/Los_Angeles', ARRAY['English'], 8, 'Passionate about building scalable systems and mentoring junior developers.', ARRAY['JavaScript', 'React', 'Node.js', 'System Design'], ARRAY['Leadership', 'Technical Writing']),

  ('user_002', 'bob.smith@example.com', 'Bob Smith', 'Product Manager', 'Product', 'America/New_York', ARRAY['English', 'Spanish'], 5, 'Focused on user-centered design and data-driven product decisions.', ARRAY['Product Strategy', 'Data Analysis', 'Roadmapping'], ARRAY['Technical Skills', 'Public Speaking']),

  ('user_003', 'carol.wong@example.com', 'Carol Wong', 'Junior Developer', 'Engineering', 'America/Los_Angeles', ARRAY['English', 'Mandarin'], 2, 'Eager to learn and grow as a software engineer.', ARRAY['JavaScript', 'HTML', 'CSS'], ARRAY['React', 'System Design', 'Testing']),

  ('user_004', 'david.kumar@example.com', 'David Kumar', 'Engineering Manager', 'Engineering', 'Asia/Kolkata', ARRAY['English', 'Hindi'], 12, 'Leading engineering teams with focus on delivery and growth.', ARRAY['Leadership', 'System Design', 'Agile', 'Mentoring'], ARRAY['Executive Presence', 'Strategic Planning']),

  ('user_005', 'emily.chen@example.com', 'Emily Chen', 'UX Designer', 'Design', 'America/Los_Angeles', ARRAY['English'], 4, 'Creating delightful user experiences through research and iteration.', ARRAY['UI Design', 'User Research', 'Figma', 'Prototyping'], ARRAY['Design Systems', 'Accessibility']),

  ('user_006', 'frank.martinez@example.com', 'Frank Martinez', 'Data Analyst', 'Data', 'America/Chicago', ARRAY['English', 'Spanish'], 3, 'Turning data into actionable insights for business growth.', ARRAY['SQL', 'Python', 'Data Visualization', 'Statistics'], ARRAY['Machine Learning', 'A/B Testing']),

  ('user_007', 'grace.liu@example.com', 'Grace Liu', 'Marketing Manager', 'Marketing', 'America/Los_Angeles', ARRAY['English'], 6, 'Building brand awareness and driving customer acquisition.', ARRAY['Marketing Strategy', 'Content Marketing', 'SEO', 'Analytics'], ARRAY['Growth Marketing', 'Technical Marketing']),

  ('user_008', 'henry.patel@example.com', 'Henry Patel', 'DevOps Engineer', 'Engineering', 'Europe/London', ARRAY['English'], 7, 'Passionate about infrastructure, automation, and reliability.', ARRAY['AWS', 'Kubernetes', 'CI/CD', 'Monitoring'], ARRAY['Security', 'Cost Optimization'])

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
  ('Stakeholder Management', 'Business', 'Managing relationships with stakeholders')

ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- STEP 3: CREATE MENTORING COHORT
-- ============================================================================

-- Create a mentoring cohort
INSERT INTO program_cohorts (id, program_id, name, description, status, start_date, end_date, program_manager, target_skills)
SELECT
  'cohort_q1_2025',
  id,
  'Q1 2025 Mentoring Program',
  'First quarter mentoring cohort focusing on technical and leadership growth',
  'active',
  '2025-01-15',
  '2025-04-15',
  'Sarah Johnson',
  ARRAY['Leadership', 'System Design', 'Communication']
FROM programs WHERE type = 'mentoring' LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 4: ADD PROGRAM PARTICIPANTS
-- ============================================================================

-- Add mentors to the mentoring cohort
INSERT INTO program_participants (user_id, program_cohort_id, role_in_program, role_data, status)
VALUES
  ('user_001', 'cohort_q1_2025', 'mentor',
   '{"capacity": 2, "topics_to_mentor": ["System Design", "React", "Mentoring"], "meeting_frequency": "bi-weekly"}'::jsonb,
   'active'),
  ('user_004', 'cohort_q1_2025', 'mentor',
   '{"capacity": 2, "topics_to_mentor": ["Leadership", "Management", "Career Growth"], "meeting_frequency": "bi-weekly"}'::jsonb,
   'active'),
  ('user_008', 'cohort_q1_2025', 'mentor',
   '{"capacity": 2, "topics_to_mentor": ["DevOps", "AWS", "Infrastructure"], "meeting_frequency": "bi-weekly"}'::jsonb,
   'active')
ON CONFLICT (user_id, program_cohort_id, role_in_program) DO NOTHING;

-- Add mentees to the mentoring cohort
INSERT INTO program_participants (user_id, program_cohort_id, role_in_program, role_data, status)
VALUES
  ('user_003', 'cohort_q1_2025', 'mentee',
   '{"topics_to_learn": ["React", "System Design", "Testing"], "meeting_frequency": "bi-weekly", "goals": ["Build confidence in system design", "Learn testing best practices"]}'::jsonb,
   'active'),
  ('user_006', 'cohort_q1_2025', 'mentee',
   '{"topics_to_learn": ["Leadership", "Communication"], "meeting_frequency": "bi-weekly", "goals": ["Improve presentation skills", "Learn to lead projects"]}'::jsonb,
   'active')
ON CONFLICT (user_id, program_cohort_id, role_in_program) DO NOTHING;

-- ============================================================================
-- STEP 5: CREATE SAMPLE GROWTH EVENTS
-- ============================================================================

-- Program joined events for all participants
INSERT INTO growth_events (user_id, program_cohort_id, event_type, title, description, event_date, skills_developed)
VALUES
  ('user_001', 'cohort_q1_2025', 'program_joined', 'Joined Q1 2025 Mentoring Program', 'Enrolled as a mentor', '2025-01-15', ARRAY['Mentoring']),
  ('user_003', 'cohort_q1_2025', 'program_joined', 'Joined Q1 2025 Mentoring Program', 'Enrolled as a mentee', '2025-01-15', ARRAY['Mentoring']),
  ('user_004', 'cohort_q1_2025', 'program_joined', 'Joined Q1 2025 Mentoring Program', 'Enrolled as a mentor', '2025-01-15', ARRAY['Mentoring']),
  ('user_006', 'cohort_q1_2025', 'program_joined', 'Joined Q1 2025 Mentoring Program', 'Enrolled as a mentee', '2025-01-15', ARRAY['Mentoring']),
  ('user_008', 'cohort_q1_2025', 'program_joined', 'Joined Q1 2025 Mentoring Program', 'Enrolled as a mentor', '2025-01-15', ARRAY['Mentoring']);

-- Sample mentoring session events (mentee perspective)
INSERT INTO growth_events (user_id, program_cohort_id, event_type, title, description, event_date, related_user_id, skills_developed, reflection, rating)
VALUES
  ('user_003', 'cohort_q1_2025', 'mentoring_session', 'React Best Practices Session', 'Discussed React patterns, hooks, and component architecture', '2025-02-01 10:00:00', 'user_001', ARRAY['React', 'System Design'], 'Learned about custom hooks and state management patterns. Very helpful session!', 5),
  ('user_006', 'cohort_q1_2025', 'mentoring_session', 'Leadership & Communication', 'Worked on presentation skills and stakeholder communication', '2025-02-05 14:00:00', 'user_004', ARRAY['Leadership', 'Communication'], 'Received great feedback on my presentation style. Need to work on storytelling.', 4);

-- Corresponding mentor growth events
INSERT INTO growth_events (user_id, program_cohort_id, event_type, title, description, event_date, related_user_id, skills_developed, reflection, rating)
VALUES
  ('user_001', 'cohort_q1_2025', 'mentoring_session', 'Mentored Carol on React', 'Shared React best practices and architectural patterns', '2025-02-01 10:00:00', 'user_003', ARRAY['Mentoring', 'Communication'], 'Carol is making great progress. Need to focus more on testing patterns next time.', 5),
  ('user_004', 'cohort_q1_2025', 'mentoring_session', 'Mentored Frank on Leadership', 'Discussed presentation techniques and executive communication', '2025-02-05 14:00:00', 'user_006', ARRAY['Mentoring', 'Leadership'], 'Frank has strong technical skills but needs to work on simplifying complex topics for non-technical audiences.', 4);

-- Sample reflection event
INSERT INTO growth_events (user_id, program_cohort_id, event_type, title, description, event_date, skills_developed, reflection, rating)
VALUES
  ('user_003', 'cohort_q1_2025', 'reflection', 'Week 3 Reflection', 'Reflecting on my learning progress', '2025-02-07', ARRAY['Problem Solving'], 'This week I realized the importance of breaking down problems into smaller pieces. Applied this to a work project and it made a huge difference.', 5);

-- ============================================================================
-- STEP 6: CREATE SAMPLE USER SKILL PROGRESS
-- ============================================================================

-- Add skill progress for user_003 (Carol)
INSERT INTO user_skill_progress (user_id, skill_id, proficiency_level, evidence_count, first_recorded, last_updated)
SELECT
  'user_003',
  s.id,
  CASE
    WHEN s.name = 'React' THEN 'practicing'
    WHEN s.name = 'System Design' THEN 'learning'
    ELSE 'learning'
  END,
  CASE
    WHEN s.name = 'React' THEN 3
    WHEN s.name = 'System Design' THEN 2
    ELSE 1
  END,
  '2025-01-15',
  '2025-02-07'
FROM skills s
WHERE s.name IN ('React', 'System Design', 'Problem Solving')
ON CONFLICT (user_id, skill_id) DO NOTHING;

-- Add skill progress for user_006 (Frank)
INSERT INTO user_skill_progress (user_id, skill_id, proficiency_level, evidence_count, first_recorded, last_updated)
SELECT
  'user_006',
  s.id,
  'practicing',
  3,
  '2025-01-15',
  '2025-02-07'
FROM skills s
WHERE s.name IN ('Leadership', 'Communication')
ON CONFLICT (user_id, skill_id) DO NOTHING;

-- ============================================================================
-- STEP 7: CREATE SAMPLE RECOMMENDATIONS
-- ============================================================================

INSERT INTO growth_recommendations (user_id, program_cohort_id, recommendation_key, title, description, icon, stage, display_order, is_completed, completed_at)
VALUES
  ('user_003', 'cohort_q1_2025', 'complete_profile', 'Complete your profile', 'Add your skills, goals, and preferences to your profile', 'User', 'getting_started', 1, true, '2025-01-16'),
  ('user_003', 'cohort_q1_2025', 'set_goals', 'Set your learning goals', 'Define what you want to achieve in this program', 'Target', 'getting_started', 2, true, '2025-01-17'),
  ('user_003', 'cohort_q1_2025', 'introduce_yourself', 'Introduce yourself', 'Send a message to your mentor', 'Mail', 'getting_started', 3, true, '2025-01-20'),
  ('user_003', 'cohort_q1_2025', 'add_reflection', 'Add a reflection', 'Reflect on your recent session or learning', 'PenTool', 'active', 2, false, NULL),

  ('user_006', 'cohort_q1_2025', 'complete_profile', 'Complete your profile', 'Add your skills, goals, and preferences to your profile', 'User', 'getting_started', 1, true, '2025-01-16'),
  ('user_006', 'cohort_q1_2025', 'add_reflection', 'Add a reflection', 'Reflect on your recent session or learning', 'PenTool', 'active', 2, false, NULL);

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count records in each table
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
SELECT 'growth_recommendations', COUNT(*) FROM growth_recommendations
ORDER BY table_name;

-- Display sample data summary
SELECT
  'Total Users: ' || (SELECT COUNT(*) FROM user_profiles) ||
  ' | Mentors: ' || (SELECT COUNT(DISTINCT user_id) FROM program_participants WHERE role_in_program = 'mentor') ||
  ' | Mentees: ' || (SELECT COUNT(DISTINCT user_id) FROM program_participants WHERE role_in_program = 'mentee') ||
  ' | Growth Events: ' || (SELECT COUNT(*) FROM growth_events) ||
  ' | Skills: ' || (SELECT COUNT(*) FROM skills) as summary;

-- ============================================================================
-- DONE! ✅
-- ============================================================================

SELECT '✅ Seed data loaded successfully!' as status;