BEGIN;

CREATE TABLE qa.user_gemini_credentials (
  user_id bigint PRIMARY KEY REFERENCES qa.users(id) ON DELETE CASCADE,
  revision uuid NOT NULL,
  ciphertext bytea NOT NULL
);

INSERT INTO qa.schema_migrations(version) VALUES ('023_gemini_credentials');

COMMIT;
