BEGIN;
SELECT pg_advisory_xact_lock(714209011);
DO $$
BEGIN
  IF current_database() <> 'qa_test_ge' THEN RAISE EXCEPTION 'Conectarse a qa_test_ge antes de aplicar la migración'; END IF;
  IF EXISTS (SELECT 1 FROM qa.schema_migrations WHERE version = '011_qa_assignments') THEN RETURN; END IF;
  ALTER TABLE qa.projects ADD CONSTRAINT projects_id_organization_unique UNIQUE (id, organization_id);
  ALTER TABLE qa.bugs ADD COLUMN assignee_organization_id bigint, ADD COLUMN assignee_user_id bigint;
  ALTER TABLE qa.test_cases ADD COLUMN assignee_organization_id bigint, ADD COLUMN assignee_user_id bigint;
  ALTER TABLE qa.bugs ADD CONSTRAINT bugs_assignee_pair CHECK ((assignee_organization_id IS NULL) = (assignee_user_id IS NULL)),
    ADD CONSTRAINT bugs_assignee_project FOREIGN KEY (project_id,assignee_organization_id) REFERENCES qa.projects(id,organization_id),
    ADD CONSTRAINT bugs_assignee_member FOREIGN KEY (assignee_organization_id,assignee_user_id) REFERENCES qa.organization_members(organization_id,user_id);
  ALTER TABLE qa.test_cases ADD CONSTRAINT cases_assignee_pair CHECK ((assignee_organization_id IS NULL) = (assignee_user_id IS NULL)),
    ADD CONSTRAINT cases_assignee_project FOREIGN KEY (project_id,assignee_organization_id) REFERENCES qa.projects(id,organization_id),
    ADD CONSTRAINT cases_assignee_member FOREIGN KEY (assignee_organization_id,assignee_user_id) REFERENCES qa.organization_members(organization_id,user_id);
  CREATE INDEX bugs_assignee_member ON qa.bugs(assignee_organization_id,assignee_user_id);
  CREATE INDEX cases_assignee_member ON qa.test_cases(assignee_organization_id,assignee_user_id);
  INSERT INTO qa.schema_migrations(version) VALUES ('011_qa_assignments');
END $$;
COMMIT;
