import ErrorBoundary from "./ErrorBoundary";
import React from "react";
import { createRoot } from "react-dom/client";
import Session from "./Session";
import "./typography.css";
import "./styles.css";
import "./controls.css";
import "./spacing.css";
import "./views/inbox.css";
import "./views/editor-layout.css";
import "./views/work-items.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("No se encontró el elemento raíz de la aplicación.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Session />
    </ErrorBoundary>
  </React.StrictMode>,
);
