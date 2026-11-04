import { z } from "zod";
import { parseReference, resourceId } from "../validation.js";

const label = z.string().trim().min(1).max(100);
const caseId = z.string().transform((value, context) => {
  const id = parseReference(value, "TC");
  if (id) return resourceId("TC", id);
  context.addIssue({ code: "custom", message: "Identificador de caso inválido." });
  return z.NEVER;
});
export const playwrightMetadataSchema = z.object({
  key: z.string().regex(/^[a-zA-Z0-9._:/-]{1,240}$/),
  suite: label,
  environment: label,
  commit: z.string().regex(/^[a-f0-9]{40}$/),
  branch: z.string().trim().min(1).max(200),
  runUrl: z
    .string()
    .max(500)
    .regex(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/actions\/runs\/\d+(?:\/attempts\/\d+)?$/),
});
export const playwrightImportSchema = z
  .object({
    ...playwrightMetadataSchema.shape,
    unmappedCount: z.number().int().min(0).max(100000),
    results: z
      .array(
        z.object({
          caseId,
          attempts: z
            .array(z.enum(["passed", "failed", "timedOut", "skipped", "interrupted"]))
            .min(1)
            .max(20),
        }),
      )
      .min(1)
      .max(1000),
  })
  .refine((input) => new Set(input.results.map((row) => row.caseId)).size === input.results.length);
export type PlaywrightImport = z.infer<typeof playwrightImportSchema>;
export type PlaywrightMetadata = z.infer<typeof playwrightMetadataSchema> & {
  unknownCaseIds: string[];
  unmappedCount: number;
};
