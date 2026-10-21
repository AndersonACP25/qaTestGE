import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CaseBuilder from "../../src/CaseBuilder";
import { categories, selectCaseExamples, validCaseCount } from "../../src/models/caseDesign.model";
import { caseExportRows } from "../../src/utils/exportCases";

describe("case builder mockup", () => {
  it("discloses fixed examples and requires input before showing a preview", () => {
    const html = renderToStaticMarkup(createElement(CaseBuilder));
    expect(html).toContain("IA no conectada");
    expect(html).toContain("no se analiza tu descripción ni se crean casos");
    expect(html).toContain('type="submit" disabled=""');
    expect(html).not.toContain("<table");
  });

  it("provides categories with individually labelled quantity controls", () => {
    const html = renderToStaticMarkup(createElement(CaseBuilder));
    expect(html.match(/type="checkbox"/g)).toHaveLength(categories.length);
    expect(html.match(/type="number"/g)).toHaveLength(categories.length);
    for (const label of ["Smoke", "Regresión", "Funcionales", "UI", "UX", "Integración", "Edge cases", "Exploratory", "Pruebas de estrés", "API"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('id="case-builder-description"');
  });

  it("validates counts and excludes invalid quantities", () => {
    for (const value of [0, -1, 1.5, 4, NaN, Infinity]) {
      expect(validCaseCount(value)).toBe(false);
      expect(selectCaseExamples(["smoke"], { smoke: value })[0].steps).toEqual([]);
    }
    for (const value of [1, 2, 3]) expect(validCaseCount(value)).toBe(true);
  });

  it("selects independent counts and exports only the preview examples", () => {
    const result = selectCaseExamples(["smoke", "api"], { smoke: 3, api: 2, ui: 3 });
    expect(result.map((item) => item.steps.length)).toEqual([3, 2]);
    expect(caseExportRows(result)).toHaveLength(5);
    expect(selectCaseExamples(["edge"], {})[0].steps).toHaveLength(1);
    expect(selectCaseExamples([], {})).toEqual([]);
    expect(categories.every((item) => item.steps.length === 3 && new Set(item.steps.map((step) => step.action)).size === 3)).toBe(true);
    expect(new Set(categories.map((item) => item.id)).size).toBe(categories.length);
    expect(categories.every((item) => /^#[0-9a-f]{6}$/i.test(item.color))).toBe(true);
    expect(new Set(categories.map((item) => item.color)).size).toBe(categories.length);
  });
});
