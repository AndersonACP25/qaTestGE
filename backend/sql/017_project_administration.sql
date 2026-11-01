BEGIN;
SELECT pg_advisory_xact_lock(714209017);
CREATE TABLE qa.project_audit_settings (
 project_id bigint PRIMARY KEY REFERENCES qa.projects(id) ON DELETE CASCADE,
 profile text NOT NULL CHECK(profile IN ('General','Calidad','Seguridad')),
 detail text NOT NULL CHECK(detail IN ('Resumen','Detallado')),
 page_size integer NOT NULL CHECK(page_size IN (25,50,100)),
 version integer NOT NULL DEFAULT 1 CHECK(version>0)
);
CREATE TRIGGER project_permission BEFORE INSERT OR UPDATE OR DELETE ON qa.project_audit_settings FOR EACH ROW EXECUTE FUNCTION qa.guard_resource('settings.manage');
CREATE TRIGGER project_audit AFTER INSERT OR UPDATE OR DELETE ON qa.project_audit_settings FOR EACH ROW EXECUTE FUNCTION qa.audit_resource('audit-config','','project_id');
CREATE TABLE qa.project_user_requests (
 project_id bigint NOT NULL REFERENCES qa.projects(id) ON DELETE CASCADE,
 actor_id bigint NOT NULL REFERENCES qa.users(id), request_key uuid NOT NULL,
 request_hash text NOT NULL, user_id bigint NOT NULL REFERENCES qa.users(id),
 PRIMARY KEY(project_id,actor_id,request_key)
);
CREATE TRIGGER project_permission BEFORE INSERT OR UPDATE OR DELETE ON qa.project_user_requests FOR EACH ROW EXECUTE FUNCTION qa.guard_resource('access.manage');
CREATE INDEX activity_project_filters ON qa.activity(project_id,resource_kind,id DESC);
INSERT INTO qa.schema_migrations(version) VALUES('017_project_administration');
COMMIT;
