import { expect, it } from "vitest";
import { assignedWorkFiltersSchema } from "../../backend/src/models/assigned-work.model";
it("limita consultas de asignación y rechaza paginadores inválidos", () => {
  for (const input of [
    { page: 0 },
    { page: -1 },
    { page: 1.5 },
    { page: 100001 },
    { pageSize: 1000 },
    { kind: "access" },
    { search: "x".repeat(121) },
  ])
    expect(assignedWorkFiltersSchema.safeParse(input).success).toBe(false);
  expect(
    assignedWorkFiltersSchema.parse({ page: "2", pageSize: "10", search: "  TC-001  " }),
  ).toMatchObject({ page: 2, pageSize: 10, search: "TC-001" });
});
