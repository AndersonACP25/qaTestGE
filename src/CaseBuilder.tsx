import { useState } from "react";
import type { FormEvent } from "react";

import { categories, maxCaseCount, selectCaseExamples, validCaseCount } from "./utils/caseCatalog";

export default function CaseBuilder() {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>(["edge"]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const selectedCategories = selectCaseExamples(selected, counts);
  const countsValid = selected.every((id) => validCaseCount(counts[id] ?? 1));
  const total = selectedCategories.reduce((sum, category) => sum + category.steps.length, 0);

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
    if (text.trim() && selected.length && countsValid) setPreview(true);
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
          <div className="case-builder__options">{categories.map((category) => <div key={category.id} className={`case-builder__option${selected.includes(category.id) ? " case-builder__option--selected" : ""}`}>
            <label className="case-builder__choice">
              <input className="case-builder__checkbox" type="checkbox" checked={selected.includes(category.id)} onChange={(event) => { setSelected((items) => event.target.checked ? [...items, category.id] : items.filter((id) => id !== category.id)); setPreview(false); setExportError(""); }} />
              <span><strong>{category.label}</strong><small>{category.description}</small></span>
            </label>
            <label className="case-builder__quantity" htmlFor={`case-count-${category.id}`}>Cantidad
              <input id={`case-count-${category.id}`} className="case-builder__count" type="number" min={1} max={maxCaseCount} step={1} required disabled={!selected.includes(category.id)} value={Number.isNaN(counts[category.id]) ? "" : counts[category.id] ?? 1} aria-label={`Cantidad de pruebas: ${category.label}`} aria-describedby="case-count-help" onChange={(event) => { const value = event.target.valueAsNumber; setCounts((items) => ({ ...items, [category.id]: value })); setPreview(false); setExportError(""); }} />
            </label>
          </div>)}</div>
          <p id="case-count-help" className="case-builder__hint">De 1 a {maxCaseCount} pruebas distintas por categoría: son los ejemplos disponibles, sin generación con IA.</p>
          {!countsValid && <p role="alert">Introduce una cantidad entera entre 1 y {maxCaseCount} para cada categoría seleccionada.</p>}
        </fieldset>
        <button className="case-builder__submit" type="submit" disabled={!text.trim() || !selected.length || !countsValid}>Mostrar tabla de ejemplo →</button>
        <p className="case-builder__hint">En el futuro, aquí podrás solicitar propuestas de IA y revisarlas antes de guardarlas.</p>
      </form>
      <section className="case-builder__results" aria-labelledby="case-builder-results">
        <div className="case-builder__heading"><span className="case-builder__step">03</span><div><h2 id="case-builder-results">Acción y resultado esperado</h2><p>{preview ? `${total} pruebas de ejemplo · sin guardar` : "Tu vista previa aparecerá aquí."}</p></div></div>
        <div aria-live="polite">{preview ? <>
          <p className="case-builder__preview-note">Contenido fijo ilustrativo sobre un sistema hipotético. Cada fila representa una prueba de ejemplo; no se ejecuta ninguna prueba.</p>
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
