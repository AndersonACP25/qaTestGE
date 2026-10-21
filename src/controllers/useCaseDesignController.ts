import { useState } from "react";
import type { FormEvent } from "react";
import { maxCaseCount, selectCaseExamples, validCaseCount } from "../models/caseDesign.model";
import { defaultCaseCountDefaults, type CaseCountDefaults } from "../models/caseCountDefaults";

export interface CaseDesignPreviewCase {
  categoryId: string;
  categoryLabel: string;
  caseNumber: number;
  color: string;
  steps: { action: string; expected: string }[];
}

export function useCaseDesignController(defaultCounts: CaseCountDefaults = defaultCaseCountDefaults) {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>(["edge"]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState(false);
  const [exampleSteps, setExampleSteps] = useState<Record<string, { action: string; expected: string }[]>>({});
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const effectiveCounts = Object.fromEntries(Object.entries(defaultCounts).map(([id, value]) => [id, counts[id] ?? value]));
  const selectedCategories = selectCaseExamples(selected, effectiveCounts);
  const countsValid = selected.every((id) => validCaseCount(effectiveCounts[id] ?? 1));
  const total = selectedCategories.reduce((sum, category) => sum + category.steps.length, 0);
  const previewCases: CaseDesignPreviewCase[] = selectedCategories.flatMap((category) =>
    category.steps.map((sample, index) => ({
      categoryId: category.id,
      categoryLabel: category.label,
      caseNumber: index + 1,
      color: category.color,
      steps: exampleSteps[`${category.id}:${index}`] ?? [{ action: sample.action, expected: sample.expected }],
    })));

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

  function updateExampleStep(categoryId: string, caseNumber: number, stepIndex: number, field: "action" | "expected", value: string) {
    const key = `${categoryId}:${caseNumber - 1}`;
    const category = selectedCategories.find((item) => item.id === categoryId);
    const sample = category?.steps[caseNumber - 1];
    if (!sample) return;
    setExampleSteps((current) => {
      const steps = current[key] ?? [{ action: sample.action, expected: sample.expected }];
      return { ...current, [key]: steps.map((step, index) => index === stepIndex ? { ...step, [field]: value } : step) };
    });
  }

  function addExampleStep(categoryId: string, caseNumber: number) {
    const key = `${categoryId}:${caseNumber - 1}`;
    const category = selectedCategories.find((item) => item.id === categoryId);
    const sample = category?.steps[caseNumber - 1];
    if (!sample) return;
    setExampleSteps((current) => {
      const steps = current[key] ?? [{ action: sample.action, expected: sample.expected }];
      return steps.length >= 100 ? current : { ...current, [key]: [...steps, { action: "", expected: "" }] };
    });
  }

  function removeExampleStep(categoryId: string, caseNumber: number, stepIndex: number) {
    const key = `${categoryId}:${caseNumber - 1}`;
    const category = selectedCategories.find((item) => item.id === categoryId);
    const sample = category?.steps[caseNumber - 1];
    if (!sample) return;
    setExampleSteps((current) => {
      const steps = current[key] ?? [{ action: sample.action, expected: sample.expected }];
      return steps.length <= 1 ? current : { ...current, [key]: steps.filter((_step, index) => index !== stepIndex) };
    });
  }

  async function exportPreview(format: "xlsx" | "pdf") {
    setExporting(true);
    setExportError("");
    try {
      const { downloadDesignedCaseExport } = await import("../utils/exportCases");
      await downloadDesignedCaseExport(format, text, previewCases);
    } catch {
      setExportError("No se pudo exportar el archivo. Inténtalo de nuevo.");
    } finally {
      setExporting(false);
    }
  }

  return {
    text, selected, counts, defaultCounts, preview, exporting, exportError, selectedCategories, previewCases,
    countsValid, total, maxCaseCount, updateDescription, toggleCategory, updateCount, submit,
    updateExampleStep, addExampleStep, removeExampleStep, exportPreview,
  };
}

export type CaseDesignController = ReturnType<typeof useCaseDesignController>;
