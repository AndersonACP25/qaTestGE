import { readFile } from "node:fs/promises";
import { loadEnvironment, databaseUrl } from "./config/environment.js";
import { createPool } from "./database.js";
loadEnvironment();
const pool = createPool(databaseUrl());
try {
  const sql = await readFile(new URL("../sql/004_authentication.sql", import.meta.url), "utf8");
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.info("Migración 004_authentication aplicada/verificada. Datos existentes conservados.");
  } catch { await client.query("ROLLBACK"); throw new Error("migration failed"); }
  finally { client.release(); }
} catch {
  console.error("No se pudo aplicar 004_authentication. Revisa conexión, permisos y esquema qa existente.");
  process.exitCode = 1;
} finally { await pool.end(); }
