import { Component, type ReactNode } from "react";
import Alert from "./Alert";

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="error-boundary">
        <Alert tone="error">
          No se pudo mostrar esta pantalla. Recarga la aplicación para volver a intentarlo. Los
          registros guardados se conservan.
        </Alert>
        <button className="button button-primary" onClick={() => window.location.reload()}>
          Recargar aplicación
        </button>
      </main>
    );
  }
}
