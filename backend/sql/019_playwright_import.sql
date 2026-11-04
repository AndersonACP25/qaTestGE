BEGIN;
SELECT pg_advisory_xact_lock(714209019);
ALTER TABLE qa.test_runs ADD COLUMN IF NOT EXISTS playwright jsonb,
 ADD COLUMN IF NOT EXISTS playwright_import_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS runs_playwright_identity
 ON qa.test_runs(project_id,(playwright->>'key')) WHERE playwright IS NOT NULL;
INSERT INTO qa.schema_migrations(version) VALUES('019_playwright_import') ON CONFLICT DO NOTHING;
COMMIT;
