export interface Tag {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt: string;
}

export type CreateTagInput = Pick<Tag, "projectId" | "name" | "color">;
export type UpdateTagInput = Omit<CreateTagInput, "projectId">;
