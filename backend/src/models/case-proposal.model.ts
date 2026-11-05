import { z } from "zod";

export const maxAiCases = 8;
const field = (limit: number) => z.string().max(limit).trim().min(1);
export const caseProposalInput = z
  .strictObject({
    description: field(3500),
    categories: z
      .array(
        z.strictObject({
          label: field(100),
          count: z.number().int().min(1).max(5),
        }),
      )
      .min(1)
      .max(maxAiCases),
  })
  .refine(({ categories }) => categories.reduce((sum, item) => sum + item.count, 0) <= maxAiCases);

export const caseProposalList = z
  .array(
    z.strictObject({
      categoryIndex: z
        .number()
        .int()
        .min(0)
        .max(maxAiCases - 1),
      title: field(200),
      steps: z
        .array(z.strictObject({ action: field(1000), expected: field(1000) }))
        .min(1)
        .max(5),
    }),
  )
  .min(1)
  .max(maxAiCases);

export type CaseProposal = z.infer<typeof caseProposalList>[number];
