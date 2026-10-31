import { describe, it, expect } from "vitest";
import { reportRangeError } from "../../src/models/reportRange";
describe("rango de reportes", () => {
  it("permite el mismo día y 366 días inclusivos, rechaza inversión y fechas imposibles", () => {
    expect(reportRangeError("2026-10-01", "2026-10-01")).toBe("");
    expect(reportRangeError("2026-01-01", "2027-01-01")).toBe("");
    expect(reportRangeError("2026-10-02", "2026-10-01")).toContain("anterior");
    expect(reportRangeError("2026-02-30", "2026-03-01")).toContain("válidas");
    expect(reportRangeError("2026-01-01", "2027-01-02")).toContain("366");
  });
});
