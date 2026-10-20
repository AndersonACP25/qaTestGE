import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CaseBuilder from "../../src/CaseBuilder";

describe("case builder mockup", () => {
  it("discloses fixed examples and requires input before showing a preview", () => {
    const html = renderToStaticMarkup(createElement(CaseBuilder));
    expect(html).toContain("IA no conectada");
    expect(html).toContain("no se analiza tu descripción ni se crean casos");
    expect(html).toContain('type="submit" disabled=""');
    expect(html).not.toContain("<table");
  });

  it("provides all four categories as independently selectable checkboxes", () => {
    const html = renderToStaticMarkup(createElement(CaseBuilder));
    expect(html.match(/type="checkbox"/g)).toHaveLength(4);
    for (const label of ["Edge cases", "Exploratory", "Pruebas de estrés", "API"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('id="case-builder-description"');
  });
});
