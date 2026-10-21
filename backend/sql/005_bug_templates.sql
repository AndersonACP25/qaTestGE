-- Plantillas de bugs privadas por usuario.
BEGIN;
SELECT pg_advisory_xact_lock(714209005);
DO $$
BEGIN
  IF current_database() <> 'qa_test_ge' THEN
    RAISE EXCEPTION 'Conectarse a qa_test_ge antes de aplicar la migración';
  END IF;
  IF EXISTS (SELECT 1 FROM qa.schema_migrations WHERE version = '005_bug_templates') THEN
    RETURN;
  END IF;
  CREATE TABLE qa.bug_templates (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES qa.users(id) ON DELETE CASCADE,
    name varchar(100) NOT NULL CHECK (btrim(name) <> ''),
    title varchar(200) NOT NULL DEFAULT '',
    description varchar(5000) NOT NULL DEFAULT '',
    priority text NOT NULL DEFAULT 'Media' CHECK (priority IN ('Crítica', 'Alta', 'Media', 'Baja')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, name)
  );
  CREATE INDEX bug_templates_user ON qa.bug_templates(user_id, id);
  COMMENT ON TABLE qa.bug_templates IS 'Plantillas de bugs de ámbito personal; no contienen HTML ejecutable.';
  INSERT INTO qa.schema_migrations(version) VALUES ('005_bug_templates');
END $$;
COMMIT;
