import { useState } from "react";
import Dialog from "../Dialog";

export default function ClearDesignerButton({
  disabled,
  onClear,
}: {
  disabled: boolean;
  onClear: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <button
        className="button button-secondary"
        type="button"
        disabled={disabled}
        onClick={() => setConfirm(true)}
      >
        Limpiar ventana
      </button>
      {confirm && (
        <Dialog confirmation title="Limpiar ventana" onClose={() => setConfirm(false)}>
          <p>
            Se descartarán los cambios de esta vista. Los registros y borradores ya guardados
            seguirán disponibles.
          </p>
          <div className="layout__actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setConfirm(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="button button-primary"
              disabled={disabled}
              onClick={() => {
                setConfirm(false);
                onClear();
              }}
            >
              Confirmar limpieza
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
