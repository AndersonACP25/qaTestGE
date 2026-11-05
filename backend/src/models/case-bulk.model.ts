import { z } from "zod";
import { isId, parseReference } from "../validation.js";

export const caseBulkLimit = 50;
const id = z.string().refine(isId);
const action = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("assign"), assigneeUserId: id.nullable() }),
  z.object({
    kind: z.literal("addTags"),
    tagIds: z
      .array(id)
      .min(1)
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length),
  }),
]);
export const caseBulkSchema = z.object({
  projectId: id,
  cases: z
    .array(
      z.object({
        id: z.string().refine((value) => parseReference(value, "TC") !== null),
        version: z.number().int().min(1).max(2147483647),
      }),
    )
    .min(1)
    .max(caseBulkLimit)
    .refine(
      (items) => new Set(items.map((item) => parseReference(item.id, "TC"))).size === items.length,
    ),
  action,
});
export type CaseBulkInput = z.infer<typeof caseBulkSchema>;
