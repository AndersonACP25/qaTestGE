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
        "/api": {
          target: `http://localhost:${apiPort}`,
          configure(proxy) {
            proxy.on("error", (_error, _request, response) => {
              if (!("writeHead" in response) || response.headersSent) return;
              response.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
              response.end(
                JSON.stringify({
                  error: {
                    code: "API_UNAVAILABLE",
                    message:
                      "No se pudo conectar con la API. Comprueba que el backend está iniciado.",
                  },
                }),
              );
            });
          },
        },
      },
    },
    test: {
      include: ["tests/**/*.test.{ts,js}", "backend/tests/**/*.test.ts"],
    },
  };
});
