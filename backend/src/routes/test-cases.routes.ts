import { Router } from "express";
import { createTestCase, listTestCases, updateTestCaseStatus } from "../controllers/test-cases.controller.js";

const testCasesRouter = Router();

testCasesRouter.get("/", listTestCases);
testCasesRouter.post("/", createTestCase);
testCasesRouter.patch("/:caseId/status", updateTestCaseStatus);

export default testCasesRouter;
