import { useLayoutEffect, useMemo, useRef } from "react";

/** Tokens expire on scope changes, even if the user returns to the same project. */
export function useOperationScope(userId: string, projectId: string) {
  const token = useMemo(() => ({ userId, projectId }), [userId, projectId]);
  const active = useRef<object | null>(null);
  useLayoutEffect(() => {
    active.current = token;
    return () => {
      active.current = null;
    };
  }, [token]);
  return () => () => active.current === token;
}
