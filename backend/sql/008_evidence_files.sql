-- Archivos privados de evidencias, limitados a 2 MiB y servidos como descarga.
BEGIN;
SELECT pg_advisory_xact_lock(714209008);
DO $$
BEGIN
  IF current_database() <> 'qa_test_ge' THEN
    RAISE EXCEPTION 'Conectarse a qa_test_ge antes de aplicar la migración';
  END IF;
  IF EXISTS (SELECT 1 FROM qa.schema_migrations WHERE version = '008_evidence_files') THEN
    RETURN;
  END IF;
  ALTER TABLE qa.evidence
    ADD COLUMN media_type text,
    ADD COLUMN file_bytes bytea,
    ADD CONSTRAINT evidence_file_content_check CHECK (
      (file_bytes IS NULL AND media_type IS NULL)
      OR
      (file_bytes IS NOT NULL AND media_type IS NOT NULL
        AND size_bytes = octet_length(file_bytes)
        AND size_bytes BETWEEN 1 AND 2097152)
    );
  COMMENT ON COLUMN qa.evidence.file_bytes IS 'Contenido privado de evidencia; máximo 2 MiB.';
  INSERT INTO qa.schema_migrations(version) VALUES ('008_evidence_files');
END $$;
COMMIT;
