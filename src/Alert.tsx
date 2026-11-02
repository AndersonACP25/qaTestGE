import { FloatingSuccess } from "./components/SuccessAlerts";
import { Children, isValidElement, type ReactNode } from "react";

function contentKey(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? contentKey(child.props.children)
        : String(child ?? ""),
    )
    .join("|");
}
export type AlertTone = "success" | "error" | "warning" | "info";

export default function Alert({
  tone,
  children,
  title,
  onDismiss,
  className = "",
}: {
  tone: AlertTone;
  children: ReactNode;
  title?: string;
  onDismiss?: () => void;
  className?: string;
}) {
  const label =
    title ??
    {
      success: "Correcto",
      error: "No se pudo completar",
      warning: "Atención",
      info: "Información",
    }[tone];
  const Icon = () => {
    if (tone === "success") return <path d="m5 12 4 4L19 6" />;
    if (tone === "error") return <path d="M12 8v5m0 3h.01M5.6 18h12.8L12 6 5.6 18Z" />;
    if (tone === "warning") return <path d="M12 8v5m0 3h.01M4.8 19h14.4L12 5 4.8 19Z" />;
    return (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 11v5m0-8h.01" />
      </>
    );
  };

  const alert = (
    <div
      className={`alert alert--${tone}${className ? ` ${className}` : ""}`}
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
      aria-live={tone === "error" || tone === "warning" ? "assertive" : "polite"}
    >
      <svg className="alert__icon" viewBox="0 0 24 24" aria-hidden="true">
        <Icon />
      </svg>
      <div className="alert__content">
        <strong className="alert__title">{label}</strong>
        <div className="alert__message">{children}</div>
      </div>
      {onDismiss && tone !== "success" && (
        <button
          className="alert__dismiss"
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar alerta"
        >
          ×
        </button>
      )}
    </div>
  );
  return tone === "success" ? (
    <FloatingSuccess key={`${label}:${contentKey(children)}`} onDismiss={onDismiss}>
      {alert}
    </FloatingSuccess>
  ) : (
    alert
  );
}
