import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WikiView from "../../src/views/WikiView";

describe("wiki", () => {
  it("describes the current QA workflow and AI limitations", () => {
    const html = renderToStaticMarkup(createElement(WikiView));
    expect(html).toContain("Selecciona un proyecto");
    expect(html).toContain("Documenta casos de prueba");
    expect(html).toContain("Ejecuta pruebas");
    expect(html).toContain("No utiliza IA");
  });
});
