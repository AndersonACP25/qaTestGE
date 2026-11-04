BEGIN;
SELECT pg_advisory_xact_lock(714209020);
ALTER TABLE qa.test_runs
 ADD COLUMN IF NOT EXISTS release_version varchar(100),
 ADD COLUMN IF NOT EXISTS execution_environment varchar(100);
UPDATE qa.test_runs
SET execution_environment = NULLIF(btrim(playwright->>'environment'), '')
WHERE playwright IS NOT NULL AND execution_environment IS NULL;
INSERT INTO qa.schema_migrations(version) VALUES('020_run_release_context') ON CONFLICT DO NOTHING;
COMMIT;
