import { describe, expect, it, vi } from "vitest";
import {
  createDesignedMarkdownExport,
  downloadDesignedCaseExport,
} from "../../src/utils/exportCases";

describe("exportación Markdown del diseñador", () => {
  const cases = [
    {
      categoryLabel: "API",
      caseNumber: 5,
      steps: [
        { action: "Enviar | petición\ny revisar <script>", expected: "Éxito" },
        { action: "Leer", expectedResult: "Respuesta" },
      ],
    },
  ];

  it("conserva descripción, pasos editados y tablas contiguas escapando contenido", () => {
    const result = createDesignedMarkdownExport("# Requisito", cases);
    expect(result).toContain("\\# Requisito");
    expect(result).toContain("## API · Caso 5");
    expect(result).toContain("| --- | --- | --- |\n| 1 |");
    expect(result).toContain("Enviar \\| petición<br>y revisar &lt;script&gt;");
    expect(result).toContain("| 2 | Leer | Respuesta |");
    expect(result).toContain("IA no conectada");
    expect(createDesignedMarkdownExport("", [])).not.toContain("| Paso |");
  });

  it("descarga bytes Markdown con extensión y MIME correctos", async () => {
    const link = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:export");
    vi.useFakeTimers();
    vi.stubGlobal("document", { createElement: () => link, body: { append: vi.fn() } });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL: vi.fn() });
    try {
      await downloadDesignedCaseExport("md", "Requisito", cases);
      const blob = createObjectURL.mock.calls[0][0] as Blob;
      expect(blob.type).toBe("text/markdown;charset=utf-8");
      expect(await blob.text()).toBe(createDesignedMarkdownExport("Requisito", cases));
      expect(link.download).toBe("qatestge-diseno-casos.md");
      expect(link.click).toHaveBeenCalledOnce();
      vi.runAllTimers();
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });
});
