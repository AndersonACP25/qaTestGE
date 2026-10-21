import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, "backend", "");
  const apiPort = process.env.PORT ?? environment.PORT ?? "3000";

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": `http://localhost:${apiPort}`,
      },
    },
    test: {
      include: ["tests/**/*.test.ts", "backend/tests/**/*.test.ts"],
    },
  };
});
