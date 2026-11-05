import { defineConfig, devices } from "@playwright/test";

const database = process.env.TEST_DATABASE_URL;
if (!database) throw new Error("Define TEST_DATABASE_URL para una base PostgreSQL efímera.");
const baseURL = "http://127.0.0.1:4311";
const apiURL = "http://127.0.0.1:4312";

export default defineConfig({
  testDir: "./tests/smoke",
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL, trace: "retain-on-failure" },
  webServer: [
    {
      command: "node backend/dist/server.js",
      url: `${apiURL}/api/health`,
      env: { DATABASE_URL: database, FRONTEND_ORIGIN: baseURL, PORT: "4312" },
    },
    {
      command: "pnpm dev:frontend --host 127.0.0.1 --port 4311 --strictPort",
      url: baseURL,
      env: { PORT: "4312" },
    },
  ],
});
