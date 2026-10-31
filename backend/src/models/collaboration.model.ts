export const projectRoles = ["Admin", "QA", "Dev", "Solo lectura"] as const;
export type ProjectRole = (typeof projectRoles)[number];
export const permissions = [
  "bugs.write",
  "cases.write",
  "runs.write",
  "evidence.write",
  "tags.write",
  "plans.write",
  "comments.write",
  "settings.manage",
  "access.manage",
] as const;
export type Permission = (typeof permissions)[number];
export function can(role: ProjectRole | undefined, permission: Permission): boolean {
  if (role === "Admin") return true;
  if (role === "QA") return !["settings.manage", "access.manage"].includes(permission);
  if (role === "Dev")
    return ["bugs.write", "evidence.write", "comments.write"].includes(permission);
  return false;
}
export type ResourceKind = "bug" | "case" | "run";
export interface ResourceTarget {
  kind: ResourceKind;
  id: string;
}
export interface ProjectMember {
  id: string;
  name: string;
  role: ProjectRole | null;
  owner: boolean;
  revision: number;
}
export interface Comment {
  id: string;
  projectId: string;
  target: ResourceTarget;
  authorId: string;
  authorName: string;
  body: string;
  version: number;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  mentions: { id: string; name: string }[];
}
export interface Activity {
  id: string;
  projectId: string;
  kind: string;
  resourceId: string;
  action: string;
  actorId: string | null;
  actorName: string;
  createdAt: string;
  before: unknown;
  after: unknown;
  requestId: string | null;
}
export interface MentionNotification {
  id: string;
  commentId: string;
  target: ResourceTarget;
  authorName: string;
  createdAt: string;
  readAt: string | null;
}
export interface CollaborationRepository {
  members(projectId: string, includeCandidates?: boolean): Promise<ProjectMember[]>;
  saveMember(
    projectId: string,
    userId: string,
    role: ProjectRole | null,
    revision: number,
  ): Promise<void>;
  comments(projectId: string, target: ResourceTarget): Promise<Comment[]>;
  createComment(
    projectId: string,
    target: ResourceTarget,
    body: string,
    key: string,
  ): Promise<Comment>;
  editComment(
    projectId: string,
    id: string,
    body: string,
    version: number,
    remove: boolean,
  ): Promise<Comment>;
  activity(projectId: string, target?: ResourceTarget, before?: string): Promise<Activity[]>;
  notifications(projectId: string): Promise<MentionNotification[]>;
  readNotification(projectId: string, id: string): Promise<void>;
}
