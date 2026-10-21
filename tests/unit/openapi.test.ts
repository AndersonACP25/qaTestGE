import { describe, expect, it } from "vitest";
import { openApiDocument } from "../../backend/src/openapi";

describe("OpenAPI contract", () => {
  it("documents all implemented operations and locally resolvable schemas", () => {
    expect(Object.keys(openApiDocument.paths)).toHaveLength(10);
    expect(Object.values(openApiDocument.paths).flatMap(Object.keys)).toHaveLength(14);
    const refs = JSON.stringify(openApiDocument).matchAll(/"\$ref":"#\/components\/schemas\/([^"]+)"/g);
    for (const [, name] of refs) expect(openApiDocument.components.schemas).toHaveProperty(name);
    expect(openApiDocument.servers[0].url).toBe("/");
    expect(openApiDocument.components.schemas.BugInput.properties.priority.enum).toContain("Alta");
  });
});
