BEGIN;
SELECT pg_advisory_xact_lock(714209014);
ALTER TABLE qa.projects ADD CONSTRAINT projects_org_id_unique UNIQUE (organization_id,id);
CREATE TABLE qa.project_members (
 project_id bigint NOT NULL, organization_id bigint NOT NULL, user_id bigint NOT NULL,
 role text CHECK(role IN ('Admin','QA','Dev','Solo lectura')), revision integer NOT NULL DEFAULT 1,
 PRIMARY KEY(project_id,user_id),
 FOREIGN KEY(organization_id,project_id) REFERENCES qa.projects(organization_id,id) ON DELETE CASCADE,
 FOREIGN KEY(organization_id,user_id) REFERENCES qa.organization_members(organization_id,user_id) ON DELETE CASCADE
);
-- Preserve existing collaboration explicitly; future invitations do not grant projects.
INSERT INTO qa.project_members(project_id,organization_id,user_id,role)
 SELECT p.id,p.organization_id,m.user_id,'QA' FROM qa.projects p JOIN qa.organization_members m ON m.organization_id=p.organization_id WHERE m.role='member';
INSERT INTO qa.project_bug_workflows(project_id) SELECT id FROM qa.projects ON CONFLICT DO NOTHING;
CREATE FUNCTION qa.project_role(p_project bigint,p_user bigint) RETURNS text LANGUAGE sql STABLE AS $$
 SELECT CASE WHEN m.role='owner' THEN 'Admin' ELSE pm.role END
 FROM qa.projects p JOIN qa.organization_members m ON m.organization_id=p.organization_id
 JOIN qa.users u ON u.id=m.user_id AND u.is_active
 LEFT JOIN qa.project_members pm ON pm.project_id=p.id AND pm.user_id=u.id
 WHERE p.id=p_project AND u.id=p_user
$$;
CREATE FUNCTION qa.require_permission(p_project bigint,p_permission text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE actor bigint := NULLIF(current_setting('qa.actor_id',true),'')::bigint; role_name text;
BEGIN
 IF actor IS NULL THEN RETURN; END IF; -- trusted installation/maintenance only
 PERFORM id FROM qa.projects WHERE id=p_project FOR SHARE;
 role_name := qa.project_role(p_project,actor);
 IF role_name='Admin' OR (role_name='QA' AND p_permission NOT IN ('settings.manage','access.manage')) OR
 (role_name='Dev' AND p_permission IN ('bugs.write','evidence.write','comments.write')) THEN RETURN; END IF;
 RAISE EXCEPTION 'Permiso de proyecto insuficiente' USING ERRCODE='42501';
END $$;
CREATE TABLE qa.comments (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, project_id bigint NOT NULL REFERENCES qa.projects(id),
 bug_id bigint, test_case_id bigint, test_run_id bigint, author_id bigint NOT NULL REFERENCES qa.users(id),
 body varchar(5000) NOT NULL, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(), edited_at timestamptz, deleted_at timestamptz,
 request_key uuid NOT NULL, request_hash text NOT NULL,
 CHECK(num_nonnulls(bug_id,test_case_id,test_run_id)=1),
 FOREIGN KEY(project_id,bug_id) REFERENCES qa.bugs(project_id,id) ON DELETE CASCADE,
 FOREIGN KEY(project_id,test_case_id) REFERENCES qa.test_cases(project_id,id) ON DELETE CASCADE,
 FOREIGN KEY(project_id,test_run_id) REFERENCES qa.test_runs(project_id,id) ON DELETE CASCADE,
 UNIQUE(project_id,id), UNIQUE(project_id,author_id,request_key)
);
CREATE TABLE qa.comment_mentions (
 project_id bigint NOT NULL, comment_id bigint NOT NULL, user_id bigint NOT NULL REFERENCES qa.users(id),
 PRIMARY KEY(comment_id,user_id),
 FOREIGN KEY(project_id,comment_id) REFERENCES qa.comments(project_id,id) ON DELETE CASCADE
);
CREATE TABLE qa.mention_notifications (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, project_id bigint NOT NULL, comment_id bigint NOT NULL,
 user_id bigint NOT NULL REFERENCES qa.users(id), created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz,
 UNIQUE(comment_id,user_id), FOREIGN KEY(project_id,comment_id) REFERENCES qa.comments(project_id,id) ON DELETE CASCADE
);
CREATE TABLE qa.activity (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, project_id bigint NOT NULL,
 resource_kind text NOT NULL, resource_id text NOT NULL, action text NOT NULL,
 actor_id bigint, created_at timestamptz NOT NULL DEFAULT now(), request_id text,
 before_data jsonb, after_data jsonb
);
CREATE INDEX activity_project_id ON qa.activity(project_id,id DESC);
CREATE INDEX activity_target ON qa.activity(project_id,resource_kind,resource_id,id DESC);
CREATE INDEX comments_project_target ON qa.comments(project_id,id);
CREATE INDEX notifications_recipient ON qa.mention_notifications(project_id,user_id,id DESC);
CREATE FUNCTION qa.immutable_activity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'El historial de auditoría es inmutable' USING ERRCODE='42501'; END $$;
CREATE TRIGGER activity_immutable BEFORE UPDATE OR DELETE ON qa.activity FOR EACH ROW EXECUTE FUNCTION qa.immutable_activity();
CREATE TRIGGER activity_no_truncate BEFORE TRUNCATE ON qa.activity FOR EACH STATEMENT EXECUTE FUNCTION qa.immutable_activity();
CREATE FUNCTION qa.guard_resource() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE value jsonb := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
BEGIN
 PERFORM qa.require_permission((value->>'project_id')::bigint,TG_ARGV[0]);
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE FUNCTION qa.audit_resource() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous jsonb; current_value jsonb; value jsonb; kind text:=TG_ARGV[0]; resource text; prefix text:=TG_ARGV[1]; actor bigint:=NULLIF(current_setting('qa.actor_id',true),'')::bigint;
BEGIN
 IF TG_OP<>'INSERT' THEN previous:=to_jsonb(OLD)-ARRAY['file_bytes','image_bytes','storage_key','request_hash','request_key']; END IF;
 IF TG_OP<>'DELETE' THEN current_value:=to_jsonb(NEW)-ARRAY['file_bytes','image_bytes','storage_key','request_hash','request_key']; END IF;
 IF TG_OP='UPDATE' AND previous=current_value THEN RETURN NULL; END IF;
 value:=COALESCE(current_value,previous);
 IF kind='comment' THEN
  IF value->>'bug_id' IS NOT NULL THEN kind:='bug';prefix:='BUG';resource:=value->>'bug_id';
  ELSIF value->>'test_case_id' IS NOT NULL THEN kind:='case';prefix:='TC';resource:=value->>'test_case_id';
  ELSE kind:='run';prefix:='RUN';resource:=value->>'test_run_id'; END IF;
 ELSIF TG_ARGV[2]<>'id' THEN resource:=value->>TG_ARGV[2];
 ELSE resource:=value->>'id'; END IF;
 IF prefix<>'' THEN resource:=prefix || '-' || lpad(resource,greatest(3,length(resource)),'0'); END IF;
 INSERT INTO qa.activity(project_id,resource_kind,resource_id,action,actor_id,request_id,before_data,after_data)
 VALUES((value->>'project_id')::bigint,kind,resource,TG_TABLE_NAME || '.' || lower(TG_OP),actor,NULLIF(current_setting('qa.request_id',true),''),previous,current_value);
 RETURN NULL;
END $$;
DO $triggers$
DECLARE config text[];
BEGIN
 FOREACH config SLICE 1 IN ARRAY ARRAY[
 ['bugs','bugs.write','bug','BUG','id'],['test_cases','cases.write','case','TC','id'],
 ['test_case_steps','cases.write','case','TC','test_case_id'],['test_case_attachments','evidence.write','case','TC','test_case_id'],
 ['test_runs','runs.write','run','RUN','id'],['test_run_results','runs.write','run','RUN','test_run_id'],
 ['evidence','evidence.write','evidence','EVD','id'],['evidence_links','evidence.write','evidence','EVD','evidence_id'],
 ['tags','tags.write','tag','','id'],['bug_tags','bugs.write','bug','BUG','bug_id'],['test_case_tags','cases.write','case','TC','test_case_id'],['test_run_tags','runs.write','run','RUN','test_run_id'],
 ['test_plans','plans.write','plan','PLAN','id'],['test_plan_cases','plans.write','plan','PLAN','plan_id'],
 ['project_bug_workflows','settings.manage','workflow','','project_id'],['project_members','access.manage','access','','user_id'],
 ['comments','comments.write','comment','','id']
 ] LOOP
 EXECUTE format('CREATE TRIGGER project_permission BEFORE INSERT OR UPDATE OR DELETE ON qa.%I FOR EACH ROW EXECUTE FUNCTION qa.guard_resource(%L)',config[1],config[2]);
 EXECUTE format('CREATE TRIGGER project_audit AFTER INSERT OR UPDATE OR DELETE ON qa.%I FOR EACH ROW EXECUTE FUNCTION qa.audit_resource(%L,%L,%L)',config[1],config[3],config[4],config[5]);
 END LOOP;
END $triggers$;
CREATE OR REPLACE FUNCTION qa.validate_bug_workflow() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE config qa.project_bug_workflows;
BEGIN
 SELECT * INTO config FROM qa.project_bug_workflows WHERE project_id=NEW.project_id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Falta configuración del proyecto' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN NEW.status:=config.states->>0; END IF;
 IF NOT config.states ? NEW.status THEN RAISE EXCEPTION 'Estado fuera del flujo' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' AND NEW.status<>OLD.status AND NOT COALESCE((config.transitions->OLD.status) ? NEW.status,false) THEN RAISE EXCEPTION 'Transición no permitida' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION qa.project_defaults() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN INSERT INTO qa.project_bug_workflows(project_id) VALUES(NEW.id); RETURN NULL; END $$;
CREATE TRIGGER project_defaults AFTER INSERT ON qa.projects FOR EACH ROW EXECUTE FUNCTION qa.project_defaults();
CREATE FUNCTION qa.audit_project() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous jsonb; current_value jsonb; p bigint;
BEGIN
 IF TG_OP<>'INSERT' THEN previous:=to_jsonb(OLD);p:=OLD.id; END IF;
 IF TG_OP<>'DELETE' THEN current_value:=to_jsonb(NEW);p:=NEW.id; END IF;
 INSERT INTO qa.activity(project_id,resource_kind,resource_id,action,actor_id,request_id,before_data,after_data) VALUES(p,'project',p::text,'projects.'||lower(TG_OP),NULLIF(current_setting('qa.actor_id',true),'')::bigint,NULLIF(current_setting('qa.request_id',true),''),previous,current_value);
 RETURN NULL;
END $$;
CREATE TRIGGER project_audit AFTER INSERT OR UPDATE OR DELETE ON qa.projects FOR EACH ROW EXECUTE FUNCTION qa.audit_project();
INSERT INTO qa.schema_migrations(version) VALUES('014_collaboration_permissions');
COMMIT;
