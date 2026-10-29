import { describe, expect, it } from "vitest";
import { listQuery, listSql } from "../../backend/src/repositories/list-query";
import { creationHash } from "../../backend/src/repositories/creation-request";
import { loadBugDraftDocument, saveBugDraftDocument, prepareBug } from "../../src/models/bugDesign";
describe("robustez de límites", () => {
  it("detecta conflicto entre dos escritores de borradores", () => {
    const values = new Map<string, string>();
    const store = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    const first = loadBugDraftDocument("u", "p", store),
      second = loadBugDraftDocument("u", "p", store);
    saveBugDraftDocument(
      "u",
      "p",
      [{ ...prepareBug("Error"), id: "draft", tagIds: [] }],
      first.revision,
      store,
    );
    expect(() => saveBugDraftDocument("u", "p", [], second.revision, store)).toThrow(
      "otra pestaña",
    );
    expect(loadBugDraftDocument("u", "p", store).drafts).toHaveLength(1);
  });
  it("limita y parametriza filtros sin interpolar entradas", () => {
    const input = {
      query: {
        projectId: "1",
        limit: "10",
        offset: "20",
        search: "x%' OR 1=1 --",
        status: "Abierto",
      },
    } as unknown as Parameters<typeof listQuery>[0];
    const options = listQuery(input, ["Abierto"]);
    const query = listSql("b", "1", options, ["b.title"]);
    expect(query.sql).toContain("LIMIT $4 OFFSET $5");
    expect(query.sql).not.toContain("OR 1=1 --");
    expect(query.values).toEqual(["1", "Abierto", "%x\\%' OR 1=1 --%", 10, 20]);
    expect(() =>
      listQuery(
        { query: { limit: "101", projectId: "1" } } as unknown as Parameters<typeof listQuery>[0],
        [],
      ),
    ).toThrow();
    expect(() =>
      listQuery({ query: { limit: "10" } } as unknown as Parameters<typeof listQuery>[0], []),
    ).toThrow();
  });
  it("calcula la misma huella independientemente del orden de propiedades", () => {
    expect(creationHash({ title: "A", priority: "Alta" })).toBe(
      creationHash({ priority: "Alta", title: "A" }),
    );
    expect(creationHash({ title: "B" })).not.toBe(creationHash({ title: "A" }));
  });
});
