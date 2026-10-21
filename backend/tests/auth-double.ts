import type { AuthProvider } from "../src/auth/auth.js";
export const testToken = "a".repeat(64);
export const testCsrf = "b".repeat(64);
export const testUser = { id: "1", name: "QA", email: "qa@example.test" };
export const testAuth: AuthProvider = {
  register: async () => { throw new Error("not used"); },
  login: async () => { throw new Error("not used"); },
  authenticate: async (token) => token === testToken ? { user: testUser, csrfToken: testCsrf } : null,
  logout: async () => {},
  projects: async () => [{ id: "1", organizationId: "1", name: "Web Store", description: "" }],
};
