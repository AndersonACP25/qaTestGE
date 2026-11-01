import { describe, expect, it } from "vitest";
import { auditFiltersSchema, provisionUserSchema } from "../../backend/src/models/audit.model";
describe("validación de administración", () => {
  it("rechaza identificadores y fechas que no admite PostgreSQL sin lanzar errores de conversión", () => {
    for (const actorId of ["foo", "1 OR true", "", "0", "-1", "9223372036854775808"])
      expect(auditFiltersSchema.safeParse({ actorId }).success).toBe(false);
    for (const from of ["0000-01-01", "2026-02-29", "2026-02-30", "2026-13-01"])
      expect(auditFiltersSchema.safeParse({ from }).success).toBe(false);
    expect(auditFiltersSchema.safeParse({ from: "2026-02-02", to: "2026-02-01" }).success).toBe(
      false,
    );
    expect(
      auditFiltersSchema.safeParse({
        from: "2024-02-29",
        to: "2024-02-29",
        actorId: "9223372036854775807",
        limit: "100",
      }).success,
    ).toBe(true);
  });
  it("impide altas con privilegios de equipo o contraseñas fuera de los límites de autenticación", () => {
    const input = {
      name: "QA",
      email: "qa@example.test",
      password: "temporary password",
      role: "QA",
    };
    for (const extra of [
      { organizationRole: "owner" },
      { role: "owner" },
      { password: "short" },
      { password: "x".repeat(129) },
      { projectId: "2" },
    ])
      expect(provisionUserSchema.safeParse({ ...input, ...extra }).success).toBe(false);
  });
});
