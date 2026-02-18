-- ============================================================================
-- Cleanup: Drop unused tables
-- Date: 2026-02-18
-- Description: Removes tables that were created in earlier migrations but are
--              not referenced anywhere in the application code.
-- ============================================================================

-- Phase 1 foundation tables (growth/gamification - never built out)
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS user_skill_progress CASCADE;
DROP TABLE IF EXISTS growth_events CASCADE;
DROP TABLE IF EXISTS growth_recommendations CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS skills CASCADE;

-- Phase 5 tables (check-ins/milestones - never connected to UI)
DROP TABLE IF EXISTS check_ins CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;

-- Phase 6 tables (messaging/collaboration - replaced by message_log/message_templates)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS action_items CASCADE;
DROP TABLE IF EXISTS shared_notes CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Sessions migration (Microsoft Graph integration - never built)
DROP TABLE IF EXISTS user_tokens CASCADE;

-- Backup tables from survey redesign migration (no longer needed)
DROP TABLE IF EXISTS mentees_backup CASCADE;
DROP TABLE IF EXISTS mentors_backup CASCADE;
