import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AccountSettingsView from "../../src/views/AccountSettingsView";

describe("account settings view", () => {
  it("shows editable profile fields and separate password change fields", () => {
    const html = renderToStaticMarkup(createElement(AccountSettingsView, {
      user: { id: "1", name: "QA", email: "qa@example.test" },
      onUserUpdated: () => {},
    }));
    expect(html).toContain("Información de la cuenta");
    expect(html).toContain('value="qa@example.test"');
    expect(html).toContain("Contraseña actual");
    expect(html).toContain("Confirmar nueva contraseña");
  });
});
