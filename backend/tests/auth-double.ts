import type { AuthProvider } from "../src/models/user.model.js";
export const testToken = "a".repeat(64);
export const testCsrf = "b".repeat(64);
export const testUser = { id: "1", name: "QA", email: "qa@example.test" };
export const testAuth: AuthProvider = {
  register: async () => {
    throw new Error("not used");
  },
  login: async () => {
    throw new Error("not used");
  },
  authenticate: async (token) =>
    token === testToken ? { user: testUser, csrfToken: testCsrf } : null,
  logout: async () => {},
  projects: async () => [{ id: "1", organizationId: "1", name: "Web Store", description: "" }],
  createProject: async (_userId, name, description) => ({
    id: "2",
    organizationId: "1",
    name,
    description,
  }),
  updateProject: async (_userId, projectId, name, description) => ({
    id: projectId,
    organizationId: "1",
    name,
    description,
  }),
  deleteProject: async () => {},
  updateProfile: async (_userId, input) => ({ ...testUser, ...input }),
  changePassword: async () => {},
  listBugTemplates: async () => [],
  createBugTemplate: async (_userId, input) => ({
    id: "1",
    ...input,
    createdAt: "2026-01-01T00:00:00.000Z",
  }),
  updateBugTemplate: async (_userId, templateId, input) => ({
    id: templateId,
    ...input,
    createdAt: "2026-01-01T00:00:00.000Z",
  }),
  deleteBugTemplate: async () => {},
  deactivateAccount: async () => {},
};
