import { Router } from "express";
import { createTestCase, listTestCases } from "../controllers/test-cases.controller.js";

const testCasesRouter = Router();

testCasesRouter.get("/", listTestCases);
testCasesRouter.post("/", createTestCase);

export default testCasesRouter;
