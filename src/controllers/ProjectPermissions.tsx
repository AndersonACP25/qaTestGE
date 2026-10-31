import { createContext, useContext, type ReactNode } from "react";
import {
  can,
  type Permission,
  type ProjectRole,
} from "../../backend/src/models/collaboration.model";
const Permissions = createContext<ProjectRole>("Solo lectura");
export function ProjectPermissionsProvider({
  role,
  children,
}: {
  role: ProjectRole;
  children: ReactNode;
}) {
  return <Permissions.Provider value={role}>{children}</Permissions.Provider>;
}
export function usePermissions() {
  const role = useContext(Permissions);
  return { role, can: (p: Permission) => can(role, p) };
}
