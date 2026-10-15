import { describe, expect, it } from "vitest";
import {
  filterBugs,
  filterCases,
  filterEvidence,
  filterRuns,
} from "../../src/utils/filterItems.js";

describe("filterBugs", () => {
  const bugs = [
    { id: "BUG-1", title: "Checkout fails", project: "Web Store", status: "Abierto", priority: "Alta" },
    { id: "BUG-2", title: "Login timeout", project: "Mobile App", status: "Resuelto", priority: "Baja" },
  ];

  it("filters by search text without case sensitivity", () => {
    expect(filterBugs(bugs, { search: "CHECKOUT" }).map((bug) => bug.id)).toEqual(["BUG-1"]);
  });

  it("combines project and status filters", () => {
    expect(filterBugs(bugs, { project: "Mobile App", statusFilter: "Resuelto" }).map((bug) => bug.id))
      .toEqual(["BUG-2"]);
  });

  it("returns no results when the selected project has no matching bugs", () => {
    expect(filterBugs(bugs, { project: "Dashboard" })).toEqual([]);
  });
});

describe("filterCases", () => {
  const cases = [
    { id: "TC-1", title: "Apply coupon", suite: "Checkout", status: "Fallido" },
    { id: "TC-2", title: "Reset password", suite: "Authentication", status: "Aprobado" },
  ];

  it("searches suite names and applies status", () => {
    expect(filterCases(cases, { search: "checkout", statusFilter: "Fallido" }).map((item) => item.id))
      .toEqual(["TC-1"]);
  });

  it("returns all cases for the default filters", () => {
    expect(filterCases(cases)).toEqual(cases);
  });
});

describe("filterRuns", () => {
  const runs = [
    { id: "RUN-1", title: "Sprint regression", status: "En curso", owner: "Laura" },
    { id: "RUN-2", title: "Smoke test", status: "Completado", owner: "Carlos" },
  ];

  it("searches the owner and filters by status", () => {
    expect(filterRuns(runs, { search: "carlos", statusFilter: "Completado" }).map((item) => item.id))
      .toEqual(["RUN-2"]);
  });
});

describe("filterEvidence", () => {
  const evidence = [
    { name: "checkout.png", type: "Imagen", related: "BUG-1" },
    { name: "run.mp4", type: "Video", related: "RUN-2" },
  ];

  it("searches filenames and related record IDs", () => {
    expect(filterEvidence(evidence, { search: "RUN-2" })).toEqual([evidence[1]]);
    expect(filterEvidence(evidence, { search: "checkout" })).toEqual([evidence[0]]);
  });

  it("matches all evidence when the search query is empty or whitespace", () => {
    expect(filterEvidence(evidence, { search: "  " })).toEqual(evidence);
  });
});
