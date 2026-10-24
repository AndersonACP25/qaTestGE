import { useState } from "react";
import type { FormEvent } from "react";
import { maxCaseCount, selectCaseExamples, validCaseCount } from "../models/caseDesign.model";
import { defaultCaseCountDefaults, type CaseCountDefaults } from "../models/caseCountDefaults";
import { createTestCase, updateTestCase } from "../api";
import { designedCaseInput } from "../models/designedCaseInput";
import type { TestCase } from "../types";

export interface CaseDesignPreviewCase {
  categoryId: string;
  categoryLabel: string;
  caseNumber: number;
  color: string;
  steps: { action: string; expected: string }[];
}

export function useCaseDesignController(
  defaultCounts: CaseCountDefaults = defaultCaseCountDefaults,
  projectId = "",
  defaultSelected: string[] = ["edge"],
) {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState(false);
  const [exampleSteps, setExampleSteps] = useState<
    Record<string, { action: string; expected: string }[]>
  >({});
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [savingCaseKey, setSavingCaseKey] = useState("");
  const [savedCases, setSavedCases] = useState<Record<string, TestCase>>({});
  const [saveCaseError, setSaveCaseError] = useState("");
  const effectiveCounts = Object.fromEntries(
    Object.entries(defaultCounts).map(([id, value]) => [id, counts[id] ?? value]),
  );
  const selectedCategories = selectCaseExamples(selected, effectiveCounts);
  const countsValid = selected.every((id) => validCaseCount(effectiveCounts[id] ?? 1));
  const total = selectedCategories.reduce((sum, category) => sum + category.steps.length, 0);
  const previewCases: CaseDesignPreviewCase[] = selectedCategories.flatMap((category) =>
    category.steps.map((sample, index) => ({
      categoryId: category.id,
      categoryLabel: category.label,
      caseNumber: index + 1,
      color: category.color,
      steps: exampleSteps[`${category.id}:${index}`] ?? [
        { action: sample.action, expected: sample.expected },
      ],
    })),
  );

  function updateDescription(value: string) {
    setText(value);
    setPreview(false);
  }

  function toggleCategory(id: string, checked: boolean) {
    setSelected((items) => (checked ? [...items, id] : items.filter((item) => item !== id)));
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

  function updateExampleStep(
    categoryId: string,
    caseNumber: number,
    stepIndex: number,
    field: "action" | "expected",
    value: string,
  ) {
    const key = `${categoryId}:${caseNumber - 1}`;
    const category = selectedCategories.find((item) => item.id === categoryId);
    const sample = category?.steps[caseNumber - 1];
    if (!sample) return;
    setExampleSteps((current) => {
      const steps = current[key] ?? [{ action: sample.action, expected: sample.expected }];
      return {
        ...current,
        [key]: steps.map((step, index) =>
          index === stepIndex ? { ...step, [field]: value } : step,
        ),
      };
    });
  }

  function addExampleStep(categoryId: string, caseNumber: number) {
    const key = `${categoryId}:${caseNumber - 1}`;
    const category = selectedCategories.find((item) => item.id === categoryId);
    const sample = category?.steps[caseNumber - 1];
    if (!sample) return;
    setExampleSteps((current) => {
      const steps = current[key] ?? [{ action: sample.action, expected: sample.expected }];
      return steps.length >= 100
        ? current
        : { ...current, [key]: [...steps, { action: "", expected: "" }] };
    });
  }

  function removeExampleStep(categoryId: string, caseNumber: number, stepIndex: number) {
    const key = `${categoryId}:${caseNumber - 1}`;
    const category = selectedCategories.find((item) => item.id === categoryId);
    const sample = category?.steps[caseNumber - 1];
    if (!sample) return;
    setExampleSteps((current) => {
      const steps = current[key] ?? [{ action: sample.action, expected: sample.expected }];
      return steps.length <= 1
        ? current
        : { ...current, [key]: steps.filter((_step, index) => index !== stepIndex) };
    });
  }

  async function exportPreview(format: "xlsx" | "pdf" | "md") {
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

  async function savePreviewCase(testCase: CaseDesignPreviewCase) {
    const key = `${testCase.categoryId}:${testCase.caseNumber}`;
    if (!projectId || savingCaseKey) return;
    setSavingCaseKey(key);
    setSaveCaseError("");
    try {
      const currentCase = previewCases.find(
        (item) =>
          item.categoryId === testCase.categoryId && item.caseNumber === testCase.caseNumber,
      );
      if (!currentCase) throw new Error("La vista previa ya no contiene este caso.");
      const input = designedCaseInput(projectId, text, currentCase);
      const existing = savedCases[key];
      const saved = existing
        ? await updateTestCase(existing.id, projectId, { ...input, tagIds: existing.tagIds ?? [] })
        : await createTestCase(input);
      setSavedCases((current) => ({ ...current, [key]: saved }));
    } catch (cause) {
      setSaveCaseError(cause instanceof Error ? cause.message : "No se pudo guardar el caso.");
    } finally {
      setSavingCaseKey("");
    }
  }

  return {
    text,
    selected,
    counts,
    defaultCounts,
    preview,
    exporting,
    exportError,
    savingCaseKey,
    savedCases,
    saveCaseError,
    selectedCategories,
    previewCases,
    countsValid,
    total,
    maxCaseCount,
    updateDescription,
    toggleCategory,
    updateCount,
    submit,
    updateExampleStep,
    addExampleStep,
    removeExampleStep,
    exportPreview,
    savePreviewCase,
    projectId,
  };
}

export type CaseDesignController = ReturnType<typeof useCaseDesignController>;
