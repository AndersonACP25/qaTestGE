import { loadEnvironment, databaseUrl } from "./config/environment.js";
import { createPool, checkDatabase } from "./database.js";
import { PostgresRepository } from "./repositories/postgres.repository.js";
import { createApp } from "./app.js";
import { PostgresAuth } from "./auth/auth.js";

loadEnvironment();
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT debe ser un puerto TCP válido entre 1 y 65535.");
const pool = createPool(databaseUrl());
try {
  await checkDatabase(pool);
  const app = createApp(new PostgresRepository(pool), new PostgresAuth(pool));
  const server = app.listen(port, () => {
    console.info(`qaTestGE API disponible en http://localhost:${port} · PostgreSQL conectado`);
  });
  server.on("error", async () => {
    console.error("No se pudo iniciar la API. Revisa PORT y los procesos activos.");
    await pool.end();
    process.exitCode = 1;
  });
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    const timer = setTimeout(() => {
      console.error("Se agotó el tiempo de cierre de la API.");
      process.exit(1);
    }, 10000);
    timer.unref();
    server.close(() => {
      void pool.end().finally(() => {
        clearTimeout(timer);
      });
    });
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
} catch {
  console.error(
    "No se pudo conectar a qa_test_ge. Revisa DATABASE_URL, PostgreSQL y el esquema qa. No se usará almacenamiento en memoria.",
  );
  await pool.end();
  process.exitCode = 1;
}
