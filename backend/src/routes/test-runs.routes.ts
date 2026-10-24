import { Router } from "express";
import {
  createTestRun,
  listTestRuns,
  updateTestRun,
  deleteTestRun,
  updateTestRunResult,
} from "../controllers/test-runs.controller.js";

const testRunsRouter = Router();

testRunsRouter.get("/", listTestRuns);
testRunsRouter.post("/", createTestRun);
testRunsRouter.patch("/:runId", updateTestRun);
testRunsRouter.delete("/:runId", deleteTestRun);
testRunsRouter.patch("/:runId/results/:resultId", updateTestRunResult);

export default testRunsRouter;
