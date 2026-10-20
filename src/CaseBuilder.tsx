import { useState } from "react";
import type { FormEvent } from "react";

export const categories = [
  { id: "edge", label: "Edge cases", description: "Límites, entradas vacías y situaciones inesperadas.", steps: [
    { action: "Enviar el formulario de registro con los campos obligatorios vacíos.", expected: "Se indican los campos requeridos y no se crea la cuenta." },
    { action: "Ingresar un nombre que exceda la longitud máxima permitida.", expected: "Se muestra una validación clara y se conserva el resto de los datos." },
  ] },
  { id: "exploratory", label: "Exploratory", description: "Recorridos libres para descubrir comportamientos.", steps: [
    { action: "Explorar el registro alternando entre teclado, ratón y navegación hacia atrás.", expected: "El flujo mantiene un orden de foco coherente y permite corregir los datos." },
    { action: "Cambiar el tamaño de la pantalla mientras se completa el registro.", expected: "Los campos y mensajes permanecen visibles y utilizables." },
  ] },
  { id: "stress", label: "Pruebas de estrés", description: "Carga elevada, capacidad y recuperación.", steps: [
    { action: "En un entorno de pruebas autorizado, aumentar progresivamente las solicitudes de registro concurrentes.", expected: "Se miden errores y latencia frente a los umbrales acordados para el entorno." },
    { action: "Reducir la carga después de alcanzar el límite definido para la prueba.", expected: "El servicio recupera su nivel esperado y mantiene la integridad de los datos." },
  ] },
  { id: "api", label: "API", description: "Contratos, respuestas y validaciones del servicio.", steps: [
    { action: "Enviar una solicitud de registro válida al endpoint definido en el contrato de la API.", expected: "La respuesta cumple el código y esquema acordados sin exponer la contraseña." },
    { action: "Enviar una solicitud de registro omitiendo un atributo obligatorio.", expected: "La API devuelve un error de validación según el contrato y no crea el recurso." },
  ] },
] as const;

export default function CaseBuilder() {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>(["edge"]);
  const [preview, setPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const selectedCategories = categories.filter((category) => selected.includes(category.id));

  async function exportPreview(format: "xlsx" | "pdf") {
    setExporting(true);
    setExportError("");
    try {
      const { downloadCaseExport } = await import("./utils/exportCases");
      await downloadCaseExport(format, text, selectedCategories);
    } catch {
      setExportError("No se pudo exportar el archivo. Inténtalo de nuevo.");
    } finally { setExporting(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (text.trim() && selected.length) setPreview(true);
  }

  return <section className="case-builder" aria-label="Maqueta de diseño de casos de prueba">
    <div className="case-builder__notice"><strong>Maqueta interactiva · IA no conectada</strong><p>Prueba el flujo con texto de ejemplo. La tabla contiene ejemplos fijos sobre un registro de usuario; no se analiza tu descripción ni se crean casos en el proyecto.</p></div>
    <div className="case-builder__layout">
      <form className="case-builder__form" onSubmit={submit}>
        <div className="case-builder__heading"><span className="case-builder__step">01</span><div><h2>Describe qué quieres probar</h2><p>Una historia de usuario, un requisito o un flujo.</p></div></div>
        <label className="case-builder__label" htmlFor="case-builder-description">Descripción o requisito</label>
        <textarea id="case-builder-description" className="case-builder__input" value={text} onChange={(event) => { setText(event.target.value); setPreview(false); }} placeholder="Ej.: Una persona puede registrarse con su nombre, correo y contraseña. Los campos son obligatorios y el correo debe ser único." rows={7} required aria-describedby="case-builder-help" />
        <div className="case-builder__input-footer"><small id="case-builder-help">Usa información ficticia, sin datos sensibles.</small><span>{text.length} caracteres</span></div>
        <button className="case-builder__example" type="button" onClick={() => { setText("Una persona puede registrarse con su nombre, correo y contraseña. Los campos son obligatorios y el correo debe ser único."); setPreview(false); }}>Usar descripción de ejemplo ↗</button>
        <fieldset className="case-builder__fieldset"><legend>02 · Selecciona los tipos de prueba</legend><p className="case-builder__hint">Puedes combinar varias categorías.</p>
          <div className="case-builder__options">{categories.map((category) => <label key={category.id} className={`case-builder__option${selected.includes(category.id) ? " case-builder__option--selected" : ""}`}>
            <input type="checkbox" checked={selected.includes(category.id)} onChange={(event) => { setSelected((items) => event.target.checked ? [...items, category.id] : items.filter((id) => id !== category.id)); setPreview(false); }} />
            <span><strong>{category.label}</strong><small>{category.description}</small></span>
          </label>)}</div>
        </fieldset>
        <button className="case-builder__submit" type="submit" disabled={!text.trim() || !selected.length}>Mostrar tabla de ejemplo →</button>
        <p className="case-builder__hint">En el futuro, aquí podrás solicitar propuestas de IA y revisarlas antes de guardarlas.</p>
      </form>
      <section className="case-builder__results" aria-labelledby="case-builder-results">
        <div className="case-builder__heading"><span className="case-builder__step">03</span><div><h2 id="case-builder-results">Acción y resultado esperado</h2><p>{preview ? `${selectedCategories.length * 2} pasos de ejemplo · sin guardar` : "Tu vista previa aparecerá aquí."}</p></div></div>
        <div aria-live="polite">{preview ? <>
          <p className="case-builder__preview-note">Contenido fijo ilustrativo. Las pruebas de API y estrés describen un sistema hipotético; no se ejecuta ninguna prueba.</p>
          <div className="case-builder__exports">
            <button type="button" className="case-builder__export" disabled={exporting} onClick={() => void exportPreview("xlsx")}>Exportar Excel</button>
            <button type="button" className="case-builder__export" disabled={exporting} onClick={() => void exportPreview("pdf")}>Exportar PDF</button>
          </div>
          {exporting && <p role="status">Preparando archivo…</p>}
          {exportError && <p role="alert">{exportError}</p>}
          {selectedCategories.map((category) => <div className="case-builder__table-wrap" key={category.id}><table className="case-builder__table"><caption>{category.label} · Ejemplo de registro</caption><thead><tr><th scope="col">Acción</th><th scope="col">Resultado esperado</th></tr></thead><tbody>{category.steps.map((step) => <tr key={step.action}><td>{step.action}</td><td>{step.expected}</td></tr>)}</tbody></table></div>)}
          <p className="case-builder__hint">La revisión, edición y creación de casos reales estarán disponibles en una etapa futura.</p>
        </> : <div className="case-builder__empty"><span className="case-builder__empty-icon" aria-hidden="true">▤</span><h3>Visualiza tu próximo plan de pruebas</h3><p>Escribe una descripción, marca los tipos de prueba y pulsa «Mostrar tabla de ejemplo» para recorrer la maqueta.</p><span className="case-builder__badge">Vista previa · sin generación real</span></div>}</div>
      </section>
    </div>
  </section>;
}
