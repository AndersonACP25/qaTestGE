import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Alert, { type AlertTone } from "../../src/Alert";

describe("alertas accesibles", () => {
  it.each<AlertTone>(["success", "warning", "error", "info"])(
    "comunica %s con texto y semántica",
    (tone) => {
      const html = renderToStaticMarkup(
        createElement(Alert, { tone, children: "Mensaje de prueba", onDismiss: () => {} }),
      );
      expect(html).toContain(`alert--${tone}`);
      expect(html).toContain(
        `role="${tone === "error" || tone === "warning" ? "alert" : "status"}"`,
      );
      expect(html).toContain("Mensaje de prueba");
      expect(html).toContain('aria-label="Cerrar alerta"');
    },
  );
});
