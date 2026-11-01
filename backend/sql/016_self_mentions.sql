BEGIN;
SELECT pg_advisory_xact_lock(714209016);
-- Restore existing self-mentions that older versions intentionally did not notify.
-- Preserve the original date and every existing read/unread notification.
INSERT INTO qa.mention_notifications(project_id,comment_id,user_id,created_at)
SELECT m.project_id,m.comment_id,m.user_id,c.created_at
FROM qa.comment_mentions m
JOIN qa.comments c ON c.project_id=m.project_id AND c.id=m.comment_id
JOIN qa.users u ON u.id=m.user_id AND u.is_active
WHERE c.author_id=m.user_id AND c.deleted_at IS NULL
  AND qa.project_role(m.project_id,m.user_id) IS NOT NULL
ON CONFLICT(comment_id,user_id) DO NOTHING;
INSERT INTO qa.schema_migrations(version) VALUES('016_self_mentions');
COMMIT;
