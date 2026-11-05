import { describe, expect, it } from "vitest";
import {
  designTemplatesSchema,
  emptyDesignTemplates,
} from "../../backend/src/models/design-templates.model";
import { availableTemplateDefaults } from "../../src/models/templateDefaults";

describe("plantillas de diseño", () => {
  it("rechaza referencias inválidas, duplicadas y pasos incompletos", () => {
    const defaults = { templateId: "1", tagIds: ["2"], assigneeUserId: "3" };
    expect(
      designTemplatesSchema.safeParse({ ...emptyDesignTemplates, bugDefaults: [defaults] }).success,
    ).toBe(true);
    for (const invalid of [
      { bugDefaults: [defaults, defaults] },
      { bugDefaults: [{ ...defaults, tagIds: ["2", "2"] }] },
      { bugDefaults: [{ ...defaults, assigneeUserId: "0" }] },
      {
        cases: [
          {
            ...defaults,
            id: "85ca3ae3-32a6-47a3-8f09-74ca6de0889a",
            name: "Smoke",
            title: "Login",
            testType: "Smoke",
            suite: "",
            preconditions: "",
            steps: [{ action: "Abrir el portal", expectedResult: "  " }],
          },
        ],
      },
    ])
      expect(designTemplatesSchema.safeParse({ ...emptyDesignTemplates, ...invalid }).success).toBe(
        false,
      );
  });
  it("descarta tags borrados y responsables sin acceso al aplicar la plantilla", () => {
    expect(
      availableTemplateDefaults(
        { tagIds: ["1", "2"], assigneeUserId: "3" },
        [{ id: "2" }],
        [{ id: "4" }],
      ),
    ).toEqual({ tagIds: ["2"], assigneeUserId: null });
  });
});
