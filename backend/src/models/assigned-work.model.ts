import { z } from "zod";
export const assignedWorkFiltersSchema = z.object({
  kind: z.enum(["bug", "case", "run"]).optional(),
  status: z.string().trim().max(60).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((v) => [10, 25, 50].includes(v))
    .default(25),
});
export type AssignedWorkFilters = z.infer<typeof assignedWorkFiltersSchema>;
export const assignedWorkItemSchema = z.object({
  kind: z.enum(["bug", "case", "run"]),
  id: z.string(),
  title: z.string(),
  status: z.string(),
  classification: z.string(),
  createdAt: z.string(),
});
export const assignedWorkPageSchema = z.object({
  items: z.array(assignedWorkItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type AssignedWorkPage = z.infer<typeof assignedWorkPageSchema>;
