export const evidenceTypes = ["Imagen", "Video", "Archivo"] as const;
export type EvidenceType = (typeof evidenceTypes)[number];

export interface Evidence {
  id: string;
  projectId: string;
  name: string;
  type: EvidenceType;
  related: string[];
  sizeBytes: number;
  createdAt: string;
}

export type CreateEvidenceInput = Pick<Evidence, "name" | "type" | "sizeBytes" | "projectId"> & {
  related?: string | null;
};

export type UpdateEvidenceInput = Omit<CreateEvidenceInput, "projectId">;
