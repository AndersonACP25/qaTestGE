import { z } from "zod";
import { isId, parseReference } from "../validation.js";
import { bulkAssignAction, bulkTagAction, caseBulkLimit } from "./case-bulk.model.js";

const status = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .refine((value) => !value.includes("\0"));
const nullableUser = z.string().refine(isId).nullable();
export const bugBulkSchema = z.object({
  projectId: z.string().refine(isId),
  bugs: z
    .array(
      z.object({
        id: z.string().refine((value) => parseReference(value, "BUG") !== null),
        status,
        assigneeUserId: nullableUser,
        assignee: z.string().max(120).nullable(),
      }),
    )
    .min(1)
    .max(caseBulkLimit)
    .refine(
      (items) => new Set(items.map((item) => parseReference(item.id, "BUG"))).size === items.length,
    ),
  action: z.discriminatedUnion("kind", [
    bulkAssignAction,
    bulkTagAction,
    z.object({ kind: z.literal("status"), status }),
  ]),
});
export type BugBulkInput = z.infer<typeof bugBulkSchema>;
