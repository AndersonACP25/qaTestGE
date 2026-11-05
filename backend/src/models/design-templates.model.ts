import { z } from "zod";
import { isId } from "../validation.js";

const reference = z.string().refine(isId);
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((value) => !value.includes("\0"));
const required = (max: number) => text(max).refine(Boolean);

export const templateDefaultsSchema = z.object({
  tagIds: z
    .array(reference)
    .max(100)
    .refine((ids) => new Set(ids).size === ids.length),
  assigneeUserId: reference.nullable(),
});

export const caseTemplateSchema = templateDefaultsSchema.extend({
  id: z.uuid(),
  name: required(100),
  title: required(200),
  testType: required(100),
  suite: text(100),
  preconditions: text(10000),
  steps: z
    .array(z.object({ action: required(10000), expectedResult: required(10000) }))
    .min(1)
    .max(25),
});

export const designTemplatesSchema = z
  .object({
    revision: z.number().int().min(0).max(2147483646),
    cases: z
      .array(caseTemplateSchema)
      .max(30)
      .refine((cases) => new Set(cases.map(({ id }) => id)).size === cases.length),
    bugDefaults: z
      .array(templateDefaultsSchema.extend({ templateId: z.string().max(100).min(1) }))
      .max(100)
      .refine((items) => new Set(items.map(({ templateId }) => templateId)).size === items.length),
  })
  .refine(
    (doc) => new TextEncoder().encode(JSON.stringify(doc)).length <= 500_000,
    "Las plantillas superan el tamaño permitido.",
  );

export type DesignTemplates = z.infer<typeof designTemplatesSchema>;
export type CaseTemplate = z.infer<typeof caseTemplateSchema>;
export type TemplateDefaults = z.infer<typeof templateDefaultsSchema>;
export const emptyDesignTemplates: DesignTemplates = { revision: 0, cases: [], bugDefaults: [] };
