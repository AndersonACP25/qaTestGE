import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
const SuccessHost = createContext<HTMLDivElement | null>(null);
export function SuccessAlertsProvider({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  return (
    <SuccessHost.Provider value={host}>
      {children}
      <div ref={setHost} className="success-alerts" aria-label="Confirmaciones de acciones" />
    </SuccessHost.Provider>
  );
}
export function FloatingSuccess({
  children,
  onDismiss,
}: {
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const host = useContext(SuccessHost);
  const [dismissed, setDismissed] = useState(false);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    if (!host || dismissed) return;
    const timer = window.setTimeout(() => {
      setDismissed(true);
      dismiss.current?.();
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [host, dismissed]);
  if (dismissed || !host) return null;
  return createPortal(
    <div className="success-alerts__item">
      {children}
      <button
        className="success-alerts__close"
        type="button"
        aria-label="Ocultar confirmación"
        onClick={() => {
          setDismissed(true);
          onDismiss?.();
        }}
      >
        ×
      </button>
    </div>,
    host,
  );
}
