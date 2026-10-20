import React from "react";
import { createRoot } from "react-dom/client";
import Session from "./Session";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("No se encontró el elemento raíz de la aplicación.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <Session />
  </React.StrictMode>,
);
