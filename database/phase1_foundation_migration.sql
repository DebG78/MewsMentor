-- ============================================================================
-- PHASE 1: FOUNDATION - SkillPoint Profile-Centric Redesign
-- ============================================================================
-- This migration transforms SkillPoint from a program-centric mentoring app
-- to a profile-centric growth platform with multiple programs
--
-- Run Date: 2025-09-30
-- Version: 1.0
-- ============================================================================

-- ============================================================================
-- STEP 1: BACKUP EXISTING DATA
-- ============================================================================
-- Before dropping tables, create backup tables (optional but recommended)

-- Backup mentees table
CREATE TABLE IF NOT EXISTS mentees_backup AS
SELECT * FROM mentees;

-- Backup mentors table
CREATE TABLE IF NOT EXISTS mentors_backup AS
SELECT * FROM mentors;

COMMENT ON TABLE mentees_backup IS 'Backup of mentees table before redesign migration (2025-09-30)';
COMMENT ON TABLE mentors_backup IS 'Backup of mentors table before redesign migration (2025-09-30)';

-- ============================================================================
-- STEP 2: CREATE NEW CORE TABLES
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

CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_department ON user_profiles(department);
CREATE INDEX idx_user_profiles_skills ON user_profiles USING GIN(current_skills);

COMMENT ON TABLE user_profiles IS 'Central profile for all users across all programs';
COMMENT ON COLUMN user_profiles.skills_progression IS 'JSON object tracking skill development over time';
COMMENT ON COLUMN user_profiles.preferences IS 'User preferences for notifications, privacy, etc.';

-- -------------------------
-- 2.2 Programs Table
-- -------------------------
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('mentoring', 'cross_exposure', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  program_config JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_programs_type ON programs(type);
CREATE INDEX idx_programs_status ON programs(status);

COMMENT ON TABLE programs IS 'Defines different program types (mentoring, cross-exposure, etc.)';

-- Insert default programs
INSERT INTO programs (name, type, description, status) VALUES
  ('Mentoring Program', 'mentoring', 'Traditional mentoring program with cohort-based matching', 'active'),
  ('Cross-Exposure Program', 'cross_exposure', 'Job shadowing and cross-functional learning experiences', 'active')
ON CONFLICT (name) DO NOTHING;

-- -------------------------
-- 2.3 Program Cohorts Table (replaces old cohorts table structure)
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

CREATE INDEX idx_program_cohorts_program_id ON program_cohorts(program_id);
CREATE INDEX idx_program_cohorts_status ON program_cohorts(status);
CREATE INDEX idx_program_cohorts_dates ON program_cohorts(start_date, end_date);

COMMENT ON TABLE program_cohorts IS 'Cohorts within specific programs (e.g., Q1 2025 Mentoring Cohort)';
COMMENT ON COLUMN program_cohorts.matches IS 'Current active matches in this cohort';
COMMENT ON COLUMN program_cohorts.matching_history IS 'History of matching runs and results';

-- -------------------------
-- 2.4 Program Participants Table
-- -------------------------
CREATE TABLE IF NOT EXISTS program_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  program_cohort_id UUID NOT NULL REFERENCES program_cohorts(id) ON DELETE CASCADE,

  -- Role in this specific program
  role_in_program TEXT NOT NULL CHECK (role_in_program IN ('mentee', 'mentor', 'host', 'shadow', 'admin')),

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

CREATE INDEX idx_program_participants_user_id ON program_participants(user_id);
CREATE INDEX idx_program_participants_cohort_id ON program_participants(program_cohort_id);
CREATE INDEX idx_program_participants_role ON program_participants(role_in_program);
CREATE INDEX idx_program_participants_status ON program_participants(status);

COMMENT ON TABLE program_participants IS 'Tracks user participation in specific program cohorts with their roles';
COMMENT ON COLUMN program_participants.role_data IS 'Stores role-specific data like mentoring preferences, capacity, etc.';

-- -------------------------
-- 2.5 Growth Events Table (Universal activity tracking)
-- -------------------------
CREATE TABLE IF NOT EXISTS growth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  program_cohort_id UUID REFERENCES program_cohorts(id) ON DELETE SET NULL,

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'mentoring_session',
    'cross_exposure_shadow',
    'cross_exposure_host',
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

CREATE INDEX idx_growth_events_user_id ON growth_events(user_id);
CREATE INDEX idx_growth_events_program_cohort_id ON growth_events(program_cohort_id);
CREATE INDEX idx_growth_events_event_type ON growth_events(event_type);
CREATE INDEX idx_growth_events_event_date ON growth_events(event_date);
CREATE INDEX idx_growth_events_related_user ON growth_events(related_user_id);
CREATE INDEX idx_growth_events_skills ON growth_events USING GIN(skills_developed);

COMMENT ON TABLE growth_events IS 'Universal timeline of all growth activities across all programs';
COMMENT ON COLUMN growth_events.event_data IS 'Flexible JSON storage for event-specific data';
COMMENT ON COLUMN growth_events.related_user_id IS 'Other user involved (e.g., mentor, host, shadow)';

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

CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_category ON skills(category);

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

CREATE INDEX idx_user_skill_progress_user_id ON user_skill_progress(user_id);
CREATE INDEX idx_user_skill_progress_skill_id ON user_skill_progress(skill_id);
CREATE INDEX idx_user_skill_progress_level ON user_skill_progress(proficiency_level);

COMMENT ON TABLE user_skill_progress IS 'Tracks individual user progress on specific skills';
COMMENT ON COLUMN user_skill_progress.evidence_count IS 'Number of growth events demonstrating this skill';

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

CREATE INDEX idx_badges_type ON badges(badge_type);

COMMENT ON TABLE badges IS 'Badge definitions with earning criteria';
COMMENT ON COLUMN badges.criteria IS 'JSON criteria for earning this badge';

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

CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX idx_user_badges_earned_at ON user_badges(earned_at);

COMMENT ON TABLE user_badges IS 'Tracks badges earned by users';
COMMENT ON COLUMN user_badges.evidence_event_id IS 'The growth event that triggered this badge';

-- ============================================================================
-- STEP 5: CROSS-EXPOSURE PROGRAM TABLES
-- ============================================================================

-- -------------------------
-- 5.1 Host Offerings Table
-- -------------------------
CREATE TABLE IF NOT EXISTS host_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  skills_offered TEXT[],
  topics_covered TEXT[],
  what_shadow_will_do TEXT,

  -- Availability
  availability JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Capacity
  max_concurrent_shadows INTEGER DEFAULT 2,
  slots_per_week INTEGER DEFAULT 5,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_accepting_bookings BOOLEAN DEFAULT true,

  -- Future curation (nullable for now)
  allowed_shadow_departments TEXT[],
  allowed_shadow_levels TEXT[],

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_host_offerings_host_user_id ON host_offerings(host_user_id);
CREATE INDEX idx_host_offerings_is_active ON host_offerings(is_active);
CREATE INDEX idx_host_offerings_skills ON host_offerings USING GIN(skills_offered);

COMMENT ON TABLE host_offerings IS 'Job shadowing opportunities offered by hosts';
COMMENT ON COLUMN host_offerings.availability IS 'Weekly recurring availability slots';

-- -------------------------
-- 5.2 Shadow Bookings Table
-- -------------------------
CREATE TABLE IF NOT EXISTS shadow_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_offering_id UUID NOT NULL REFERENCES host_offerings(id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  shadow_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Booking details
  booking_type TEXT DEFAULT 'single' CHECK (booking_type IN ('single', 'recurring')),
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  duration_hours DECIMAL(4,2) NOT NULL,

  -- Shadow goals
  learning_goals TEXT,
  skills_to_develop TEXT[],

  -- Status
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  booking_source TEXT DEFAULT 'platform',

  -- Feedback
  shadow_rating INTEGER CHECK (shadow_rating >= 1 AND shadow_rating <= 5),
  shadow_reflection TEXT,
  host_rating INTEGER CHECK (host_rating >= 1 AND host_rating <= 5),
  host_feedback TEXT,
  skills_developed TEXT[],

  -- Admin
  admin_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shadow_bookings_host_offering_id ON shadow_bookings(host_offering_id);
CREATE INDEX idx_shadow_bookings_host_user_id ON shadow_bookings(host_user_id);
CREATE INDEX idx_shadow_bookings_shadow_user_id ON shadow_bookings(shadow_user_id);
CREATE INDEX idx_shadow_bookings_start_datetime ON shadow_bookings(start_datetime);
CREATE INDEX idx_shadow_bookings_status ON shadow_bookings(status);

COMMENT ON TABLE shadow_bookings IS 'Bookings for cross-exposure shadowing experiences';

-- -------------------------
-- 5.3 Host Availability Blocks Table
-- -------------------------
CREATE TABLE IF NOT EXISTS host_availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_offering_id UUID NOT NULL REFERENCES host_offerings(id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Time
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Status
  is_available BOOLEAN DEFAULT true,
  is_booked BOOLEAN DEFAULT false,
  booking_id UUID REFERENCES shadow_bookings(id) ON DELETE SET NULL,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_host_availability_blocks_offering_id ON host_availability_blocks(host_offering_id);
CREATE INDEX idx_host_availability_blocks_host_user_id ON host_availability_blocks(host_user_id);
CREATE INDEX idx_host_availability_blocks_date ON host_availability_blocks(date);
CREATE INDEX idx_host_availability_blocks_is_available ON host_availability_blocks(is_available);

COMMENT ON TABLE host_availability_blocks IS 'Specific time blocks for host availability';

-- ============================================================================
-- STEP 6: RECOMMENDATIONS TABLE (rename from mentee_recommendations)
-- ============================================================================

-- Rename existing table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mentee_recommendations') THEN
    ALTER TABLE mentee_recommendations RENAME TO growth_recommendations_backup;
  END IF;
END $$;

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

CREATE INDEX idx_growth_recommendations_user_id ON growth_recommendations(user_id);
CREATE INDEX idx_growth_recommendations_cohort_id ON growth_recommendations(program_cohort_id);
CREATE INDEX idx_growth_recommendations_stage ON growth_recommendations(stage);
CREATE INDEX idx_growth_recommendations_completed ON growth_recommendations(is_completed);

COMMENT ON TABLE growth_recommendations IS 'Recommended next steps for users across all programs';

-- ============================================================================
-- STEP 7: UPDATE EXISTING TABLES
-- ============================================================================

-- Add program_type field to survey_templates if it doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'survey_templates') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'survey_templates' AND column_name = 'program_type'
    ) THEN
      ALTER TABLE survey_templates ADD COLUMN program_type TEXT DEFAULT 'mentoring';
    END IF;
  END IF;
END $$;

-- Update sessions table to support growth events (optional - adds foreign key)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'sessions' AND column_name = 'growth_event_id'
    ) THEN
      ALTER TABLE sessions ADD COLUMN growth_event_id UUID REFERENCES growth_events(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 8: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shadow_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_recommendations ENABLE ROW LEVEL SECURITY;

-- Temporary open policies (replace with proper auth-based policies later)
-- User Profiles
CREATE POLICY "Users can view all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (true);
CREATE POLICY "Users can insert profiles" ON user_profiles FOR INSERT WITH CHECK (true);

-- Programs (public read)
CREATE POLICY "Anyone can view programs" ON programs FOR SELECT USING (true);
CREATE POLICY "Admins can manage programs" ON programs FOR ALL USING (true);

-- Program Cohorts
CREATE POLICY "Anyone can view cohorts" ON program_cohorts FOR SELECT USING (true);
CREATE POLICY "Admins can manage cohorts" ON program_cohorts FOR ALL USING (true);

-- Program Participants
CREATE POLICY "Users can view participants" ON program_participants FOR SELECT USING (true);
CREATE POLICY "Users can manage participation" ON program_participants FOR ALL USING (true);

-- Growth Events
CREATE POLICY "Users can view their events" ON growth_events FOR SELECT USING (true);
CREATE POLICY "Users can create events" ON growth_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their events" ON growth_events FOR UPDATE USING (true);

-- Skills (public read)
CREATE POLICY "Anyone can view skills" ON skills FOR SELECT USING (true);
CREATE POLICY "Admins can manage skills" ON skills FOR ALL USING (true);

-- User Skill Progress
CREATE POLICY "Users can view skill progress" ON user_skill_progress FOR SELECT USING (true);
CREATE POLICY "Users can update skill progress" ON user_skill_progress FOR ALL USING (true);

-- Badges
CREATE POLICY "Anyone can view badges" ON badges FOR SELECT USING (true);
CREATE POLICY "Admins can manage badges" ON badges FOR ALL USING (true);

-- User Badges
CREATE POLICY "Users can view badges" ON user_badges FOR SELECT USING (true);
CREATE POLICY "System can award badges" ON user_badges FOR INSERT WITH CHECK (true);

-- Host Offerings
CREATE POLICY "Anyone can view active offerings" ON host_offerings FOR SELECT USING (true);
CREATE POLICY "Hosts can manage offerings" ON host_offerings FOR ALL USING (true);

-- Shadow Bookings
CREATE POLICY "Users can view relevant bookings" ON shadow_bookings FOR SELECT USING (true);
CREATE POLICY "Users can create bookings" ON shadow_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their bookings" ON shadow_bookings FOR UPDATE USING (true);

-- Host Availability Blocks
CREATE POLICY "Anyone can view availability" ON host_availability_blocks FOR SELECT USING (true);
CREATE POLICY "Hosts can manage availability" ON host_availability_blocks FOR ALL USING (true);

-- Growth Recommendations
CREATE POLICY "Users can view their recommendations" ON growth_recommendations FOR SELECT USING (true);
CREATE POLICY "System can manage recommendations" ON growth_recommendations FOR ALL USING (true);

-- ============================================================================
-- STEP 9: CREATE TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function already exists from schema.sql, just need to add triggers for new tables

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

CREATE TRIGGER update_host_offerings_updated_at
  BEFORE UPDATE ON host_offerings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shadow_bookings_updated_at
  BEFORE UPDATE ON shadow_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_host_availability_blocks_updated_at
  BEFORE UPDATE ON host_availability_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_growth_recommendations_updated_at
  BEFORE UPDATE ON growth_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 10: VERIFICATION QUERY
-- ============================================================================

-- Run this to verify all tables were created
SELECT
  table_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND information_schema.tables.table_name = t.table_name
    ) THEN '✓ Created'
    ELSE '✗ Missing'
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
  ('host_offerings'),
  ('shadow_bookings'),
  ('host_availability_blocks'),
  ('growth_recommendations')
) AS t(table_name)
ORDER BY table_name;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. The old mentees and mentors tables are backed up but NOT dropped yet
-- 2. Drop them manually after confirming migration success:
--    DROP TABLE mentees CASCADE;
--    DROP TABLE mentors CASCADE;
--
-- 3. Existing tables preserved:
--    - cohorts (data can be migrated to program_cohorts)
--    - sessions
--    - messages
--    - action_items
--    - shared_notes
--    - conversations
--    - survey_templates
--    - user_tokens
--
-- 4. RLS policies are currently open for development
--    Tighten them before production deployment
-- ============================================================================