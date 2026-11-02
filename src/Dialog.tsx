import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

export default function Dialog({
  title,
  children,
  onClose,
  wide = false,
  confirmation = false,
  workItem = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  confirmation?: boolean;
  workItem?: boolean;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("input,textarea,select,button")?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
      if (event.key !== "Tab") return;
      const items = [
        ...(panel.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]',
        ) ?? []),
        ...document.querySelectorAll<HTMLElement>(
          ".success-alerts button:not(:disabled),.success-alerts a[href]",
        ),
      ].filter((item) => item.getClientRects().length > 0 && !item.matches(":disabled"));
      if (!items.length) {
        event.preventDefault();
        panel.current?.focus();
        return;
      }
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault();
        items.at(-1)?.focus();
      }
      if (!event.shiftKey && document.activeElement === items.at(-1)) {
        event.preventDefault();
        items[0].focus();
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div
      className="workspace__backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`workspace__dialog${wide ? " workspace__dialog--wide" : ""}${confirmation ? " workspace__dialog--confirmation" : ""}${workItem ? " workspace__dialog--work-item" : ""}`}
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="workspace__dialog-heading">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="workspace__close"
            aria-label="Cerrar ventana"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="workspace__dialog-body">{children}</div>
      </div>
    </div>
  );
}
