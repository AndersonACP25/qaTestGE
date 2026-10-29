import { loadEnvironment, databaseUrl } from "./config/environment.js";
import { createPool, checkDatabase } from "./database.js";
import { applyMigrations } from "./migrations.js";
loadEnvironment();
const pool = createPool(databaseUrl());
try {
  const client = await pool.connect();
  try {
    await applyMigrations(client, process.argv.includes("--initialize"), console.info);
    await checkDatabase(pool);
    console.info("Datos existentes conservados.");
  } finally {
    client.release();
  }
} catch {
  console.error(
    "No se pudo preparar PostgreSQL. Comprueba que qa_test_ge existe, la conexión y los permisos. Usa pnpm db:setup en una instalación nueva; pnpm db:migrate para actualizar.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
