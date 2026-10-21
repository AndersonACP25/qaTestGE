-- Tags de proyecto y vínculos explícitos para bugs, casos y ejecuciones.
BEGIN;
SELECT pg_advisory_xact_lock(714209009);
DO $$
BEGIN
  IF current_database() <> 'qa_test_ge' THEN
    RAISE EXCEPTION 'Conectarse a qa_test_ge antes de aplicar la migración';
  END IF;
  IF EXISTS (SELECT 1 FROM qa.schema_migrations WHERE version = '009_tags') THEN
    RETURN;
  END IF;
  CREATE TABLE qa.tags (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id bigint NOT NULL REFERENCES qa.projects(id),
    name varchar(50) NOT NULL CHECK (btrim(name) <> ''),
    color varchar(7) NOT NULL DEFAULT '#7462df' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_id, id)
  );
  CREATE UNIQUE INDEX tags_project_name ON qa.tags(project_id, lower(name));
  CREATE TABLE qa.bug_tags (
    project_id bigint NOT NULL,
    bug_id bigint NOT NULL,
    tag_id bigint NOT NULL,
    PRIMARY KEY (bug_id, tag_id),
    FOREIGN KEY (project_id, bug_id) REFERENCES qa.bugs(project_id, id) ON DELETE CASCADE,
    FOREIGN KEY (project_id, tag_id) REFERENCES qa.tags(project_id, id) ON DELETE CASCADE
  );
  CREATE TABLE qa.test_case_tags (
    project_id bigint NOT NULL,
    test_case_id bigint NOT NULL,
    tag_id bigint NOT NULL,
    PRIMARY KEY (test_case_id, tag_id),
    FOREIGN KEY (project_id, test_case_id) REFERENCES qa.test_cases(project_id, id) ON DELETE CASCADE,
    FOREIGN KEY (project_id, tag_id) REFERENCES qa.tags(project_id, id) ON DELETE CASCADE
  );
  CREATE TABLE qa.test_run_tags (
    project_id bigint NOT NULL,
    test_run_id bigint NOT NULL,
    tag_id bigint NOT NULL,
    PRIMARY KEY (test_run_id, tag_id),
    FOREIGN KEY (project_id, test_run_id) REFERENCES qa.test_runs(project_id, id) ON DELETE CASCADE,
    FOREIGN KEY (project_id, tag_id) REFERENCES qa.tags(project_id, id) ON DELETE CASCADE
  );
  CREATE INDEX bug_tags_tag ON qa.bug_tags(project_id, tag_id);
  CREATE INDEX test_case_tags_tag ON qa.test_case_tags(project_id, tag_id);
  CREATE INDEX test_run_tags_tag ON qa.test_run_tags(project_id, tag_id);
  COMMENT ON TABLE qa.tags IS 'Tags configurables por proyecto para clasificación de recursos QA.';
  INSERT INTO qa.schema_migrations(version) VALUES ('009_tags');
END $$;
COMMIT;
