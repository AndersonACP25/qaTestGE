import { Router } from "express";
import { createBug, listBugs, updateBugStatus } from "../controllers/bugs.controller.js";

const bugsRouter = Router();

bugsRouter.get("/", listBugs);
bugsRouter.post("/", createBug);
bugsRouter.patch("/:bugId/status", updateBugStatus);

export default bugsRouter;
