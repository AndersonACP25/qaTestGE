BEGIN;
SELECT pg_advisory_xact_lock(714209012);
DO $$
BEGIN
  IF current_database() <> 'qa_test_ge' THEN RAISE EXCEPTION 'Conectarse a qa_test_ge antes de aplicar la migración'; END IF;
  IF EXISTS (SELECT 1 FROM qa.schema_migrations WHERE version='012_creation_requests') THEN RETURN; END IF;
  CREATE TABLE qa.creation_requests (
    user_id bigint NOT NULL REFERENCES qa.users(id),
    project_id bigint NOT NULL REFERENCES qa.projects(id) ON DELETE CASCADE,
    resource_type text NOT NULL CHECK(resource_type IN ('bug','case','run')),
    request_key uuid NOT NULL,
    request_hash text NOT NULL,
    resource_id bigint NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(user_id,project_id,resource_type,request_key)
  );
  INSERT INTO qa.schema_migrations(version) VALUES('012_creation_requests');
END $$;
COMMIT;
