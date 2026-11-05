import { z } from "zod";

const field = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => !value.includes("\0"));
export const caseSnapshotSchema = z.object({
  title: field(200).refine((value) => Boolean(value.trim())),
  test_type: field(100).refine((value) => Boolean(value.trim())),
  lifecycle: z.enum(["Borrador", "Listo", "Obsoleto"]),
  suite: field(100).nullish(),
  preconditions: field(10000),
  steps: z
    .array(
      z.object({
        action: field(10000).refine((value) => Boolean(value.trim())),
        expectedResult: field(10000).refine((value) => Boolean(value.trim())),
      }),
    )
    .max(100),
});
export const restoreCaseSchema = z
  .object({
    version: z.number().int().min(1).max(2147483647),
    expectedVersion: z.number().int().min(1).max(2147483647),
  })
  .refine((input) => input.version < input.expectedVersion);
