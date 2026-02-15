-- Cleanup: remove test mentee records created during Power Automate flow testing
-- Keeps the latest record (with full_name = 'Debora G.') and deletes earlier duplicates

DELETE FROM mentees
WHERE slack_user_id = 'U063V99F5UZ'
  AND (full_name IS NULL OR full_name = '');
