-- ============================================================================
-- SEED DATA SCRIPT - SkillPoint Phase 1 (Simplified)
-- ============================================================================
-- Run this in Supabase SQL Editor
-- Make sure you're logged in as the project owner
-- ============================================================================

-- Step 1: Users
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

-- Step 2: Skills
INSERT INTO skills (name, category, description) VALUES
('JavaScript', 'Programming', 'Programming language for web development'),
('React', 'Frontend', 'JavaScript library for building user interfaces'),
('Node.js', 'Backend', 'JavaScript runtime for server-side development'),
('Python', 'Programming', 'General-purpose programming language'),
('System Design', 'Architecture', 'Designing scalable and maintainable systems'),
('SQL', 'Database', 'Database query language'),
('AWS', 'Cloud', 'Amazon Web Services cloud platform'),
('Kubernetes', 'DevOps', 'Container orchestration platform'),
('Leadership', 'Management', 'Leading and inspiring teams'),
('Communication', 'Soft Skills', 'Effective verbal and written communication'),
('Public Speaking', 'Soft Skills', 'Presenting to audiences'),
('Mentoring', 'Management', 'Guiding and supporting others growth'),
('Problem Solving', 'Soft Skills', 'Analytical thinking and solution finding'),
('Time Management', 'Soft Skills', 'Prioritizing and managing time effectively'),
('Product Strategy', 'Product', 'Strategic product planning and roadmapping'),
('User Research', 'Design', 'Understanding user needs through research'),
('UI Design', 'Design', 'User interface design and visual design'),
('Data Analysis', 'Analytics', 'Analyzing data to derive insights'),
('A/B Testing', 'Analytics', 'Experimentation and hypothesis testing'),
('Marketing Strategy', 'Marketing', 'Planning and executing marketing initiatives'),
('Growth Marketing', 'Marketing', 'Data-driven user acquisition and retention'),
('Strategic Planning', 'Business', 'Long-term organizational planning'),
('Stakeholder Management', 'Business', 'Managing relationships with stakeholders'),
('Figma', 'Design', 'Design tool'),
('CI/CD', 'DevOps', 'Continuous integration and deployment')
ON CONFLICT (name) DO NOTHING;

-- Step 3: Verify programs exist
SELECT * FROM programs;

-- Step 4: You'll see the program IDs from above. Use the mentoring program ID below.
-- Replace 'MENTORING_PROGRAM_ID' with the actual UUID from the programs table