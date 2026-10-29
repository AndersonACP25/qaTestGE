import { describe, expect, it } from "vitest";
import { Linter } from "eslint";
import rule from "../../eslint-rules/pluralization.js";

const linter = new Linter();
function check(code) {
  return linter.verify(code, [
    {
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
      plugins: { product: { rules: { pluralization: rule } } },
      rules: { "product/pluralization": "error" },
    },
  ]);
}
describe("pluralization lint guard", () => {
  it.each([
    "const label = `${count} resueltos`;",
    "const label = `${count} pendiente`;",
    "const label = <span>{total} resultados registrados</span>;",
    "const label = <span>{text.length} caracteres</span>;",
  ])("rejects fixed counted copy: %s", (code) => {
    expect(check(code).map((error) => error.ruleId)).toEqual(["product/pluralization"]);
  });
  it.each([
    'const label = <span>{formatCount(total, "resultado", "resultados")}</span>;',
    'const label = `${formatCount(count, "caso", "casos")} guardados`;',
    "const label = <h2>Casos de prueba</h2>;",
    "const label = `${project.name}: revisión`;",
    "const label = `${step.action}\n Resultado esperado: ${step.expectedResult}`;",
  ])("allows agreed copy and headings: %s", (code) => {
    expect(check(code)).toEqual([]);
  });
});
