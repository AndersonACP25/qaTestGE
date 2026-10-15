import { Router } from "express";
import { createEvidence, listEvidence } from "../controllers/evidence.controller.js";

const evidenceRouter = Router();

evidenceRouter.get("/", listEvidence);
evidenceRouter.post("/", createEvidence);

export default evidenceRouter;
