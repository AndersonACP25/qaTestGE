import { readFile } from "node:fs/promises";
import { loadEnvironment, databaseUrl } from "./config/environment.js";
import { createPool } from "./database.js";
loadEnvironment();
const pool = createPool(databaseUrl());
try {
  const client = await pool.connect();
  try {
    for (const filename of [
      "004_authentication.sql",
      "005_bug_templates.sql",
      "006_optional_test_suite.sql",
      "007_test_case_attachments.sql",
      "008_evidence_files.sql",
      "009_tags.sql",
      "010_team_invitations.sql",
      "011_qa_assignments.sql",
    ]) {
      const sql = await readFile(new URL(`../sql/${filename}`, import.meta.url), "utf8");
      await client.query(sql);
      console.info(`Migración ${filename} aplicada/verificada.`);
    }
    console.info("Datos existentes conservados.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} catch {
  console.error(
    "No se pudo aplicar la migración PostgreSQL. Revisa conexión, permisos y esquema qa existente.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
