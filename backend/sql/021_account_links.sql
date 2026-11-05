BEGIN;
SELECT pg_advisory_xact_lock(714209021);
ALTER TABLE qa.users ADD COLUMN activation_pending boolean NOT NULL DEFAULT false;
CREATE TABLE qa.account_links (
 user_id bigint PRIMARY KEY REFERENCES qa.users(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
 purpose text NOT NULL CHECK (purpose IN ('activation','recovery')),
 issued_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL
);
CREATE FUNCTION qa.invalidate_account_link() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (OLD.password_hash, OLD.email, OLD.is_active, OLD.activation_pending)
    IS DISTINCT FROM (NEW.password_hash, NEW.email, NEW.is_active, NEW.activation_pending) THEN
  DELETE FROM qa.account_links WHERE user_id=NEW.id;
 END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER account_link_invalidated AFTER UPDATE OF password_hash,email,is_active,activation_pending
 ON qa.users FOR EACH ROW EXECUTE FUNCTION qa.invalidate_account_link();
INSERT INTO qa.schema_migrations(version) VALUES ('021_account_links');
COMMIT;
