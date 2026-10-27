import type { Project } from "../repositories/repository.js";

export interface User {
  id: string;
  name: string;
  email: string;
}
export interface AuthState {
  user: User;
  csrfToken: string;
}
export interface AuthGrant extends AuthState {
  token: string;
  expiresAt: Date;
}
export interface RegistrationInput {
  name: string;
  email: string;
  password: string;
}
export interface UpdateProfileInput {
  name: string;
  email: string;
}
export type BugTemplatePriority = "Crítica" | "Alta" | "Media" | "Baja";
export interface BugTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  priority: BugTemplatePriority;
  createdAt: string;
}
export interface BugTemplateInput {
  name: string;
  title: string;
  description: string;
  priority: BugTemplatePriority;
}
export interface AuthProvider {
  register(input: RegistrationInput, previousToken?: string): Promise<AuthGrant>;
  login(email: string, password: string, previousToken?: string): Promise<AuthGrant>;
  authenticate(token: string): Promise<AuthState | null>;
  logout(token: string): Promise<void>;
  projects(userId: string): Promise<Project[]>;
  createProject(userId: string, name: string, description: string): Promise<Project>;
  updateProject(
    userId: string,
    projectId: string,
    name: string,
    description: string,
  ): Promise<Project>;
  deleteProject(userId: string, projectId: string): Promise<void>;
  listTeams(userId: string): Promise<{ id: string; name: string; role: "owner" | "member" }[]>;
  listTeamMembers(
    userId: string,
    teamId: string,
  ): Promise<{ id: string; name: string; role: "owner" | "member" }[]>;
  createTeamInvite(userId: string, teamId: string): Promise<{ code: string; expiresAt: string }>;
  acceptTeamInvite(userId: string, code: string): Promise<void>;
  removeTeamMember(userId: string, teamId: string, memberId: string): Promise<void>;
  updateProfile(userId: string, input: UpdateProfileInput): Promise<User>;
  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentToken: string,
  ): Promise<void>;
  listBugTemplates(userId: string): Promise<BugTemplate[]>;
  createBugTemplate(userId: string, input: BugTemplateInput): Promise<BugTemplate>;
  updateBugTemplate(
    userId: string,
    templateId: string,
    input: BugTemplateInput,
  ): Promise<BugTemplate>;
  deleteBugTemplate(userId: string, templateId: string): Promise<void>;
  deactivateAccount(userId: string, currentPassword: string): Promise<void>;
}
