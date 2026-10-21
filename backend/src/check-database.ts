import { loadEnvironment, databaseUrl } from "./config/environment.js";
import { createPool, checkDatabase, databaseFailureHint } from "./database.js";
loadEnvironment();
const pool = createPool(databaseUrl());
try {
  await checkDatabase(pool);
  console.info("Conexión a qa_test_ge y esquema qa verificados. No se modificaron datos.");
} catch (error) {
  console.error(`No se pudo verificar qa_test_ge: ${databaseFailureHint(error)}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
