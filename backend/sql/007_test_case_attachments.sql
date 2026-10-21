-- Adjuntos privados (imágenes y enlaces) de casos de prueba.
BEGIN;
SELECT pg_advisory_xact_lock(714209007);
DO $$
BEGIN
  IF current_database() <> 'qa_test_ge' THEN
    RAISE EXCEPTION 'Conectarse a qa_test_ge antes de aplicar la migración';
  END IF;
  IF EXISTS (SELECT 1 FROM qa.schema_migrations WHERE version = '007_test_case_attachments') THEN
    RETURN;
  END IF;
  CREATE TABLE qa.test_case_attachments (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id bigint NOT NULL,
    test_case_id bigint NOT NULL,
    kind text NOT NULL CHECK (kind IN ('image', 'link')),
    name varchar(255) NOT NULL CHECK (btrim(name) <> ''),
    external_url text,
    content_type text,
    image_bytes bytea,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (project_id, test_case_id) REFERENCES qa.test_cases(project_id, id),
    CHECK (
      (kind = 'image' AND external_url IS NULL
        AND content_type IS NOT NULL
        AND content_type IN ('image/png', 'image/jpeg', 'image/gif', 'image/webp')
        AND image_bytes IS NOT NULL AND octet_length(image_bytes) BETWEEN 1 AND 2097152)
      OR
      (kind = 'link' AND external_url IS NOT NULL AND length(external_url) <= 2048
        AND content_type IS NULL AND image_bytes IS NULL)
    )
  );
  CREATE INDEX test_case_attachments_case ON qa.test_case_attachments(project_id, test_case_id, id);
  COMMENT ON TABLE qa.test_case_attachments IS 'Imágenes privadas y enlaces HTTP(S) vinculados explícitamente a un caso de prueba.';
  INSERT INTO qa.schema_migrations(version) VALUES ('007_test_case_attachments');
END $$;
COMMIT;
