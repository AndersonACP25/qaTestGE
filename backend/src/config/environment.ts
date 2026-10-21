import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

export function loadEnvironment(): void {
  // Paths work from src/ and dist/, regardless of the terminal's working directory.
  for (const relative of ["../../.env", "../../../.env"]) {
    const path = fileURLToPath(new URL(relative, import.meta.url));
    if (existsSync(path)) loadEnvFile(path);
  }
}

export function databaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const value = env.DATABASE_URL;
  if (!value)
    throw new Error("Configura DATABASE_URL en backend/.env o en el entorno del servidor.");
  try {
    const url = new URL(value);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      url.pathname !== "/qa_test_ge"
    )
      throw new Error();
  } catch {
    throw new Error("DATABASE_URL debe ser una URL PostgreSQL válida para qa_test_ge.");
  }
  return value;
}
