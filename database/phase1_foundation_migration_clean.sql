-- ============================================================================
-- PHASE 1: FOUNDATION - SkillPoint Mentoring-Only Version
-- ============================================================================
-- This migration creates the database schema for a mentoring-only platform
-- Cross-exposure (job shadowing) tables have been removed
--
-- Run Date: 2026-01-30
-- Version: 2.0 (Mentoring Only)
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE HELPER FUNCTION
-- ============================================================================

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: CREATE CORE TABLES
-- ============================================================================

-- -------------------------
-- 2.1 User Profiles Table
-- -------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role_title TEXT,
  department TEXT,
  location_timezone TEXT,
  languages TEXT[],
  experience_years INTEGER,
  bio TEXT,
  profile_image_url TEXT,

  -- Skills tracking (JSONB for flexibility)
  current_skills TEXT[],
  target_skills TEXT[],
  skills_progression JSONB DEFAULT '{}'::jsonb,

  -- Preferences
  preferences JSONB DEFAULT '{}'::jsonb,
  availability_settings JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_department ON user_profiles(department);
CREATE INDEX IF NOT EXISTS idx_user_profiles_skills ON user_profiles USING GIN(current_skills);

COMMENT ON TABLE user_profiles IS 'Central profile for all users across all programs';

-- -------------------------
-- 2.2 Programs Table
-- -------------------------
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('mentoring', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  program_config JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_programs_type ON programs(type);
CREATE INDEX IF NOT EXISTS idx_programs_status ON programs(status);

COMMENT ON TABLE programs IS 'Defines different program types';

-- Insert default mentoring program
INSERT INTO programs (name, type, description, status) VALUES
  ('Mentoring Program', 'mentoring', 'Traditional mentoring program with cohort-based matching', 'active')
ON CONFLICT (name) DO NOTHING;

-- -------------------------
-- 2.3 Program Cohorts Table
-- -------------------------
CREATE TABLE IF NOT EXISTS program_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,

  -- Cohort details
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'paused')),

  -- Dates
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,

  -- Management
  program_manager TEXT,
  target_skills TEXT[],

  -- Legacy fields (keeping for backward compatibility with existing features)
  matches JSONB,
  matching_history JSONB,
  mentor_survey_id UUID,
  mentee_survey_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_program_cohorts_program_id ON program_cohorts(program_id);
CREATE INDEX IF NOT EXISTS idx_program_cohorts_status ON program_cohorts(status);
CREATE INDEX IF NOT EXISTS idx_program_cohorts_dates ON program_cohorts(start_date, end_date);

COMMENT ON TABLE program_cohorts IS 'Cohorts within specific programs (e.g., Q1 2025 Mentoring Cohort)';

-- -------------------------
-- 2.4 Program Participants Table
-- -------------------------
CREATE TABLE IF NOT EXISTS program_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  program_cohort_id UUID NOT NULL REFERENCES program_cohorts(id) ON DELETE CASCADE,

  -- Role in this specific program (mentoring only)
  role_in_program TEXT NOT NULL CHECK (role_in_program IN ('mentee', 'mentor', 'admin')),

  -- Role-specific data (flexible JSON storage)
  role_data JSONB DEFAULT '{}'::jsonb,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'dropped')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure a user can't have duplicate roles in the same cohort
  UNIQUE(user_id, program_cohort_id, role_in_program)
);

CREATE INDEX IF NOT EXISTS idx_program_participants_user_id ON program_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_program_participants_cohort_id ON program_participants(program_cohort_id);
CREATE INDEX IF NOT EXISTS idx_program_participants_role ON program_participants(role_in_program);
CREATE INDEX IF NOT EXISTS idx_program_participants_status ON program_participants(status);

COMMENT ON TABLE program_participants IS 'Tracks user participation in specific program cohorts with their roles';

-- -------------------------
-- 2.5 Growth Events Table (Universal activity tracking)
-- -------------------------
CREATE TABLE IF NOT EXISTS growth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  program_cohort_id UUID REFERENCES program_cohorts(id) ON DELETE SET NULL,

  -- Event details (mentoring only event types)
  event_type TEXT NOT NULL CHECK (event_type IN (
    'mentoring_session',
    'badge_earned',
    'skill_milestone',
    'reflection',
    'goal_completed',
    'program_joined',
    'program_completed'
  )),
  title TEXT NOT NULL,
  description TEXT,
  event_data JSONB DEFAULT '{}'::jsonb,
  event_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Relationships
  related_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  related_event_id UUID REFERENCES growth_events(id) ON DELETE SET NULL,

  -- Engagement tracking
  skills_developed TEXT[],
  reflection TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_growth_events_user_id ON growth_events(user_id);
CREATE INDEX IF NOT EXISTS idx_growth_events_program_cohort_id ON growth_events(program_cohort_id);
CREATE INDEX IF NOT EXISTS idx_growth_events_event_type ON growth_events(event_type);
CREATE INDEX IF NOT EXISTS idx_growth_events_event_date ON growth_events(event_date);
CREATE INDEX IF NOT EXISTS idx_growth_events_related_user ON growth_events(related_user_id);
CREATE INDEX IF NOT EXISTS idx_growth_events_skills ON growth_events USING GIN(skills_developed);

COMMENT ON TABLE growth_events IS 'Universal timeline of all growth activities';

-- ============================================================================
-- STEP 3: SKILLS TRACKING TABLES
-- ============================================================================

-- -------------------------
-- 3.1 Skills Table
-- -------------------------
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  description TEXT,
  related_skills TEXT[],

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);

COMMENT ON TABLE skills IS 'Master list of skills that can be developed';

-- -------------------------
-- 3.2 User Skill Progress Table
-- -------------------------
CREATE TABLE IF NOT EXISTS user_skill_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,

  proficiency_level TEXT NOT NULL DEFAULT 'learning'
    CHECK (proficiency_level IN ('learning', 'practicing', 'proficient', 'expert')),
  evidence_count INTEGER NOT NULL DEFAULT 0,

  first_recorded TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_user_skill_progress_user_id ON user_skill_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_progress_skill_id ON user_skill_progress(skill_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_progress_level ON user_skill_progress(proficiency_level);

COMMENT ON TABLE user_skill_progress IS 'Tracks individual user progress on specific skills';

-- ============================================================================
-- STEP 4: BADGES & GAMIFICATION
-- ============================================================================

-- -------------------------
-- 4.1 Badges Table
-- -------------------------
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('milestone', 'skill', 'engagement', 'impact')),
  criteria JSONB NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badges_type ON badges(badge_type);

COMMENT ON TABLE badges IS 'Badge definitions with earning criteria';

-- -------------------------
-- 4.2 User Badges Table
-- -------------------------
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,

  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evidence_event_id UUID REFERENCES growth_events(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, badge_id, earned_at)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON user_badges(earned_at);

COMMENT ON TABLE user_badges IS 'Tracks badges earned by users';

-- ============================================================================
-- STEP 5: RECOMMENDATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS growth_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  program_cohort_id UUID REFERENCES program_cohorts(id) ON DELETE CASCADE,

  recommendation_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  stage TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,

  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, recommendation_key)
);

CREATE INDEX IF NOT EXISTS idx_growth_recommendations_user_id ON growth_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_growth_recommendations_cohort_id ON growth_recommendations(program_cohort_id);
CREATE INDEX IF NOT EXISTS idx_growth_recommendations_stage ON growth_recommendations(stage);
CREATE INDEX IF NOT EXISTS idx_growth_recommendations_completed ON growth_recommendations(is_completed);

COMMENT ON TABLE growth_recommendations IS 'Recommended next steps for users';

-- ============================================================================
-- STEP 6: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_recommendations ENABLE ROW LEVEL SECURITY;

-- Open policies for development (tighten for production)
CREATE POLICY "Users can view all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (true);
CREATE POLICY "Users can insert profiles" ON user_profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view programs" ON programs FOR SELECT USING (true);
CREATE POLICY "Admins can manage programs" ON programs FOR ALL USING (true);

CREATE POLICY "Anyone can view cohorts" ON program_cohorts FOR SELECT USING (true);
CREATE POLICY "Admins can manage cohorts" ON program_cohorts FOR ALL USING (true);

CREATE POLICY "Users can view participants" ON program_participants FOR SELECT USING (true);
CREATE POLICY "Users can manage participation" ON program_participants FOR ALL USING (true);

CREATE POLICY "Users can view their events" ON growth_events FOR SELECT USING (true);
CREATE POLICY "Users can create events" ON growth_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their events" ON growth_events FOR UPDATE USING (true);

CREATE POLICY "Anyone can view skills" ON skills FOR SELECT USING (true);
CREATE POLICY "Admins can manage skills" ON skills FOR ALL USING (true);

CREATE POLICY "Users can view skill progress" ON user_skill_progress FOR SELECT USING (true);
CREATE POLICY "Users can update skill progress" ON user_skill_progress FOR ALL USING (true);

CREATE POLICY "Anyone can view badges" ON badges FOR SELECT USING (true);
CREATE POLICY "Admins can manage badges" ON badges FOR ALL USING (true);

CREATE POLICY "Users can view badges" ON user_badges FOR SELECT USING (true);
CREATE POLICY "System can award badges" ON user_badges FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their recommendations" ON growth_recommendations FOR SELECT USING (true);
CREATE POLICY "System can manage recommendations" ON growth_recommendations FOR ALL USING (true);

-- ============================================================================
-- STEP 7: CREATE TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_cohorts_updated_at
  BEFORE UPDATE ON program_cohorts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_participants_updated_at
  BEFORE UPDATE ON program_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_growth_events_updated_at
  BEFORE UPDATE ON growth_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_skill_progress_updated_at
  BEFORE UPDATE ON user_skill_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_badges_updated_at
  BEFORE UPDATE ON badges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_growth_recommendations_updated_at
  BEFORE UPDATE ON growth_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 8: VERIFICATION QUERY
-- ============================================================================

-- Run this to verify all tables were created
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
  ('user_profiles'),
  ('programs'),
  ('program_cohorts'),
  ('program_participants'),
  ('growth_events'),
  ('skills'),
  ('user_skill_progress'),
  ('badges'),
  ('user_badges'),
  ('growth_recommendations')
) AS t(table_name)
ORDER BY table_name;
