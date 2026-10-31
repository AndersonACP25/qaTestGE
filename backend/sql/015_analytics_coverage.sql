BEGIN;
SELECT pg_advisory_xact_lock(714209015);
CREATE TABLE qa.requirements (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 project_id bigint NOT NULL REFERENCES qa.projects(id),
 code varchar(60) NOT NULL CHECK(btrim(code)<>''),
 title varchar(200) NOT NULL CHECK(btrim(title)<>''),description varchar(5000) NOT NULL DEFAULT '',
 version integer NOT NULL DEFAULT 1 CHECK(version>0),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(project_id,id)
);
CREATE UNIQUE INDEX requirement_project_code ON qa.requirements(project_id,lower(code));
CREATE TABLE qa.requirement_cases (
 project_id bigint NOT NULL,requirement_id bigint NOT NULL,test_case_id bigint NOT NULL,
 PRIMARY KEY(requirement_id,test_case_id),
 FOREIGN KEY(project_id,requirement_id) REFERENCES qa.requirements(project_id,id) ON DELETE CASCADE,
 FOREIGN KEY(project_id,test_case_id) REFERENCES qa.test_cases(project_id,id)
);
CREATE INDEX requirement_cases_project_case ON qa.requirement_cases(project_id,test_case_id);
CREATE TRIGGER project_permission BEFORE INSERT OR UPDATE OR DELETE ON qa.requirements FOR EACH ROW EXECUTE FUNCTION qa.guard_resource('cases.write');
CREATE TRIGGER project_audit AFTER INSERT OR UPDATE OR DELETE ON qa.requirements FOR EACH ROW EXECUTE FUNCTION qa.audit_resource('requirement','REQ','id');
CREATE TRIGGER project_permission BEFORE INSERT OR UPDATE OR DELETE ON qa.requirement_cases FOR EACH ROW EXECUTE FUNCTION qa.guard_resource('cases.write');
CREATE TRIGGER project_audit AFTER INSERT OR UPDATE OR DELETE ON qa.requirement_cases FOR EACH ROW EXECUTE FUNCTION qa.audit_resource('requirement','REQ','requirement_id');
CREATE TRIGGER project_permission BEFORE INSERT OR UPDATE OR DELETE ON qa.bug_test_cases FOR EACH ROW EXECUTE FUNCTION qa.guard_resource('bugs.write');
CREATE TRIGGER project_audit AFTER INSERT OR UPDATE OR DELETE ON qa.bug_test_cases FOR EACH ROW EXECUTE FUNCTION qa.audit_resource('case','TC','test_case_id');
ALTER TABLE qa.creation_requests DROP CONSTRAINT creation_requests_resource_type_check;
ALTER TABLE qa.creation_requests ADD CONSTRAINT creation_requests_resource_type_check CHECK(resource_type IN ('bug','case','run','plan','requirement'));
CREATE TABLE qa.import_batches (
 project_id bigint NOT NULL REFERENCES qa.projects(id) ON DELETE CASCADE,actor_id bigint NOT NULL REFERENCES qa.users(id),
 request_key uuid NOT NULL,request_hash text NOT NULL,result jsonb NOT NULL,
 PRIMARY KEY(project_id,actor_id,request_key)
);
-- Append-only state transitions allow accurate future daily open/closed stock counts.
CREATE TABLE qa.bug_state_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,project_id bigint NOT NULL,bug_id bigint NOT NULL,
 is_closed boolean NOT NULL,event text NOT NULL CHECK(event IN ('baseline','created','changed','deleted')),
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bug_state_project_time ON qa.bug_state_events(project_id,occurred_at,id);
CREATE TRIGGER bug_state_immutable BEFORE UPDATE OR DELETE ON qa.bug_state_events FOR EACH ROW EXECUTE FUNCTION qa.immutable_activity();
CREATE TRIGGER bug_state_no_truncate BEFORE TRUNCATE ON qa.bug_state_events FOR EACH STATEMENT EXECUTE FUNCTION qa.immutable_activity();
INSERT INTO qa.bug_state_events(project_id,bug_id,is_closed,event)
 SELECT b.project_id,b.id,COALESCE(w.closed_states ? b.status,false),'baseline' FROM qa.bugs b LEFT JOIN qa.project_bug_workflows w ON w.project_id=b.project_id;
CREATE FUNCTION qa.track_bug_state() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE closed boolean; p bigint; bid bigint; s text;
BEGIN
 IF TG_OP='DELETE' THEN p:=OLD.project_id;bid:=OLD.id;s:=OLD.status;
 ELSE p:=NEW.project_id;bid:=NEW.id;s:=NEW.status; END IF;
 IF TG_OP='UPDATE' AND NEW.status=OLD.status THEN RETURN NULL; END IF;
 SELECT COALESCE(closed_states ? s,false) INTO closed FROM qa.project_bug_workflows WHERE project_id=p;
 INSERT INTO qa.bug_state_events(project_id,bug_id,is_closed,event) VALUES(p,bid,COALESCE(closed,false),CASE TG_OP WHEN 'INSERT' THEN 'created' WHEN 'UPDATE' THEN 'changed' ELSE 'deleted' END);
 RETURN NULL;
END $$;
CREATE TRIGGER bug_state_track AFTER INSERT OR UPDATE OR DELETE ON qa.bugs FOR EACH ROW EXECUTE FUNCTION qa.track_bug_state();
CREATE FUNCTION qa.reclassify_bug_states() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.closed_states=NEW.closed_states THEN RETURN NULL; END IF;
 INSERT INTO qa.bug_state_events(project_id,bug_id,is_closed,event)
 SELECT b.project_id,b.id,NEW.closed_states ? b.status,'changed' FROM qa.bugs b
 WHERE b.project_id=NEW.project_id AND (OLD.closed_states ? b.status) IS DISTINCT FROM (NEW.closed_states ? b.status);
 RETURN NULL;
END $$;
CREATE TRIGGER bug_state_reclassify AFTER UPDATE ON qa.project_bug_workflows FOR EACH ROW EXECUTE FUNCTION qa.reclassify_bug_states();
CREATE INDEX runs_project_created ON qa.test_runs(project_id,created_at,id);
CREATE INDEX results_project_executed ON qa.test_run_results(project_id,executed_at,test_case_id);
INSERT INTO qa.schema_migrations(version) VALUES('015_analytics_coverage');
COMMIT;
