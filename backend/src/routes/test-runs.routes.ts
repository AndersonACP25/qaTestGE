import { Router } from "express";
import { createTestRun, listTestRuns } from "../controllers/test-runs.controller.js";

const testRunsRouter = Router();

testRunsRouter.get("/", listTestRuns);
testRunsRouter.post("/", createTestRun);

export default testRunsRouter;
