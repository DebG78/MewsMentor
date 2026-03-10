-- Migration: Remove Cross-Exposure Functionality
-- Date: 2026-01-30
-- Description: Drops all cross-exposure related tables and updates enums

-- First, drop dependent tables (respecting foreign key order)
DROP TABLE IF EXISTS host_availability_blocks CASCADE;
DROP TABLE IF EXISTS shadow_bookings CASCADE;
DROP TABLE IF EXISTS host_offerings CASCADE;

-- Clean up any cross-exposure related growth events (optional - preserves history if commented out)
-- DELETE FROM growth_events WHERE event_type IN ('cross_exposure_shadow', 'cross_exposure_host');

-- Clean up any cross-exposure related recommendations (optional)
-- DELETE FROM growth_recommendations WHERE recommendation_key IN (
--   'browse_opportunities',
--   'book_first_shadow',
--   'set_learning_goals',
--   'complete_shadow_experience',
--   'add_shadow_reflection',
--   'explore_other_departments'
-- );

-- Note: If you're using PostgreSQL enums (rather than text with CHECK constraints),
-- you may need to recreate the enums. Here's how to do it if needed:

-- For programs.type enum (if using enum type):
-- 1. Create new enum without cross_exposure
-- CREATE TYPE program_type_new AS ENUM ('mentoring', 'other');
-- 2. Update the column
-- ALTER TABLE programs ALTER COLUMN type TYPE program_type_new USING type::text::program_type_new;
-- 3. Drop old enum
-- DROP TYPE program_type;
-- 4. Rename new enum
-- ALTER TYPE program_type_new RENAME TO program_type;

-- For growth_events.event_type enum (if using enum type):
-- 1. Create new enum without cross_exposure types
-- CREATE TYPE growth_event_type_new AS ENUM (
--   'mentoring_session',
--   'badge_earned',
--   'skill_milestone',
--   'reflection',
--   'goal_completed',
--   'program_joined',
--   'program_completed'
-- );
-- 2. Update the column
-- ALTER TABLE growth_events ALTER COLUMN event_type TYPE growth_event_type_new USING event_type::text::growth_event_type_new;
-- 3. Drop old enum
-- DROP TYPE growth_event_type;
-- 4. Rename new enum
-- ALTER TYPE growth_event_type_new RENAME TO growth_event_type;

-- For program_participants.role_in_program (if using enum type):
-- 1. Create new enum without host/shadow
-- CREATE TYPE program_role_new AS ENUM ('mentee', 'mentor', 'admin');
-- 2. Update the column
-- ALTER TABLE program_participants ALTER COLUMN role_in_program TYPE program_role_new USING role_in_program::text::program_role_new;
-- 3. Drop old enum
-- DROP TYPE program_role;
-- 4. Rename new enum
-- ALTER TYPE program_role_new RENAME TO program_role;

-- Verify the tables were dropped
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('host_offerings', 'shadow_bookings', 'host_availability_blocks');
