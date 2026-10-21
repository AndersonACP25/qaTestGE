import express, { Router } from "express";
import {
  createTestCase,
  deleteTestCase,
  listTestCases,
  updateTestCase,
  updateTestCaseStatus,
} from "../controllers/test-cases.controller.js";
import {
  createCaseLink,
  deleteCaseAttachment,
  getCaseImage,
  listCaseAttachments,
  uploadCaseImage,
} from "../controllers/test-case-attachments.controller.js";

const testCasesRouter = Router();

testCasesRouter.get("/", listTestCases);
testCasesRouter.post("/", createTestCase);
testCasesRouter.patch("/:caseId", updateTestCase);
testCasesRouter.delete("/:caseId", deleteTestCase);
testCasesRouter.patch("/:caseId/status", updateTestCaseStatus);
testCasesRouter.get("/:caseId/attachments", listCaseAttachments);
testCasesRouter.post("/:caseId/attachments", createCaseLink);
testCasesRouter.post(
  "/:caseId/attachments/image",
  express.raw({ type: "image/*", limit: "2mb" }),
  uploadCaseImage,
);
testCasesRouter.get("/:caseId/attachments/:attachmentId/image", getCaseImage);
testCasesRouter.delete("/:caseId/attachments/:attachmentId", deleteCaseAttachment);

export default testCasesRouter;
