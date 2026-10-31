import { describe, expect, it } from "vitest";
import { categories, selectCaseExamples, validCaseCount } from "../../src/models/caseDesign.model";
import { caseExportRows } from "../../src/utils/exportCases";

describe("selección y cantidades del diseñador", () => {
  it("validates counts and excludes invalid quantities", () => {
    for (const value of [0, -1, 1.5, 6, NaN, Infinity]) {
      expect(validCaseCount(value)).toBe(false);
      expect(selectCaseExamples(["smoke"], { smoke: value })[0].steps).toEqual([]);
    }
    for (const value of [1, 2, 3, 4, 5]) expect(validCaseCount(value)).toBe(true);
  });

  it("selects independent counts and exports only the preview examples", () => {
    const result = selectCaseExamples(["smoke", "api"], { smoke: 3, api: 2, ui: 3 });
    expect(result.map((item) => item.steps.length)).toEqual([3, 2]);
    expect(caseExportRows(result)).toHaveLength(5);
    expect(selectCaseExamples(["api"], { api: 5 })[0].steps).toHaveLength(5);
    expect(selectCaseExamples(["edge"], {})[0].steps).toHaveLength(1);
    expect(selectCaseExamples([], {})).toEqual([]);
    expect(
      categories.every(
        (item) =>
          item.steps.length === 5 && new Set(item.steps.map((step) => step.action)).size === 5,
      ),
    ).toBe(true);
    expect(new Set(categories.map((item) => item.id)).size).toBe(categories.length);
  });
});
