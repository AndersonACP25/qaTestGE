BEGIN;
ALTER TABLE qa.test_cases ADD COLUMN IF NOT EXISTS test_type varchar(100) NOT NULL DEFAULT 'Funcional';
ALTER TABLE qa.test_cases ADD COLUMN IF NOT EXISTS lifecycle text NOT NULL DEFAULT 'Borrador' CHECK (lifecycle IN ('Borrador','Listo','Obsoleto'));
ALTER TABLE qa.test_cases ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1 CHECK (version > 0);
CREATE TABLE IF NOT EXISTS qa.test_case_versions (
 project_id bigint NOT NULL, test_case_id bigint NOT NULL, version integer NOT NULL,
 snapshot jsonb NOT NULL, changed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(test_case_id,version),
 FOREIGN KEY(project_id,test_case_id) REFERENCES qa.test_cases(project_id,id) ON DELETE CASCADE
);
CREATE OR REPLACE FUNCTION qa.capture_case_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO qa.test_case_versions(project_id,test_case_id,version,snapshot)
 SELECT NEW.project_id,NEW.id,NEW.version,to_jsonb(NEW) || jsonb_build_object('steps',COALESCE((SELECT jsonb_agg(jsonb_build_object('action',action,'expectedResult',expected_result) ORDER BY position) FROM qa.test_case_steps WHERE test_case_id=NEW.id),'[]'::jsonb),'tagIds',COALESCE((SELECT jsonb_agg(tag_id::text ORDER BY tag_id) FROM qa.test_case_tags WHERE test_case_id=NEW.id),'[]'::jsonb))
 ON CONFLICT(test_case_id,version) DO NOTHING;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS case_version_capture ON qa.test_cases;
CREATE CONSTRAINT TRIGGER case_version_capture AFTER INSERT OR UPDATE ON qa.test_cases DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION qa.capture_case_version();
CREATE OR REPLACE FUNCTION qa.bump_case_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.version := OLD.version + 1; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS case_version_bump ON qa.test_cases;
CREATE TRIGGER case_version_bump BEFORE UPDATE ON qa.test_cases FOR EACH ROW EXECUTE FUNCTION qa.bump_case_version();
-- Only known designer categories are inferred; arbitrary suite names remain untouched.
INSERT INTO qa.test_case_versions(project_id,test_case_id,version,snapshot)
 SELECT c.project_id,c.id,c.version,to_jsonb(c) || jsonb_build_object('steps',COALESCE((SELECT jsonb_agg(jsonb_build_object('action',action,'expectedResult',expected_result) ORDER BY position) FROM qa.test_case_steps WHERE test_case_id=c.id),'[]'::jsonb)) FROM qa.test_cases c ON CONFLICT DO NOTHING;
UPDATE qa.test_cases SET test_type=suite WHERE test_type='Funcional' AND suite IN ('Regresión','Funcionales','UI','UX','Integración','Sanity','E2E','Unitarias','Aceptación','Accesibilidad','Seguridad','Rendimiento y carga','Compatibilidad','Edge cases','Exploratory','Pruebas de estrés','API','Smoke','UAT','Exploratorias','Edge') AND version=1 AND NOT EXISTS(SELECT 1 FROM qa.schema_migrations WHERE version='013_quality_workflows');
CREATE TABLE IF NOT EXISTS qa.test_plans (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, project_id bigint NOT NULL REFERENCES qa.projects(id),
 name varchar(200) NOT NULL CHECK(btrim(name)<>''), description varchar(5000) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1,
 UNIQUE(project_id,id)
);
CREATE TABLE IF NOT EXISTS qa.test_plan_cases (
 project_id bigint NOT NULL, plan_id bigint NOT NULL, test_case_id bigint NOT NULL,
 PRIMARY KEY(plan_id,test_case_id),
 FOREIGN KEY(project_id,plan_id) REFERENCES qa.test_plans(project_id,id) ON DELETE CASCADE,
 FOREIGN KEY(project_id,test_case_id) REFERENCES qa.test_cases(project_id,id)
);
ALTER TABLE qa.test_runs ADD COLUMN IF NOT EXISTS plan_id bigint;
ALTER TABLE qa.test_runs ADD COLUMN IF NOT EXISTS source_run_id bigint;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='runs_plan_fk') THEN
 ALTER TABLE qa.test_runs ADD CONSTRAINT runs_plan_fk FOREIGN KEY(project_id,plan_id) REFERENCES qa.test_plans(project_id,id);
 ALTER TABLE qa.test_runs ADD CONSTRAINT runs_source_fk FOREIGN KEY(project_id,source_run_id) REFERENCES qa.test_runs(project_id,id);
 END IF;
END $$;
ALTER TABLE qa.test_run_results ADD COLUMN IF NOT EXISTS case_version integer;
ALTER TABLE qa.test_run_results ADD COLUMN IF NOT EXISTS title_snapshot text;
UPDATE qa.test_run_results rr SET case_version=c.version,title_snapshot=c.title FROM qa.test_cases c WHERE c.id=rr.test_case_id AND rr.case_version IS NULL;
CREATE TABLE IF NOT EXISTS qa.project_bug_workflows (
 project_id bigint PRIMARY KEY REFERENCES qa.projects(id), revision integer NOT NULL DEFAULT 1,
 states jsonb NOT NULL DEFAULT '["Abierto","En progreso","En revisión","Resuelto"]',
 transitions jsonb NOT NULL DEFAULT '{"Abierto":["En progreso","Resuelto"],"En progreso":["Abierto","En revisión","Resuelto"],"En revisión":["En progreso","Resuelto"],"Resuelto":["Abierto","En progreso"]}'
);
ALTER TABLE qa.project_bug_workflows ADD COLUMN IF NOT EXISTS closed_states jsonb NOT NULL DEFAULT '["Resuelto"]';
ALTER TABLE qa.bugs DROP CONSTRAINT IF EXISTS bugs_status_check;
ALTER TABLE qa.bugs ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'Media' CHECK(severity IN ('Crítica','Alta','Media','Baja'));
ALTER TABLE qa.bugs ADD COLUMN IF NOT EXISTS environment varchar(100) NOT NULL DEFAULT '';
ALTER TABLE qa.bugs ADD COLUMN IF NOT EXISTS affected_version varchar(100) NOT NULL DEFAULT '';
ALTER TABLE qa.bugs ADD COLUMN IF NOT EXISTS source_result_id bigint;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='bugs_source_result_fk') THEN
 ALTER TABLE qa.bugs ADD CONSTRAINT bugs_source_result_fk FOREIGN KEY(project_id,source_result_id) REFERENCES qa.test_run_results(project_id,id);
 END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS bug_source_result ON qa.bugs(source_result_id) WHERE source_result_id IS NOT NULL;
CREATE OR REPLACE FUNCTION qa.validate_bug_workflow() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE config qa.project_bug_workflows;
BEGIN
 INSERT INTO qa.project_bug_workflows(project_id) VALUES(NEW.project_id) ON CONFLICT DO NOTHING;
 SELECT * INTO config FROM qa.project_bug_workflows WHERE project_id=NEW.project_id FOR SHARE;
 IF TG_OP='INSERT' THEN NEW.status := config.states->>0; END IF;
 IF NOT config.states ? NEW.status THEN RAISE EXCEPTION 'Estado fuera del flujo' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' AND NEW.status<>OLD.status AND NOT COALESCE((config.transitions->OLD.status) ? NEW.status,false) THEN
 RAISE EXCEPTION 'Transición no permitida' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bug_workflow_validate ON qa.bugs;
CREATE TRIGGER bug_workflow_validate BEFORE INSERT OR UPDATE ON qa.bugs FOR EACH ROW EXECUTE FUNCTION qa.validate_bug_workflow();
CREATE OR REPLACE FUNCTION qa.link_failure_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.test_run_result_id IS NOT NULL THEN
 INSERT INTO qa.evidence_links(project_id,evidence_id,bug_id)
 SELECT NEW.project_id,NEW.evidence_id,b.id FROM qa.bugs b WHERE b.project_id=NEW.project_id AND b.source_result_id=NEW.test_run_result_id ON CONFLICT DO NOTHING;
 END IF;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS failure_evidence_link ON qa.evidence_links;
CREATE TRIGGER failure_evidence_link AFTER INSERT ON qa.evidence_links FOR EACH ROW EXECUTE FUNCTION qa.link_failure_evidence();
ALTER TABLE qa.creation_requests DROP CONSTRAINT IF EXISTS creation_requests_resource_type_check;
ALTER TABLE qa.creation_requests ADD CONSTRAINT creation_requests_resource_type_check CHECK(resource_type IN ('bug','case','run','plan'));
INSERT INTO qa.schema_migrations(version) VALUES('013_quality_workflows') ON CONFLICT DO NOTHING;
COMMIT;
