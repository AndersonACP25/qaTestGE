import { Router } from "express";
import { createBug, listBugs } from "../controllers/bugs.controller.js";

const bugsRouter = Router();

bugsRouter.get("/", listBugs);
bugsRouter.post("/", createBug);

export default bugsRouter;
