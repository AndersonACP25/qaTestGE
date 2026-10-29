import { describe, expect, it } from "vitest";
import request from "supertest";
import express from "express";
import { requestContext } from "../src/middleware/request-context.js";
describe("request context", () => {
  it("registra solo ruta parametrizada, tiempos y correlación", async () => {
    const entries: unknown[] = [];
    const app = express();
    app.use(requestContext((entry) => entries.push(entry)));
    app.get("/widgets/:id", (_req, res) => res.json({ ok: true }));
    const response = await request(app).get("/widgets/private-value?token=secret-value");
    expect(response.headers["x-request-id"]).toMatch(/^[a-f0-9-]{36}$/);
    expect(entries).toHaveLength(1);
    expect(JSON.stringify(entries)).not.toContain("private-value");
    expect(JSON.stringify(entries)).not.toContain("secret-value");
  });
});
