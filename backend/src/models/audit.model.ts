import { z } from "zod";
export const auditProfiles = ["General", "Calidad", "Seguridad"] as const;
export const auditKinds = [
  "bug",
  "case",
  "run",
  "evidence",
  "plan",
  "requirement",
  "tag",
  "workflow",
  "access",
  "audit-config",
  "user",
] as const;
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(value + "T00:00:00Z");
    return (
      value >= "0001-01-01" &&
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Fecha inválida");
export const auditSettingsSchema = z.object({
  profile: z.enum(auditProfiles),
  detail: z.enum(["Resumen", "Detallado"]),
  pageSize: z.union([z.literal(25), z.literal(50), z.literal(100)]),
  version: z.number().int().nonnegative(),
});
export type AuditSettings = z.infer<typeof auditSettingsSchema>;
export const defaultAuditSettings: AuditSettings = {
  profile: "General",
  detail: "Detallado",
  pageSize: 50,
  version: 0,
};
export const auditFiltersSchema = z
  .object({
    profile: z.enum(auditProfiles).default("General"),
    kind: z.enum(auditKinds).optional(),
    operation: z.enum(["insert", "update", "delete", "provision"]).optional(),
    actorId: z
      .string()
      .regex(/^[1-9]\d{0,18}$/)
      .refine((v) => /^[1-9]\d{0,18}$/.test(v) && BigInt(v) <= 9223372036854775807n)
      .optional(),
    from: date.optional(),
    to: date.optional(),
    search: z.string().trim().max(120).optional(),
    limit: z.coerce
      .number()
      .int()
      .refine((v) => [25, 50, 100].includes(v))
      .default(50),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, "Hasta debe ser igual o posterior a Desde");
export type AuditFilters = z.infer<typeof auditFiltersSchema>;
export const provisionUserSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.email().trim().toLowerCase().max(254),
    password: z.string().min(12).max(128),
    role: z.enum(["Admin", "QA", "Dev", "Solo lectura"]),
  })
  .strict();
export type ProvisionUserInput = z.infer<typeof provisionUserSchema>;
