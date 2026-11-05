BEGIN;

CREATE TABLE qa.project_design_templates (
  project_id bigint NOT NULL REFERENCES qa.projects(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES qa.users(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision > 0),
  templates jsonb NOT NULL CHECK (jsonb_typeof(templates) = 'object'),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX project_design_templates_user ON qa.project_design_templates(user_id);

INSERT INTO qa.schema_migrations(version) VALUES ('022_design_templates');

COMMIT;
