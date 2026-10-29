import { describe, expect, it } from "vitest";
import {
  loadBugDrafts,
  prepareBug,
  saveBugDrafts,
  type BugDraft,
} from "../../src/models/bugDesign";

describe("diseño local de bugs", () => {
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
