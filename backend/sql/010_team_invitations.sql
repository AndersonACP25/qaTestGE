-- Códigos de un solo uso, sin almacenar el secreto en texto plano.
BEGIN;
SELECT pg_advisory_xact_lock(714209010);
DO $$
BEGIN
  IF current_database() <> 'qa_test_ge' THEN
    RAISE EXCEPTION 'Conectarse a qa_test_ge antes de aplicar la migración';
  END IF;
  IF EXISTS (SELECT 1 FROM qa.schema_migrations WHERE version = '010_team_invitations') THEN
    RETURN;
  END IF;
  CREATE TABLE qa.team_invitations (
    token_hash char(64) PRIMARY KEY,
    organization_id bigint NOT NULL REFERENCES qa.organizations(id),
    created_by bigint NOT NULL REFERENCES qa.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    CHECK (expires_at > created_at)
  );
  CREATE INDEX team_invitations_org ON qa.team_invitations(organization_id);
  INSERT INTO qa.schema_migrations(version) VALUES ('010_team_invitations');
END $$;
COMMIT;
