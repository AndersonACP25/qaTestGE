export const evidenceTypes = ["Imagen", "Video", "Archivo"] as const;
export type EvidenceType = (typeof evidenceTypes)[number];

export interface Evidence {
  id: string;
  name: string;
  type: EvidenceType;
  related: string | null;
  sizeBytes: number;
  createdAt: string;
}

export type CreateEvidenceInput = Pick<Evidence, "name" | "type" | "sizeBytes"> & {
  related?: string | null;
};
