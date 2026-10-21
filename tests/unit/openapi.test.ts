import { describe, expect, it } from "vitest";
import { openApiDocument } from "../../backend/src/openapi";

describe("OpenAPI contract", () => {
  it("documents all implemented operations and locally resolvable schemas", () => {
    expect(Object.keys(openApiDocument.paths)).toHaveLength(20);
    expect(Object.values(openApiDocument.paths).flatMap(Object.keys)).toHaveLength(30);
    expect(openApiDocument.paths["/api/auth/me"]).toHaveProperty("patch");
    expect(openApiDocument.paths["/api/auth/me"]).toHaveProperty("delete");
    expect(openApiDocument.paths["/api/auth/bug-templates"]).toHaveProperty("post");
    expect(openApiDocument.paths["/api/auth/password"]).toHaveProperty("patch");
    expect(openApiDocument.paths["/api/bugs/{bugId}/status"]).toHaveProperty("patch");
    expect(openApiDocument.paths["/api/test-cases/{caseId}/status"]).toHaveProperty("patch");
    expect(openApiDocument.paths["/api/test-cases/{caseId}"]).toHaveProperty("delete");
    expect(openApiDocument.paths["/api/test-cases/{caseId}/attachments"]).toHaveProperty("post");
    expect(openApiDocument.paths["/api/test-cases/{caseId}/attachments/image"]).toHaveProperty(
      "post",
    );
    expect(openApiDocument.paths["/api/test-cases/{caseId}/attachments"]).not.toHaveProperty(
      "get.requestBody",
    );
    expect(openApiDocument.paths["/api/test-cases/{caseId}"].delete.requestBody).toBeDefined();
    const refs = JSON.stringify(openApiDocument).matchAll(
      /"\$ref":"#\/components\/schemas\/([^"]+)"/g,
    );
    for (const [, name] of refs) expect(openApiDocument.components.schemas).toHaveProperty(name);
    expect(openApiDocument.servers[0].url).toBe("/");
    expect(openApiDocument.components.schemas.BugInput.properties.priority.enum).toContain("Alta");
    expect(openApiDocument.paths["/api/bugs/{bugId}"]).toHaveProperty("patch");
    expect(openApiDocument.paths["/api/evidence/{evidenceId}"]).toHaveProperty("patch");
    expect(openApiDocument.paths["/api/evidence/{evidenceId}"]).toHaveProperty("delete");
  });
});
