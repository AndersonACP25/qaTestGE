-- Base inicial: ejecutar UNA VEZ conectado a qa_test_ge.
-- Sin extensiones, cuentas, contraseñas ni permisos de aplicación.
BEGIN;

DO $$
BEGIN
  IF current_database() <> 'qa_test_ge' THEN
    RAISE EXCEPTION 'Conectarse a qa_test_ge antes de importar el esquema';
  END IF;
END $$;

CREATE SCHEMA qa;

CREATE TABLE qa.organizations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name varchar(100) NOT NULL CHECK (btrim(name) <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE qa.projects (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id bigint NOT NULL REFERENCES qa.organizations(id),
  name varchar(100) NOT NULL CHECK (btrim(name) <> ''),
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE qa.bugs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id bigint NOT NULL REFERENCES qa.projects(id),
  title varchar(200) NOT NULL CHECK (btrim(title) <> ''),
  description varchar(5000) NOT NULL DEFAULT '',
  priority text NOT NULL CHECK (priority IN ('Crítica', 'Alta', 'Media', 'Baja')),
  status text NOT NULL DEFAULT 'Abierto'
    CHECK (status IN ('Abierto', 'En progreso', 'En revisión', 'Resuelto')),
  assignee varchar(100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, id)
);

CREATE TABLE qa.test_cases (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id bigint NOT NULL REFERENCES qa.projects(id),
  title varchar(200) NOT NULL CHECK (btrim(title) <> ''),
  suite varchar(100) NOT NULL CHECK (btrim(suite) <> ''),
  preconditions text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Pendiente'
    CHECK (status IN ('Aprobado', 'Fallido', 'Pendiente')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, id)
);

CREATE TABLE qa.test_case_steps (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id bigint NOT NULL,
  test_case_id bigint NOT NULL,
  position integer NOT NULL CHECK (position > 0),
  action text NOT NULL CHECK (btrim(action) <> ''),
  expected_result text NOT NULL CHECK (btrim(expected_result) <> ''),
  FOREIGN KEY (project_id, test_case_id) REFERENCES qa.test_cases(project_id, id),
  UNIQUE (test_case_id, position)
);

CREATE TABLE qa.test_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id bigint NOT NULL REFERENCES qa.projects(id),
  title varchar(200) NOT NULL CHECK (btrim(title) <> ''),
  owner varchar(100) NOT NULL CHECK (btrim(owner) <> ''),
  status text NOT NULL DEFAULT 'En curso' CHECK (status IN ('En curso', 'Completado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (completed_at IS NULL OR completed_at >= created_at),
  CHECK ((status = 'Completado') = (completed_at IS NOT NULL)),
  UNIQUE (project_id, id)
);

CREATE TABLE qa.test_run_results (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id bigint NOT NULL,
  test_run_id bigint NOT NULL,
  test_case_id bigint NOT NULL,
  status text NOT NULL DEFAULT 'skipped' CHECK (status IN ('passed', 'failed', 'blocked', 'skipped')),
  notes text NOT NULL DEFAULT '',
  -- Conserva los pasos evaluados aunque se edite posteriormente el caso.
  steps_snapshot jsonb NOT NULL CHECK (jsonb_typeof(steps_snapshot) = 'array'),
  executed_at timestamptz,
  FOREIGN KEY (project_id, test_run_id) REFERENCES qa.test_runs(project_id, id),
  FOREIGN KEY (project_id, test_case_id) REFERENCES qa.test_cases(project_id, id),
  UNIQUE (test_run_id, test_case_id),
  UNIQUE (project_id, id)
);

CREATE TABLE qa.bug_test_cases (
  project_id bigint NOT NULL,
  bug_id bigint NOT NULL,
  test_case_id bigint NOT NULL,
  PRIMARY KEY (bug_id, test_case_id),
  FOREIGN KEY (project_id, bug_id) REFERENCES qa.bugs(project_id, id),
  FOREIGN KEY (project_id, test_case_id) REFERENCES qa.test_cases(project_id, id)
);

CREATE TABLE qa.evidence (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id bigint NOT NULL REFERENCES qa.projects(id),
  name varchar(255) NOT NULL CHECK (btrim(name) <> ''),
  type text NOT NULL CHECK (type IN ('Imagen', 'Video', 'Archivo')),
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0 AND size_bytes <= 9007199254740991),
  -- Referencia futura a almacenamiento privado; no almacena archivos.
  storage_key text CHECK (storage_key IS NULL OR btrim(storage_key) <> ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, id)
);

CREATE TABLE qa.evidence_links (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id bigint NOT NULL,
  evidence_id bigint NOT NULL,
  bug_id bigint,
  test_case_id bigint,
  test_run_id bigint,
  test_run_result_id bigint,
  CHECK (num_nonnulls(bug_id, test_case_id, test_run_id, test_run_result_id) = 1),
  FOREIGN KEY (project_id, evidence_id) REFERENCES qa.evidence(project_id, id),
  FOREIGN KEY (project_id, bug_id) REFERENCES qa.bugs(project_id, id),
  FOREIGN KEY (project_id, test_case_id) REFERENCES qa.test_cases(project_id, id),
  FOREIGN KEY (project_id, test_run_id) REFERENCES qa.test_runs(project_id, id),
  FOREIGN KEY (project_id, test_run_result_id) REFERENCES qa.test_run_results(project_id, id)
);

CREATE UNIQUE INDEX evidence_link_bug ON qa.evidence_links (evidence_id, bug_id) WHERE bug_id IS NOT NULL;
CREATE UNIQUE INDEX evidence_link_case ON qa.evidence_links (evidence_id, test_case_id) WHERE test_case_id IS NOT NULL;
CREATE UNIQUE INDEX evidence_link_run ON qa.evidence_links (evidence_id, test_run_id) WHERE test_run_id IS NOT NULL;
CREATE UNIQUE INDEX evidence_link_result ON qa.evidence_links (evidence_id, test_run_result_id) WHERE test_run_result_id IS NOT NULL;
CREATE INDEX bugs_project_status ON qa.bugs (project_id, status);
CREATE INDEX cases_project_suite ON qa.test_cases (project_id, suite);
CREATE INDEX runs_project_status ON qa.test_runs (project_id, status);
CREATE INDEX results_project_case ON qa.test_run_results (project_id, test_case_id);
CREATE INDEX bug_cases_project_case ON qa.bug_test_cases (project_id, test_case_id);
CREATE INDEX evidence_project ON qa.evidence (project_id);
CREATE INDEX evidence_links_project ON qa.evidence_links (project_id);

COMMENT ON SCHEMA qa IS 'Esquema de dominio de qaTestGE; aplicar las migraciones adicionales antes de iniciar la API.';
COMMENT ON TABLE qa.test_run_results IS 'Un resultado por caso y ejecución; las referencias deben pertenecer al mismo proyecto.';
COMMENT ON TABLE qa.evidence_links IS 'Un destino por vínculo; una evidencia puede tener varios vínculos del mismo proyecto.';

COMMIT;
