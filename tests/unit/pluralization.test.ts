import { describe, expect, it } from "vitest";
import { formatCount, pluralize } from "../../src/utils/pluralization";

describe("counted Spanish copy", () => {
  it.each([
    [0, "0 pendientes"],
    [1, "1 pendiente"],
    [2, "2 pendientes"],
    [100, "100 pendientes"],
  ])("agrees for %s", (count, expected) => {
    expect(formatCount(count, "pendiente", "pendientes")).toBe(expected);
  });
  it("supports accents, compound phrases and verbs", () => {
    expect(formatCount(1, "carácter", "caracteres")).toBe("1 carácter");
    expect(formatCount(1, "resultado registrado", "resultados registrados")).toBe(
      "1 resultado registrado",
    );
    expect(pluralize(1, "Se exportará", "Se exportarán")).toBe("Se exportará");
    expect(pluralize(0, "Se exportará", "Se exportarán")).toBe("Se exportarán");
  });
});
