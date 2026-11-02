import { describe, expect, it } from "vitest";
import {
  bugDraftRequestKey,
  loadBugDrafts,
  prepareBug,
  saveBugDrafts,
  type BugDraft,
} from "../../src/models/bugDesign";

describe("diseño local de bugs", () => {
  it("adapta claves antiguas sin cambiar su identidad entre intentos ni mezclar proyectos", async () => {
    const key = await bugDraftRequestKey("u1", "p1", "borrador-173");
    expect(key).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-8[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
    expect(await bugDraftRequestKey("u1", "p1", "borrador-173")).toBe(key);
    expect(await bugDraftRequestKey("u1", "p2", "borrador-173")).not.toBe(key);
    expect(await bugDraftRequestKey("u2", "p1", "borrador-173")).not.toBe(key);
    const uuid = "f517db43-22b5-4bfe-8149-ef3a6d2c237e";
    expect(await bugDraftRequestKey("u1", "p1", uuid)).toBe(uuid);
  });
  it("conserva el problema y aplica la plantilla sin inventar información", () => {
    const result = prepareBug("  El acceso falla\nAl enviar el formulario  ", {
      id: "1",
      name: "Funcional",
      title: "[BUG]",
      description: "## Pasos\n\n## Resultado esperado",
      priority: "Alta",
      createdAt: "hoy",
    });
    expect(result.title).toBe("[BUG] El acceso falla");
    expect(result.description).toContain("## Pasos");
    expect(result.description).toContain("El acceso falla\nAl enviar el formulario");
    expect(result.priority).toBe("Alta");
    expect(prepareBug("Error").priority).toBe("Media");
    expect(() => prepareBug(" ")).toThrow();
    expect(() => prepareBug("a".repeat(3501))).toThrow();
    expect(() =>
      prepareBug("Error", {
        id: "1",
        name: "Larga",
        title: "",
        description: "a".repeat(5000),
        priority: "Media",
        createdAt: "hoy",
      }),
    ).toThrow();
  });
  it("aísla los borradores por usuario y proyecto y conserva las ediciones", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    const draft: BugDraft = {
      ...prepareBug("Error"),
      id: "draft-1",
      tagIds: ["tag-1"],
      title: "Título revisado",
    };
    saveBugDrafts("u1", "p1", [draft], storage);
    expect(loadBugDrafts("u1", "p1", storage)).toEqual([draft]);
    expect(loadBugDrafts("u2", "p1", storage)).toEqual([]);
    expect(loadBugDrafts("u1", "p2", storage)).toEqual([]);
    saveBugDrafts("u1", "p1", [], storage);
    expect(loadBugDrafts("u1", "p1", storage)).toEqual([]);
  });
  it("maneja contenido local inválido y comunica fallos de almacenamiento", () => {
    expect(loadBugDrafts("u", "p", { getItem: () => '[null,{},"texto"]' })).toEqual([]);
    expect(() => loadBugDrafts("u", "p", { getItem: () => "{" })).toThrow();
    expect(() =>
      saveBugDrafts("u", "p", [], {
        setItem: () => {
          throw new Error("sin espacio");
        },
      }),
    ).toThrow();
  });
});
