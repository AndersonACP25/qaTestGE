import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export default function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("input,textarea,select,button")?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key !== "Tab") return;
      const items = [...(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]') ?? [])];
      if (!items.length) { event.preventDefault(); panel.current?.focus(); return; }
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
      if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener("keydown", handle);
    return () => { document.removeEventListener("keydown", handle); previous?.focus(); };
  }, []);
  return <div className="workspace__backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="workspace__dialog" ref={panel} role="dialog" aria-modal="true" aria-labelledby="workspace-dialog-title" tabIndex={-1}>
      <div className="workspace__dialog-heading"><h2 id="workspace-dialog-title">{title}</h2><button type="button" className="workspace__close" aria-label="Cerrar ventana" onClick={onClose}>×</button></div>
      {children}
    </div>
  </div>;
}
