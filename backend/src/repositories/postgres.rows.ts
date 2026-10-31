import type { BugPriority, BugStatus } from "../models/bug.model.js";
import type { TestCaseStatus, TestStep } from "../models/test-case.model.js";
import type { TestRunStatus, TestRunResult } from "../models/test-run.model.js";
import type { EvidenceType } from "../models/evidence.model.js";
export interface BaseRow {
  id: string;
  project_id: string;
  created_at: Date;
}
export interface BugRow extends BaseRow {
  severity?: import("../models/bug.model.js").BugPriority;
  environment?: string;
  affected_version?: string;
  source_result_id?: string | null;
  source_run_id?: string | null;
  source_case_id?: string | null;
  source_steps?: TestStep[];
  title: string;
  project: string;
  description: string;
  priority: BugPriority;
  status: BugStatus;
  assignee: string | null;
  assigned_name?: string | null;
  assignee_user_id?: string | null;
  tag_ids?: string[];
}
export interface CaseRow extends BaseRow {
  title: string;
  suite: string | null;
  test_type?: string;
  lifecycle?: "Borrador" | "Listo" | "Obsoleto";
  version?: number;
  preconditions: string;
  status: TestCaseStatus;
  steps?: TestStep[];
  assigned_name?: string | null;
  assignee_user_id?: string | null;
  tag_ids?: string[];
}
export interface RunRow extends BaseRow {
  title: string;
  owner: string;
  plan_id?: string | null;
  source_run_id?: string | null;
  status: TestRunStatus;
  case_ids: string[];
  progress: number;
  results?: TestRunResult[];
  tag_ids?: string[];
}
export interface EvidenceRow extends BaseRow {
  name: string;
  type: EvidenceType;
  size_bytes: number | string;
  has_file: boolean;
  related?: string[];
  media_type: string;
  file_bytes: Buffer;
}
export interface AttachmentRow extends BaseRow {
  test_case_id: string;
  kind: "image" | "link";
  name: string;
  external_url: string | null;
  content_type: string | null;
  image_bytes: Buffer | null;
}
export interface TagRow extends BaseRow {
  name: string;
  color: string;
}
