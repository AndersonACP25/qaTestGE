import { Router } from "express";
import {
  createBug,
  deleteBug,
  listBugs,
  updateBug,
  updateBugStatus,
} from "../controllers/bugs.controller.js";

const bugsRouter = Router();

bugsRouter.get("/", listBugs);
bugsRouter.post("/", createBug);
bugsRouter.patch("/:bugId", updateBug);
bugsRouter.delete("/:bugId", deleteBug);
bugsRouter.patch("/:bugId/status", updateBugStatus);

export default bugsRouter;
