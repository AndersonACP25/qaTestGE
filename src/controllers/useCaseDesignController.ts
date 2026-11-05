import { caseProposalInput, type CaseProposal } from "../../backend/src/models/case-proposal.model";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  categories,
  type CaseCategory,
  maxCaseCount,
  selectCaseExamples,
  validCaseCount,
} from "../models/caseDesign.model";
import { defaultCaseCountDefaults, type CaseCountDefaults } from "../models/caseCountDefaults";
import { api, createTestCase, updateTestCase } from "../api";
import { designedCaseInput } from "../models/designedCaseInput";
import type { TestCase } from "../types";

export interface CaseDesignPreviewCase {
  key: string;
  title?: string;
  categoryLabel: string;
  caseNumber: number;
  color: string;
  steps: { action: string; expected: string }[];
}

export function useCaseDesignController(
  defaultCounts: CaseCountDefaults = defaultCaseCountDefaults,
  projectId = "",
  defaultSelected: string[] = ["edge"],
  catalog: CaseCategory[] = categories,
) {
  const proposalRequest = useRef<AbortController | null>(null);
  useEffect(() => () => proposalRequest.current?.abort(), []);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [generated, setGenerated] = useState<CaseDesignPreviewCase[] | null>(null);
  const requestKeys = useRef<Record<string, string>>({});
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
    catalog.map(({ id }) => [id, counts[id] ?? defaultCounts[id] ?? 1]),
  );
  const selectedCategories = selectCaseExamples(selected, effectiveCounts, catalog);
  const countsValid = selected.every((id) => validCaseCount(effectiveCounts[id] ?? 1));
  const total = selectedCategories.reduce((sum, category) => sum + category.steps.length, 0);
  const examples: CaseDesignPreviewCase[] = selectedCategories.flatMap((category) =>
    category.steps.map((sample, index) => ({
      key: `${category.id}:${index + 1}`,
      categoryLabel: category.label,
      caseNumber: index + 1,
      color: category.color,
      steps: [{ action: sample.action, expected: sample.expected }],
    })),
  );
  const previewCases = (generated ?? examples).map((item) => ({
    ...item,
    steps: exampleSteps[item.key] ?? item.steps,
  }));
  const generationInput = caseProposalInput.safeParse({
    description: text.trim(),
    categories: selectedCategories.map(({ label, steps }) => ({ label, count: steps.length })),
  });

  async function generateCases() {
    if (
      !projectId ||
      !countsValid ||
      !generationInput.success ||
      proposalRequest.current ||
      savingCaseKey
    )
      return;
    const controller = new AbortController();
    proposalRequest.current = controller;
    setGenerating(true);
    setGenerationError("");
    try {
      const proposals = await api<CaseProposal[]>("/ai/case-proposals", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({ projectId, consent: true, ...generationInput.data }),
      });
      if (controller.signal.aborted) return;
      if (
        proposals.some(({ categoryIndex }) => categoryIndex >= selectedCategories.length) ||
        generationInput.data.categories.some(
          ({ count }, index) =>
            proposals.filter(({ categoryIndex }) => categoryIndex === index).length !== count,
        )
      )
        throw new Error("Gemini devolvió cantidades distintas a las solicitadas.");
      setGenerated(
        selectedCategories.flatMap((category, index) =>
          proposals
            .filter(({ categoryIndex }) => categoryIndex === index)
            .map(({ title, steps }, position) => ({
              key: crypto.randomUUID(),
              title,
              steps,
              categoryLabel: category.label,
              caseNumber: position + 1,
              color: category.color,
            })),
        ),
      );
      setSaveCaseError("");
      setExportError("");
      setPreview(true);
    } catch (cause) {
      if (!controller.signal.aborted)
        setGenerationError(
          cause instanceof Error ? cause.message : "No se pudieron generar los casos.",
        );
    } finally {
      proposalRequest.current = null;
      if (!controller.signal.aborted) setGenerating(false);
    }
  }

  function updateTitle(key: string, title: string) {
    setGenerated(
      (current) => current?.map((item) => (item.key === key ? { ...item, title } : item)) ?? null,
    );
  }

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
    if (text.trim() && selected.length && countsValid && !generating) {
      setGenerated(null);
      setPreview(true);
    }
  }

  function updateSteps(
    testCase: CaseDesignPreviewCase,
    change: (steps: CaseDesignPreviewCase["steps"]) => CaseDesignPreviewCase["steps"],
  ) {
    setExampleSteps((current) => ({
      ...current,
      [testCase.key]: change(current[testCase.key] ?? testCase.steps),
    }));
  }

  function updateExampleStep(
    testCase: CaseDesignPreviewCase,
    stepIndex: number,
    field: "action" | "expected",
    value: string,
  ) {
    updateSteps(testCase, (steps) =>
      steps.map((step, index) => (index === stepIndex ? { ...step, [field]: value } : step)),
    );
  }

  function addExampleStep(testCase: CaseDesignPreviewCase) {
    updateSteps(testCase, (steps) =>
      steps.length >= 100 ? steps : [...steps, { action: "", expected: "" }],
    );
  }

  function removeExampleStep(testCase: CaseDesignPreviewCase, stepIndex: number) {
    updateSteps(testCase, (steps) =>
      steps.length <= 1 ? steps : steps.filter((_step, index) => index !== stepIndex),
    );
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
    const { key } = testCase;
    if (!projectId || savingCaseKey || generating) return;
    setSavingCaseKey(key);
    setSaveCaseError("");
    try {
      const currentCase = previewCases.find((item) => item.key === key);
      if (!currentCase) throw new Error("La vista previa ya no contiene este caso.");
      const input = designedCaseInput(projectId, text, currentCase);
      const existing = savedCases[key];
      const saved = existing
        ? await updateTestCase(existing.id, projectId, {
            ...input,
            expectedVersion: existing.version,
            lifecycle: existing.lifecycle,
            tagIds: existing.tagIds ?? [],
          })
        : await createTestCase(
            input,
            requestKeys.current[key] ?? (requestKeys.current[key] = crypto.randomUUID()),
          );
      setSavedCases((current) => ({ ...current, [key]: saved }));
    } catch (cause) {
      setSaveCaseError(cause instanceof Error ? cause.message : "No se pudo guardar el caso.");
    } finally {
      setSavingCaseKey("");
    }
  }

  return {
    categories: catalog,
    text,
    selected,
    counts,
    defaultCounts,
    preview,
    generated: generated !== null,
    generating,
    generationError,
    generationInput: generationInput.success ? generationInput.data : null,
    generateCases,
    updateTitle,
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
