import type { Project } from "../repositories/repository.js";

export interface User { id: string; name: string; email: string }
export interface AuthState { user: User; csrfToken: string }
export interface AuthGrant extends AuthState { token: string; expiresAt: Date }
export interface RegistrationInput { name: string; email: string; password: string }
export interface UpdateProfileInput { name: string; email: string }
export interface AuthProvider {
  register(input: RegistrationInput, previousToken?: string): Promise<AuthGrant>;
  login(email: string, password: string, previousToken?: string): Promise<AuthGrant>;
  authenticate(token: string): Promise<AuthState | null>;
  logout(token: string): Promise<void>;
  projects(userId: string): Promise<Project[]>;
  updateProfile(userId: string, input: UpdateProfileInput): Promise<User>;
  changePassword(userId: string, currentPassword: string, newPassword: string, currentToken: string): Promise<void>;
}
