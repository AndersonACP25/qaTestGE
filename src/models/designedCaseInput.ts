import type { CreateTestCaseInput } from "../../backend/src/models/test-case.model";

export function designedCaseInput(
  projectId: string,
  description: string,
  testCase: {
    categoryLabel: string;
    steps: readonly { action: string; expected: string }[];
  },
): CreateTestCaseInput {
  if (!testCase.steps.length || testCase.steps.length > 100)
    throw new Error("El caso debe tener entre 1 y 100 pasos.");
  const steps = testCase.steps.map((step) => ({
    action: step.action.trim(),
    expectedResult: step.expected.trim(),
  }));
  if (
    steps.some(
      (step) =>
        !step.action ||
        !step.expectedResult ||
        step.action.length > 10000 ||
        step.expectedResult.length > 10000,
    )
  )
    throw new Error(
      "Completa la acción y el resultado esperado de todos los pasos (máximo 10000 caracteres por campo).",
    );
  return {
    projectId,
    title: `${testCase.categoryLabel} · ${steps[0].action}`.slice(0, 200),
    suite: testCase.categoryLabel.slice(0, 100),
    preconditions: description,
    steps,
  };
}
