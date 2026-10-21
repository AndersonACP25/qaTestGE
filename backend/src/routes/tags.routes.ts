import { Router } from "express";
import { createTag, deleteTag, listTags, updateTag } from "../controllers/tags.controller.js";

const tagsRouter = Router();
tagsRouter.get("/", listTags);
tagsRouter.post("/", createTag);
tagsRouter.patch("/:tagId", updateTag);
tagsRouter.delete("/:tagId", deleteTag);

export default tagsRouter;
