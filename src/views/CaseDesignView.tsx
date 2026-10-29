import type { CaseDesignController } from "../controllers/useCaseDesignController";
import Alert from "../Alert";

export default function CaseDesignView({
  categories,
  text,
  selected,
  counts,
  defaultCounts,
  preview,
  exporting,
  exportError,
  savingCaseKey,
  savedCases,
  saveCaseError,
  projectId,
  previewCases,
  countsValid,
  total,
  maxCaseCount,
  updateDescription,
  toggleCategory,
  updateCount,
  submit,
  updateExampleStep,
  addExampleStep,
  removeExampleStep,
  exportPreview,
  savePreviewCase,
}: CaseDesignController) {
  return (
    <section className="case-builder" aria-label="Maqueta de diseño de casos de prueba">
      <div className="case-builder__notice">
        <strong>Maqueta interactiva · IA no conectada</strong>
        <p>
          Prueba el flujo con texto de ejemplo. Los casos iniciales son ilustrativos; puedes editar
          y añadir pasos. No se analiza tu descripción ni se generan propuestas; cada caso solo se
          crea en el proyecto cuando eliges guardarlo.
        </p>
      </div>
      <div className="case-builder__layout">
        <form className="case-builder__form" onSubmit={submit}>
          <div className="case-builder__heading">
            <span className="case-builder__step">01</span>
            <div>
              <h2>Describe qué quieres probar</h2>
              <p>Una historia de usuario, un requisito o un flujo.</p>
            </div>
          </div>
          <label className="case-builder__label" htmlFor="case-builder-description">
            Descripción o requisito
          </label>
          <textarea
            id="case-builder-description"
            className="case-builder__input"
            value={text}
            onChange={(event) => updateDescription(event.target.value)}
            placeholder="Ej.: Una persona puede registrarse con su nombre, correo y contraseña. Los campos son obligatorios y el correo debe ser único."
            rows={7}
            required
            aria-describedby="case-builder-help"
          />
          <div className="case-builder__input-footer">
            <small id="case-builder-help">Usa información ficticia, sin datos sensibles.</small>
            <span>{text.length} caracteres</span>
          </div>
          <button
            className="case-builder__example"
            type="button"
            onClick={() =>
              updateDescription(
                "Una persona puede registrarse con su nombre, correo y contraseña. Los campos son obligatorios y el correo debe ser único.",
              )
            }
          >
            Usar descripción de ejemplo ↗
          </button>
          <fieldset className="case-builder__fieldset">
            <legend>02 · Selecciona los tipos de prueba</legend>
            <p className="case-builder__hint">Puedes combinar varias categorías.</p>
            <div className="case-builder__options">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`case-builder__option${selected.includes(category.id) ? " case-builder__option--selected" : ""}`}
                  style={{ borderInlineStart: `4px solid ${category.color}` }}
                >
                  <label className="case-builder__choice">
                    <input
                      className="case-builder__checkbox"
                      style={{ accentColor: category.color }}
                      type="checkbox"
                      checked={selected.includes(category.id)}
                      onChange={(event) => toggleCategory(category.id, event.target.checked)}
                    />
                    <span>
                      <strong>{category.label}</strong>
                      <small>{category.description}</small>
                    </span>
                  </label>
                  <label className="case-builder__quantity" htmlFor={`case-count-${category.id}`}>
                    Cantidad
                    <input
                      id={`case-count-${category.id}`}
                      className="case-builder__count"
                      type="number"
                      min={1}
                      max={maxCaseCount}
                      step={1}
                      required
                      disabled={!selected.includes(category.id)}
                      value={
                        Number.isNaN(counts[category.id])
                          ? ""
                          : (counts[category.id] ?? defaultCounts[category.id] ?? 1)
                      }
                      aria-label={`Cantidad de pruebas: ${category.label}`}
                      aria-describedby="case-count-help"
                      onChange={(event) => updateCount(category.id, event.target.valueAsNumber)}
                    />
                  </label>
                </div>
              ))}
            </div>
            <p id="case-count-help" className="case-builder__hint">
              De 1 a {maxCaseCount} pruebas distintas por categoría: son los ejemplos disponibles,
              sin generación con IA.
            </p>
            {!countsValid && (
              <Alert tone="warning">
                Introduce una cantidad entera entre 1 y {maxCaseCount} para cada categoría
                seleccionada.
              </Alert>
            )}
          </fieldset>
          <button
            className="case-builder__submit"
            type="submit"
            disabled={!text.trim() || !selected.length || !countsValid}
          >
            Mostrar tabla de ejemplo →
          </button>
          <p className="case-builder__hint">
            En el futuro, aquí podrás solicitar propuestas de IA y revisarlas antes de guardarlas.
          </p>
        </form>
        <section className="case-builder__results" aria-labelledby="case-builder-results">
          <div className="case-builder__heading">
            <span className="case-builder__step">03</span>
            <div>
              <h2 id="case-builder-results">Pasos y resultados esperados</h2>
              <p>
                {preview
                  ? `${total} casos de ejemplo · guardado manual`
                  : "Tu vista previa aparecerá aquí."}
              </p>
            </div>
          </div>
          <div aria-live="polite">
            {preview ? (
              <>
                <p className="case-builder__preview-note">
                  Ejemplos ilustrativos sobre un sistema hipotético. Cada caso puede tener hasta 100
                  pasos con su resultado esperado; guárdalo explícitamente para crear un caso real.
                </p>
                <div className="case-builder__exports">
                  <button
                    type="button"
                    className="case-builder__export case-builder__export--markdown"
                    disabled={exporting}
                    onClick={() => void exportPreview("md")}
                  >
                    Exportar Markdown
                  </button>
                  <button
                    type="button"
                    className="case-builder__export case-builder__export--excel"
                    disabled={exporting}
                    onClick={() => void exportPreview("xlsx")}
                  >
                    Exportar Excel
                  </button>
                  <button
                    type="button"
                    className="case-builder__export case-builder__export--pdf"
                    disabled={exporting}
                    onClick={() => void exportPreview("pdf")}
                  >
                    Exportar PDF
                  </button>
                </div>
                {exporting && <p role="status">Preparando archivo…</p>}
                {exportError && <Alert tone="error">{exportError}</Alert>}
                {saveCaseError && <Alert tone="error">{saveCaseError}</Alert>}
                {previewCases.map((testCase) => (
                  <section
                    className="case-builder__case"
                    key={`${testCase.categoryId}:${testCase.caseNumber}`}
                  >
                    <h3
                      className="case-builder__case-title"
                      style={{ borderInlineStartColor: testCase.color }}
                    >
                      {testCase.categoryLabel} · Caso de ejemplo {testCase.caseNumber}
                    </h3>
                    <div className="case-builder__steps">
                      {testCase.steps.map((step, index) => (
                        <fieldset className="case-builder__step-card" key={index}>
                          <legend>Paso {index + 1}</legend>
                          <label className="case-builder__label">
                            Acción
                            <textarea
                              className="case-builder__input"
                              rows={2}
                              value={step.action}
                              onChange={(event) =>
                                updateExampleStep(
                                  testCase.categoryId,
                                  testCase.caseNumber,
                                  index,
                                  "action",
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                          <label className="case-builder__label">
                            Resultado esperado
                            <textarea
                              className="case-builder__input"
                              rows={2}
                              value={step.expected}
                              onChange={(event) =>
                                updateExampleStep(
                                  testCase.categoryId,
                                  testCase.caseNumber,
                                  index,
                                  "expected",
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                          <button
                            type="button"
                            className="case-builder__remove-step"
                            disabled={testCase.steps.length <= 1}
                            onClick={() =>
                              removeExampleStep(testCase.categoryId, testCase.caseNumber, index)
                            }
                          >
                            Eliminar paso
                          </button>
                        </fieldset>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="case-builder__add-step"
                      disabled={testCase.steps.length >= 100}
                      onClick={() => addExampleStep(testCase.categoryId, testCase.caseNumber)}
                    >
                      Añadir paso ({testCase.steps.length}/100)
                    </button>
                    <button
                      type="button"
                      className={`case-builder__save-case${savedCases[`${testCase.categoryId}:${testCase.caseNumber}`] ? " case-builder__save-case--saved" : ""}`}
                      disabled={!projectId || Boolean(savingCaseKey)}
                      onClick={() => void savePreviewCase(testCase)}
                    >
                      {savedCases[`${testCase.categoryId}:${testCase.caseNumber}`]
                        ? `Actualizar ${savedCases[`${testCase.categoryId}:${testCase.caseNumber}`].id} con todos los pasos`
                        : savingCaseKey === `${testCase.categoryId}:${testCase.caseNumber}`
                          ? "Guardando…"
                          : "Guardar en casos de prueba"}
                    </button>
                  </section>
                ))}
                <p className="case-builder__hint">
                  La vista previa y las exportaciones reflejan los pasos editados. Solo se guardan
                  los casos en los que pulses «Guardar en casos de prueba».
                </p>
              </>
            ) : (
              <div className="case-builder__empty">
                <span className="case-builder__empty-icon" aria-hidden="true">
                  ▤
                </span>
                <h3>Visualiza tu próximo plan de pruebas</h3>
                <p>
                  Escribe una descripción, marca los tipos de prueba y pulsa «Mostrar tabla de
                  ejemplo» para recorrer la maqueta.
                </p>
                <span className="case-builder__badge">Vista previa · sin generación real</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
