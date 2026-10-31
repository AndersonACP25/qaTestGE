import { describe, it, expect } from "vitest";
import { resolvePlainMentions } from "../../backend/src/models/plain-mentions";
import { mentionIds } from "../../backend/src/repositories/collaboration.repository";
describe("menciones escritas como texto", () => {
  const members = [
    { id: "1", name: "Ana" },
    { id: "2", name: "Ana María" },
    { id: "3", name: "Dev (QA)" },
  ];
  it("resuelve nombres completos únicos y conserva tokens seleccionados", () => {
    const resolved = resolvePlainMentions(
      "Revisar @Ana María, y @Ana. Ya @[Dev](user:3).",
      members,
    );
    expect(resolved).toBe("Revisar @[Ana María](user:2), y @[Ana](user:1). Ya @[Dev](user:3).");
    expect(mentionIds(resolved)).toEqual(["2", "1", "3"]);
  });
  it("no trata emails, nombres parciales ni cuentas desconocidas como menciones", () => {
    const text = "ana@Ana.test @An y @Desconocido";
    expect(resolvePlainMentions(text, members)).toBe(text);
  });
  it("admite puntuación literal y rechaza nombres ambiguos sin adivinar destinatario", () => {
    expect(resolvePlainMentions("Hola @Dev (QA)", members)).toBe("Hola @[Dev (QA)](user:3)");
    expect(() => resolvePlainMentions("@Ana", [...members, { id: "4", name: "ana" }])).toThrow(
      "varios integrantes",
    );
    expect(resolvePlainMentions("@[Ana](user:1)", [...members, { id: "4", name: "Ana" }])).toBe(
      "@[Ana](user:1)",
    );
  });
  it("comprueba el límite tras expandir nombres a identificadores", () => {
    expect(() => resolvePlainMentions("x".repeat(4990) + " @Ana", members)).toThrow(
      "5000 caracteres",
    );
  });
});
