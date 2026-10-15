import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { resetStore } from "../src/models/in-memory-store.js";

afterEach(() => {
  resetStore();
});

describe("qaTestGE API", () => {
  it("reports its health", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ok");
  });

  it("creates a bug and returns it from the collection endpoint", async () => {
    const created = await request(app).post("/api/bugs").send({
      title: "Checkout falla",
      project: "Web Store",
      priority: "Alta",
    });

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      id: "BUG-001",
      title: "Checkout falla",
      project: "Web Store",
      priority: "Alta",
      status: "Abierto",
    });

    const listed = await request(app).get("/api/bugs");
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.data[0].id).toBe("BUG-001");
  });

  it("rejects invalid bug data without storing it", async () => {
    const response = await request(app).post("/api/bugs").send({
      title: " ",
      project: "Web Store",
      priority: "Urgente",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_BUG");
    expect((await request(app).get("/api/bugs")).body.data).toEqual([]);
  });

  it("creates test cases, test runs, and evidence metadata", async () => {
    const testCase = await request(app).post("/api/test-cases").send({
      title: "Validar checkout",
      suite: "Checkout",
    });
    const testRun = await request(app).post("/api/test-runs").send({
      title: "Regresión",
      owner: "QA",
      caseCount: 4,
    });
    const evidence = await request(app).post("/api/evidence").send({
      name: "checkout.png",
      type: "Imagen",
      sizeBytes: 1024,
      related: "BUG-001",
    });

    expect(testCase.status).toBe(201);
    expect(testCase.body.data.id).toBe("TC-001");
    expect(testRun.status).toBe(201);
    expect(testRun.body.data.caseCount).toBe(4);
    expect(evidence.status).toBe(201);
    expect(evidence.body.data.related).toBe("BUG-001");
  });

  it("returns a JSON error for unknown endpoints", async () => {
    const response = await request(app).get("/api/unknown");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("returns a clear error for malformed JSON", async () => {
    const response = await request(app)
      .post("/api/bugs")
      .set("Content-Type", "application/json")
      .send("{invalid");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_JSON");
  });
});
