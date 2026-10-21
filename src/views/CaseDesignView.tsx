import { categories } from "../models/caseDesign.model";
import type { CaseDesignController } from "../controllers/useCaseDesignController";

export default function CaseDesignView({
  text, selected, counts, preview, exporting, exportError, selectedCategories,
  countsValid, total, maxCaseCount, updateDescription, toggleCategory, updateCount, submit, exportPreview,
}: CaseDesignController) {
  return <section className="case-builder" aria-label="Maqueta de diseño de casos de prueba">
    <div className="case-builder__notice"><strong>Maqueta interactiva · IA no conectada</strong><p>Prueba el flujo con texto de ejemplo. La tabla contiene ejemplos fijos sobre un registro de usuario; no se analiza tu descripción ni se crean casos en el proyecto.</p></div>
    <div className="case-builder__layout">
      <form className="case-builder__form" onSubmit={submit}>
        <div className="case-builder__heading"><span className="case-builder__step">01</span><div><h2>Describe qué quieres probar</h2><p>Una historia de usuario, un requisito o un flujo.</p></div></div>
        <label className="case-builder__label" htmlFor="case-builder-description">Descripción o requisito</label>
        <textarea id="case-builder-description" className="case-builder__input" value={text} onChange={(event) => updateDescription(event.target.value)} placeholder="Ej.: Una persona puede registrarse con su nombre, correo y contraseña. Los campos son obligatorios y el correo debe ser único." rows={7} required aria-describedby="case-builder-help" />
        <div className="case-builder__input-footer"><small id="case-builder-help">Usa información ficticia, sin datos sensibles.</small><span>{text.length} caracteres</span></div>
        <button className="case-builder__example" type="button" onClick={() => updateDescription("Una persona puede registrarse con su nombre, correo y contraseña. Los campos son obligatorios y el correo debe ser único.")}>Usar descripción de ejemplo ↗</button>
        <fieldset className="case-builder__fieldset"><legend>02 · Selecciona los tipos de prueba</legend><p className="case-builder__hint">Puedes combinar varias categorías.</p>
          <div className="case-builder__options">{categories.map((category) => <div key={category.id} className={`case-builder__option${selected.includes(category.id) ? " case-builder__option--selected" : ""}`} style={{ borderInlineStart: `4px solid ${category.color}` }}>
            <label className="case-builder__choice">
              <input className="case-builder__checkbox" style={{ accentColor: category.color }} type="checkbox" checked={selected.includes(category.id)} onChange={(event) => toggleCategory(category.id, event.target.checked)} />
              <span><strong>{category.label}</strong><small>{category.description}</small></span>
            </label>
            <label className="case-builder__quantity" htmlFor={`case-count-${category.id}`}>Cantidad
              <input id={`case-count-${category.id}`} className="case-builder__count" type="number" min={1} max={maxCaseCount} step={1} required disabled={!selected.includes(category.id)} value={Number.isNaN(counts[category.id]) ? "" : counts[category.id] ?? 1} aria-label={`Cantidad de pruebas: ${category.label}`} aria-describedby="case-count-help" onChange={(event) => updateCount(category.id, event.target.valueAsNumber)} />
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
          {selectedCategories.map((category) => <div className="case-builder__table-wrap" key={category.id}><table className="case-builder__table"><caption style={{ backgroundColor: category.color, color: "#fff" }}>{category.label} · Ejemplo de registro</caption><thead><tr><th scope="col">Acción</th><th scope="col">Resultado esperado</th></tr></thead><tbody>{category.steps.map((step) => <tr key={step.action}><td>{step.action}</td><td>{step.expected}</td></tr>)}</tbody></table></div>)}
          <p className="case-builder__hint">La revisión, edición y creación de casos reales estarán disponibles en una etapa futura.</p>
        </> : <div className="case-builder__empty"><span className="case-builder__empty-icon" aria-hidden="true">▤</span><h3>Visualiza tu próximo plan de pruebas</h3><p>Escribe una descripción, marca los tipos de prueba y pulsa «Mostrar tabla de ejemplo» para recorrer la maqueta.</p><span className="case-builder__badge">Vista previa · sin generación real</span></div>}</div>
      </section>
    </div>
  </section>;
}
