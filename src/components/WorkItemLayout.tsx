import { useEffect, useRef, type ReactNode } from "react";
const labels = { bug: "Bug", case: "Test Case", run: "Test Run", evidence: "Evidencia" };
export default function WorkItemLayout({
  kind,
  id,
  title,
  status,
  fields,
  anchors,
  actions,
  children,
  editing = false,
}: {
  kind: keyof typeof labels;
  id: string;
  title: string;
  status: string;
  fields: { label: string; value: ReactNode }[];
  anchors: { label: string; selector: string }[];
  actions?: ReactNode;
  children: ReactNode;
  editing?: boolean;
}) {
  const content = useRef<HTMLDivElement>(null);
  const frame = useRef<number>();
  useEffect(
    () => () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    },
    [],
  );
  return (
    <article className={`work-item work-item--${kind}${editing ? " work-item--editing" : ""}`}>
      <header className="work-item__heading">
        <div className="work-item__identity">
          <div className="work-item__type">
            <span className="work-item__type-dot" />
            {labels[kind]}
            <span className="record-view__id work-item__id">{id}</span>
          </div>
          <h3>{title}</h3>
        </div>
        {actions && <div className="work-item__actions">{actions}</div>}
      </header>
      <nav className="work-item__navigation" aria-label="Secciones del Work Item">
        {anchors.map((anchor) => (
          <button
            type="button"
            key={anchor.label}
            onClick={() => {
              const section = content.current?.querySelector<HTMLElement>(anchor.selector);
              if (section instanceof HTMLDetailsElement) section.open = true;
              if (frame.current !== undefined) cancelAnimationFrame(frame.current);
              frame.current = requestAnimationFrame(() => {
                const body = content.current?.closest<HTMLElement>(".workspace__dialog-body");
                if (!section || !body || !section.isConnected) return;
                const top =
                  body.scrollTop +
                  section.getBoundingClientRect().top -
                  body.getBoundingClientRect().top -
                  16;
                body.scrollTo({
                  top: Math.max(0, Math.min(top, body.scrollHeight - body.clientHeight)),
                  behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                    ? "instant"
                    : "smooth",
                });
              });
            }}
          >
            {anchor.label}
          </button>
        ))}
      </nav>
      <div className="work-item__layout">
        <div className="work-item__content" ref={content}>
          {children}
        </div>
        <aside className="work-item__properties" aria-label="Propiedades del Work Item">
          <h4>Propiedades</h4>
          <dl>
            <div>
              <dt>Estado</dt>
              <dd>
                <span className="work-item__status">{status}</span>
              </dd>
            </div>
            {fields.map((field) => (
              <div key={field.label}>
                <dt>{field.label}</dt>
                <dd>{field.value ?? "Sin indicar"}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </article>
  );
}
