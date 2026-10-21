import { useState } from "react";
import type { FormEvent } from "react";
import { maxCaseCount, selectCaseExamples, validCaseCount } from "../models/caseDesign.model";

export function useCaseDesignController() {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>(["edge"]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const selectedCategories = selectCaseExamples(selected, counts);
  const countsValid = selected.every((id) => validCaseCount(counts[id] ?? 1));
  const total = selectedCategories.reduce((sum, category) => sum + category.steps.length, 0);

  function updateDescription(value: string) {
    setText(value);
    setPreview(false);
  }

  function toggleCategory(id: string, checked: boolean) {
    setSelected((items) => checked ? [...items, id] : items.filter((item) => item !== id));
    setPreview(false);
    setExportError("");
  }

  function updateCount(id: string, value: number) {
    setCounts((items) => ({ ...items, [id]: value }));
    setPreview(false);
    setExportError("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (text.trim() && selected.length && countsValid) setPreview(true);
  }

  async function exportPreview(format: "xlsx" | "pdf") {
    setExporting(true);
    setExportError("");
    try {
      const { downloadCaseExport } = await import("../utils/exportCases");
      await downloadCaseExport(format, text, selectedCategories);
    } catch {
      setExportError("No se pudo exportar el archivo. Inténtalo de nuevo.");
    } finally {
      setExporting(false);
    }
  }

  return {
    text, selected, counts, preview, exporting, exportError, selectedCategories,
    countsValid, total, maxCaseCount, updateDescription, toggleCategory, updateCount, submit, exportPreview,
  };
}

export type CaseDesignController = ReturnType<typeof useCaseDesignController>;
