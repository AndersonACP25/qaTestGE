import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "../../src/App";

describe("workspace branding", () => {
  it("uses the favicon as its mark and omits the retired indicators", () => {
    const html = renderToStaticMarkup(
      createElement(App, {
        user: { id: "1", name: "QA", email: "qa@example.test" },
        onUserUpdated: () => {},
        onAccountDeleted: () => {},
        onLogout: () => {},
        themeControl: null,
      }),
    );
    expect(html).toContain('src="/favicon.svg"');
    expect(html).not.toContain("Almacenamiento");
    expect(html).not.toContain("Demo local");
    expect(html).toContain("Equipos");
    expect(html).toContain("IA no conectada");
  });
});
