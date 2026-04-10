-- ============================================================================
-- Go-Live Cleanup: Remove all test/demo user data, keep templates & config
-- Date: 2026-03-27
-- Description: Prepares the system for the first real mentoring cohort by
--              removing all test participants, sessions, message history, and
--              analytics data while preserving message templates, matching
--              models, survey templates, and cohort/program structure.
--
-- IMPORTANT: Review before running! This is destructive and not reversible.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------
-- 1. Clear message delivery history (sent message logs)
--    Keeps: message_templates (the templates themselves)
-- ---------------------------------------------------------------
DELETE FROM message_log;

-- ---------------------------------------------------------------
-- 2. Clear sessions (mentoring session records)
-- ---------------------------------------------------------------
DELETE FROM sessions;

-- ---------------------------------------------------------------
-- 3. Clear analytics & matching artifacts
-- ---------------------------------------------------------------
DELETE FROM profile_embeddings;
DELETE FROM match_explanations;
DELETE FROM vip_scores;
DELETE FROM metric_snapshots;
DELETE FROM end_survey_responses;

-- ---------------------------------------------------------------
-- 4. Clear all participants
--    (mentees/mentors have ON DELETE CASCADE from cohorts,
--     but we delete directly here to keep cohort structure)
-- ---------------------------------------------------------------
DELETE FROM mentees;
DELETE FROM mentors;
DELETE FROM program_participants;

-- ---------------------------------------------------------------
-- 5. Clear user profiles
--    Note: This removes ALL user_profiles rows. If you have admin
--    profiles you want to keep, add a WHERE clause to exclude them.
-- ---------------------------------------------------------------
DELETE FROM user_profiles;

-- ---------------------------------------------------------------
-- 6. Reset match data on cohorts and program_cohorts
--    (clear results, keep structure)
-- ---------------------------------------------------------------
UPDATE cohorts
SET matches = NULL,
    manual_matches = NULL;

UPDATE program_cohorts
SET matches = NULL,
    manual_matches = NULL,
    matching_history = NULL;

-- ---------------------------------------------------------------
-- 7. (Optional) Delete test cohorts entirely
--    Uncomment the lines below if you want to start with zero cohorts.
--    If you prefer to keep cohort shells and just clear participants,
--    leave these commented out.
-- ---------------------------------------------------------------
-- DELETE FROM cohort_stages WHERE cohort_id IN (SELECT id FROM cohorts);
-- DELETE FROM cohorts;

COMMIT;

-- ---------------------------------------------------------------
-- Verification queries: run these after to confirm cleanup
-- ---------------------------------------------------------------
-- SELECT 'mentees' AS tbl, COUNT(*) FROM mentees
-- UNION ALL SELECT 'mentors', COUNT(*) FROM mentors
-- UNION ALL SELECT 'sessions', COUNT(*) FROM sessions
-- UNION ALL SELECT 'message_log', COUNT(*) FROM message_log
-- UNION ALL SELECT 'message_templates', COUNT(*) FROM message_templates
-- UNION ALL SELECT 'profile_embeddings', COUNT(*) FROM profile_embeddings
-- UNION ALL SELECT 'user_profiles', COUNT(*) FROM user_profiles
-- UNION ALL SELECT 'end_survey_responses', COUNT(*) FROM end_survey_responses;
