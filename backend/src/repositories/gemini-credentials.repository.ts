import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { HttpError } from "../http-error.js";

export interface GeminiCredentials {
  revision(userId: string): Promise<string | null>;
  key(userId: string): Promise<string | undefined>;
  save(userId: string, apiKey: string, expected: string | null): Promise<string>;
  remove(userId: string, expected: string): Promise<void>;
}

const conflict = () =>
  new HttpError(409, "AI_SETTINGS_CONFLICT", "La conexión cambió. Recarga la configuración.");

export function geminiCredentials(
  pool: Pool,
  configuredKey?: string,
): GeminiCredentials | undefined {
  if (!configuredKey) return undefined;
  if (!/^[a-fA-F0-9]{64}$/.test(configuredKey)) {
    console.warn(
      "AI_SETTINGS_ENCRYPTION_KEY debe tener 64 caracteres hexadecimales. Conexión visual desactivada.",
    );
    return undefined;
  }
  const encryptionKey = Buffer.from(configuredKey, "hex");

  return {
    async revision(userId) {
      const { rows } = await pool.query<{ revision: string }>(
        "SELECT revision FROM qa.user_gemini_credentials WHERE user_id=$1",
        [userId],
      );
      return rows[0]?.revision ?? null;
    },
    async key(userId) {
      const { rows } = await pool.query<{ ciphertext: Buffer }>(
        "SELECT ciphertext FROM qa.user_gemini_credentials WHERE user_id=$1",
        [userId],
      );
      const encrypted = rows[0]?.ciphertext;
      if (!encrypted) return undefined;
      try {
        const decipher = createDecipheriv("aes-256-gcm", encryptionKey, encrypted.subarray(0, 12));
        decipher.setAAD(Buffer.from(userId));
        decipher.setAuthTag(encrypted.subarray(12, 28));
        return Buffer.concat([decipher.update(encrypted.subarray(28)), decipher.final()]).toString(
          "utf8",
        );
      } catch {
        throw new HttpError(
          503,
          "AI_CREDENTIAL_UNREADABLE",
          "No se pudo leer la clave guardada. Vuelve a conectar Gemini.",
        );
      }
    },
    async save(userId, apiKey, expected) {
      const revision = randomUUID();
      const nonce = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", encryptionKey, nonce);
      cipher.setAAD(Buffer.from(userId));
      const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
      const ciphertext = Buffer.concat([nonce, cipher.getAuthTag(), encrypted]);
      const active = "SELECT id FROM qa.users WHERE id=$1 AND is_active FOR SHARE";
      const result =
        expected === null
          ? await pool.query(
              `INSERT INTO qa.user_gemini_credentials (user_id, revision, ciphertext)
             SELECT id, $2, $3 FROM (${active}) active ON CONFLICT (user_id) DO NOTHING`,
              [userId, revision, ciphertext],
            )
          : await pool.query(
              `UPDATE qa.user_gemini_credentials SET revision=$2, ciphertext=$3
             WHERE user_id=(${active}) AND revision=$4`,
              [userId, revision, ciphertext, expected],
            );
      if (!result.rowCount) throw conflict();
      return revision;
    },
    async remove(userId, expected) {
      const result = await pool.query(
        "DELETE FROM qa.user_gemini_credentials WHERE user_id=$1 AND revision=$2",
        [userId, expected],
      );
      if (!result.rowCount) throw conflict();
    },
  };
}
