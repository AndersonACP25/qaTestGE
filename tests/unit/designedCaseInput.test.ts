import { describe, expect, it } from "vitest";
import { designedCaseInput } from "../../src/models/designedCaseInput";

describe("guardado completo del diseñador", () => {
  it("conserva todos los pasos actuales y su orden", () => {
    const steps = Array.from({ length: 100 }, (_, index) => ({
      action: ` Acción ${index} `,
      expected: ` Resultado ${index} `,
    }));
    const input = designedCaseInput("1", "Requisito", { categoryLabel: "API", steps });
    expect(input.steps).toHaveLength(100);
    expect(input.steps?.[99]).toEqual({ action: "Acción 99", expectedResult: "Resultado 99" });
    expect(input.projectId).toBe("1");
  });
  it("rechaza pasos incompletos sin descartarlos silenciosamente", () => {
    expect(() =>
      designedCaseInput("1", "", {
        categoryLabel: "API",
        steps: [
          { action: "Primero", expected: "Bien" },
          { action: "Segundo", expected: " " },
        ],
      }),
    ).toThrow("todos los pasos");
    expect(() => designedCaseInput("1", "", { categoryLabel: "API", steps: [] })).toThrow(
      "1 y 100",
    );
  });
});
