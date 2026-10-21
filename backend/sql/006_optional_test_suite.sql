-- La suite es una clasificación opcional para los casos de prueba.
BEGIN;
SELECT pg_advisory_xact_lock(714209006);
DO $$
BEGIN
  IF current_database() <> 'qa_test_ge' THEN
    RAISE EXCEPTION 'Conectarse a qa_test_ge antes de aplicar la migración';
  END IF;
  IF EXISTS (SELECT 1 FROM qa.schema_migrations WHERE version = '006_optional_test_suite') THEN
    RETURN;
  END IF;
  ALTER TABLE qa.test_cases DROP CONSTRAINT IF EXISTS test_cases_suite_check;
  ALTER TABLE qa.test_cases ALTER COLUMN suite DROP NOT NULL;
  INSERT INTO qa.schema_migrations(version) VALUES ('006_optional_test_suite');
END $$;
COMMIT;
