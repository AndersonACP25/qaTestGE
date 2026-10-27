import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AccountSettingsView from "../../src/views/AccountSettingsView";
import { defaultCaseCountDefaults } from "../../src/models/caseCountDefaults";

describe("account settings view", () => {
  it("shows editable profile fields and separate password change fields", () => {
    const html = renderToStaticMarkup(
      createElement(AccountSettingsView, {
        user: { id: "1", name: "QA", email: "qa@example.test" },
        onUserUpdated: () => {},
        onAccountDeleted: () => {},
        caseCountDefaults: defaultCaseCountDefaults,
        onCaseCountDefaultsChanged: () => {},
        selectedCategories: ["edge"],
        onSelectedCategoriesChanged: () => {},
      }),
    );
    expect(html).toContain("Información de la cuenta");
    expect(html).toContain('aria-label="Apartados de configuración"');
    expect(html).toContain('aria-pressed="true">Cuenta y seguridad');
    expect(html).toContain('aria-pressed="false">Plantillas de bugs');
    expect(html).toContain('hidden=""');
    expect(html).toContain('value="qa@example.test"');
    expect(html).toContain("Contraseña actual");
    expect(html).toContain("Confirmar nueva contraseña");
    expect(html).toContain("Plantillas para bugs");
    expect(html).toContain("Conexión con IA");
    expect(html).toContain("Desactivar y anonimizar cuenta");
    expect(html).toContain("Diseño de test cases");
    expect(html).toContain("Tipos seleccionados inicialmente");
    expect(html).toContain("Valor inicial para API");
    expect(html.match(/Valor inicial para /g)).toHaveLength(18);
  });
});
