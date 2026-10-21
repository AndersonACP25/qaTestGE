import express from "express";
import { Router } from "express";
import {
  createEvidence,
  deleteEvidence,
  downloadEvidenceFile,
  listEvidence,
  replaceEvidenceFile,
  uploadEvidenceFile,
  updateEvidence,
} from "../controllers/evidence.controller.js";

const evidenceRouter = Router();

evidenceRouter.get("/", listEvidence);
evidenceRouter.post("/", createEvidence);
evidenceRouter.post("/upload", express.raw({ type: "*/*", limit: "2mb" }), uploadEvidenceFile);
evidenceRouter.patch("/:evidenceId", updateEvidence);
evidenceRouter.delete("/:evidenceId", deleteEvidence);
evidenceRouter.get("/:evidenceId/file", downloadEvidenceFile);
evidenceRouter.post(
  "/:evidenceId/file",
  express.raw({ type: "*/*", limit: "2mb" }),
  replaceEvidenceFile,
);

export default evidenceRouter;
