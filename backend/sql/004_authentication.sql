-- Migración aditiva, ejecutar sobre qa_test_ge después de 001_schema.sql.
-- No asigna a ningún usuario las organizaciones existentes.
BEGIN;
SELECT pg_advisory_xact_lock(714209004);
CREATE TABLE IF NOT EXISTS qa.schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
DO $$
BEGIN
  IF current_database() <> 'qa_test_ge' THEN
    RAISE EXCEPTION 'Conectarse a qa_test_ge antes de aplicar la migración';
  END IF;
  IF EXISTS (SELECT 1 FROM qa.schema_migrations WHERE version = '004_authentication') THEN
    RETURN;
  END IF;
  CREATE TABLE qa.users (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email varchar(254) NOT NULL UNIQUE CHECK (email = lower(btrim(email)) AND email <> ''),
    name varchar(100) NOT NULL CHECK (btrim(name) <> ''),
    password_hash varchar(255) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE qa.organization_members (
    organization_id bigint NOT NULL REFERENCES qa.organizations(id),
    user_id bigint NOT NULL REFERENCES qa.users(id),
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, user_id)
  );
  CREATE INDEX organization_members_user ON qa.organization_members(user_id);
  CREATE TABLE qa.auth_sessions (
    token_hash char(64) PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES qa.users(id) ON DELETE CASCADE,
    csrf_token char(64) NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (expires_at > created_at)
  );
  CREATE INDEX auth_sessions_user ON qa.auth_sessions(user_id);
  CREATE INDEX auth_sessions_expiry ON qa.auth_sessions(expires_at);
  COMMENT ON TABLE qa.users IS 'Usuarios locales. Solo hashes scrypt, nunca contraseñas reversibles.';
  COMMENT ON TABLE qa.auth_sessions IS 'Hash SHA-256 de tokens aleatorios; expiración fija y revocación al salir.';
  INSERT INTO qa.schema_migrations(version) VALUES ('004_authentication');
END $$;
COMMIT;
