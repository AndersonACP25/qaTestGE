BEGIN;
SELECT pg_advisory_xact_lock(714209018);
ALTER TABLE qa.test_runs ADD COLUMN owner_user_id bigint REFERENCES qa.users(id), ADD COLUMN owner_organization_id bigint;
-- Match legacy labels only when exactly one active project member has that name.
UPDATE qa.test_runs r SET owner_user_id=u.id,owner_organization_id=p.organization_id FROM qa.users u,qa.projects p
 WHERE p.id=r.project_id AND u.is_active AND r.owner=u.name AND qa.project_role(r.project_id,u.id) IS NOT NULL
 AND 1=(SELECT count(*) FROM qa.users candidate WHERE candidate.is_active AND candidate.name=r.owner AND qa.project_role(r.project_id,candidate.id) IS NOT NULL);
ALTER TABLE qa.test_runs ADD CONSTRAINT run_owner_pair CHECK ((owner_user_id IS NULL)=(owner_organization_id IS NULL)),
 ADD CONSTRAINT run_owner_project FOREIGN KEY(project_id,owner_organization_id) REFERENCES qa.projects(id,organization_id),
 ADD CONSTRAINT run_owner_member FOREIGN KEY(owner_organization_id,owner_user_id) REFERENCES qa.organization_members(organization_id,user_id);
CREATE INDEX runs_assigned_user ON qa.test_runs(project_id,owner_user_id);
CREATE FUNCTION qa.guard_run_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.owner_user_id IS NULL THEN NEW.owner_organization_id:=NULL; RETURN NEW; END IF;
 SELECT organization_id INTO NEW.owner_organization_id FROM qa.projects WHERE id=NEW.project_id;
 PERFORM id FROM qa.projects WHERE id=NEW.project_id FOR SHARE;
 IF TG_OP='INSERT' OR NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
  IF NOT EXISTS(SELECT 1 FROM qa.users u WHERE u.id=NEW.owner_user_id AND u.is_active AND qa.project_role(NEW.project_id,u.id) IS NOT NULL) THEN
   RAISE EXCEPTION 'El responsable debe tener acceso vigente al proyecto' USING ERRCODE='23503';
  END IF;
 END IF;
 SELECT name INTO NEW.owner FROM qa.users WHERE id=NEW.owner_user_id;
 RETURN NEW;
END $$;
CREATE TRIGGER run_assignment BEFORE INSERT OR UPDATE ON qa.test_runs FOR EACH ROW EXECUTE FUNCTION qa.guard_run_assignment();
INSERT INTO qa.schema_migrations(version) VALUES('018_run_assignments');
COMMIT;
