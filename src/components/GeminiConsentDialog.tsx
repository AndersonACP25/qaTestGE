import type { ReactNode } from "react";
import Dialog from "../Dialog";
import { Icon } from "./RecordPrimitives";
import "./gemini-consent.css";

export function GeminiOutboundText({ label, text }: { label: string; text: string }) {
  return (
    <div className="gemini-consent__text">
      <strong>{label}</strong>
      <p>{text}</p>
    </div>
  );
}

export default function GeminiConsentDialog({
  children,
  onClose,
  onConfirm,
  disabled = false,
}: {
  children: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  return (
    <Dialog confirmation title="Enviar texto a Gemini" onClose={onClose}>
      <div className="gemini-consent">
        <div className="gemini-consent__intro">
          <span className="gemini-consent__icon" aria-hidden="true">
            <Icon name="sparkle" size={23} />
          </span>
          <div>
            <strong>Google Gemini</strong>
            <p>Revisa la solicitud antes de enviarla.</p>
          </div>
        </div>
        <div className="gemini-consent__payload">{children}</div>
        <div className="gemini-consent__privacy">
          <strong>Privacidad</strong>
          <p>
            Retira credenciales y datos sensibles antes de continuar. Podrás revisar y editar la
            propuesta antes de guardar.
          </p>
        </div>
        <div className="gemini-consent__actions">
          <button type="button" className="button button-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="button button--ai"
            disabled={disabled}
            onClick={onConfirm}
          >
            Enviar y generar propuesta
          </button>
        </div>
      </div>
    </Dialog>
  );
}
