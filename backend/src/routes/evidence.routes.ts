import { Router } from "express";
import {
  createEvidence,
  deleteEvidence,
  listEvidence,
  updateEvidence,
} from "../controllers/evidence.controller.js";

const evidenceRouter = Router();

evidenceRouter.get("/", listEvidence);
evidenceRouter.post("/", createEvidence);
evidenceRouter.patch("/:evidenceId", updateEvidence);
evidenceRouter.delete("/:evidenceId", deleteEvidence);

export default evidenceRouter;
