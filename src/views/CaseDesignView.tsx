import { useState } from "react";
import GeminiConsentDialog, { GeminiOutboundText } from "../components/GeminiConsentDialog";
import { maxAiCases } from "../../backend/src/models/case-proposal.model";
import DesignEvidencePanel from "./DesignEvidencePanel";
import RichTextarea from "../components/RichTextarea";
import type { CaseDesignController } from "../controllers/useCaseDesignController";
import { formatCount } from "../utils/pluralization";
import Alert from "../Alert";

export default function CaseDesignView({
  canProposeWithGemini,
  categories,
  text,
  selected,
  counts,
  defaultCounts,
  preview,
  generated,
  generating,
  generationError,
  generationInput,
  generateCases,
  updateTitle,
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
}: CaseDesignController & { canProposeWithGemini: boolean }) {
  const [consentOpen, setConsentOpen] = useState(false);
  const locked = generating || Boolean(savingCaseKey);
  const canGenerate = canProposeWithGemini && Boolean(generationInput) && countsValid && !locked;

  return (
    <section className="case-builder" aria-label="Diseño de casos de prueba">
      <div className="case-builder__notice">
        <strong>
          {canProposeWithGemini ? "Diseño de casos de prueba" : "Ejemplos de casos de prueba"}
        </strong>
        <p>
          {canProposeWithGemini
            ? "Usa ejemplos locales o solicita casos a Gemini a partir de tu descripción."
            : "Explora los ejemplos disponibles y adapta los pasos a tu proyecto."}{" "}
          Revisa cada caso antes de guardarlo.
        </p>
      </div>
      <div className="case-builder__layout">
        <form className="case-builder__form" onSubmit={submit}>
          <div className="case-builder__heading">
            <span className="case-builder__step">01</span>
            <div>
              <h2 className="typography__section">Describe qué quieres probar</h2>
              <p>Una historia de usuario, un requisito o un flujo.</p>
            </div>
          </div>
          <label className="case-builder__label" htmlFor="case-builder-description">
            Descripción o requisito
          </label>
          <RichTextarea
            id="case-builder-description"
            className="case-builder__input"
            value={text}
            onChange={(event) => updateDescription(event.target.value)}
            placeholder="Ej.: Una persona puede registrarse con su nombre, correo y contraseña. Los campos son obligatorios y el correo debe ser único."
            rows={7}
            disabled={locked}
            required
            aria-describedby="case-builder-help"
          />
          <div className="case-builder__input-footer">
            <small id="case-builder-help">Usa información ficticia, sin datos sensibles.</small>
            <span>{formatCount(text.length, "carácter", "caracteres")}</span>
          </div>
          <button
            className="case-builder__example"
            disabled={locked}
            type="button"
            onClick={() =>
              updateDescription(
                "Una persona puede registrarse con su nombre, correo y contraseña. Los campos son obligatorios y el correo debe ser único.",
              )
            }
          >
            Usar descripción de ejemplo ↗
          </button>
          <fieldset className="case-builder__fieldset" disabled={locked}>
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
              De 1 a {maxCaseCount} pruebas por categoría.
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
            disabled={!text.trim() || !selected.length || !countsValid || locked}
          >
            Mostrar tabla de ejemplo →
          </button>
          {canProposeWithGemini && (
            <>
              <button
                type="button"
                className="button button-secondary"
                disabled={!canGenerate}
                onClick={() => setConsentOpen(true)}
              >
                Proponer con Gemini
              </button>
              <p className="case-builder__hint">
                Gemini admite hasta {formatCount(maxAiCases, "caso", "casos")} por solicitud y una
                descripción de hasta 3500 caracteres.
              </p>
            </>
          )}
          {generating && <p role="status">Generando casos con Gemini…</p>}
          {generationError && <Alert tone="error">{generationError}</Alert>}
        </form>
        <section className="case-builder__results" aria-labelledby="case-builder-results">
          <div className="case-builder__heading">
            <span className="case-builder__step">03</span>
            <div>
              <h2 className="typography__section" id="case-builder-results">
                Pasos y resultados esperados
              </h2>
              <p>
                {preview
                  ? `${
                      generated
                        ? formatCount(previewCases.length, "caso propuesto", "casos propuestos")
                        : formatCount(total, "caso de ejemplo", "casos de ejemplo")
                    } · guardado manual`
                  : "Tu vista previa aparecerá aquí."}
              </p>
            </div>
          </div>
          <div aria-live="polite">
            {preview ? (
              <>
                <p className="case-builder__preview-note">
                  {generated
                    ? "Propuestas de Gemini. Revisa los títulos, los pasos y los resultados esperados."
                    : "Ejemplos ilustrativos sobre un sistema hipotético."}{" "}
                  Guarda cada caso que quieras crear en el proyecto.
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
                  <section className="case-builder__case" key={testCase.key}>
                    <h3
                      className="typography__heading case-builder__case-title"
                      style={{ borderInlineStartColor: testCase.color }}
                    >
                      {testCase.categoryLabel} · {generated ? "Propuesta" : "Caso de ejemplo"}{" "}
                      {testCase.caseNumber}
                    </h3>
                    {generated && (
                      <label className="workspace__field">
                        Título del caso
                        <input
                          value={testCase.title ?? ""}
                          maxLength={200}
                          required
                          disabled={locked}
                          onChange={(event) => updateTitle(testCase.key, event.target.value)}
                        />
                      </label>
                    )}
                    <div className="case-builder__steps">
                      {testCase.steps.map((step, index) => (
                        <fieldset className="case-builder__step-card" key={index} disabled={locked}>
                          <legend>Paso {index + 1}</legend>
                          <label className="case-builder__label">
                            Acción
                            <RichTextarea
                              className="case-builder__input"
                              rows={2}
                              value={step.action}
                              onChange={(event) =>
                                updateExampleStep(testCase, index, "action", event.target.value)
                              }
                            />
                          </label>
                          <label className="case-builder__label">
                            Resultado esperado
                            <RichTextarea
                              className="case-builder__input"
                              rows={2}
                              value={step.expected}
                              onChange={(event) =>
                                updateExampleStep(testCase, index, "expected", event.target.value)
                              }
                            />
                          </label>
                          <button
                            type="button"
                            className="case-builder__remove-step"
                            disabled={testCase.steps.length <= 1}
                            onClick={() => removeExampleStep(testCase, index)}
                          >
                            Eliminar paso
                          </button>
                        </fieldset>
                      ))}
                    </div>
                    <DesignEvidencePanel
                      projectId={projectId}
                      targetId={savedCases[testCase.key]?.id}
                    />
                    <button
                      type="button"
                      className="case-builder__add-step"
                      disabled={locked || testCase.steps.length >= 100}
                      onClick={() => addExampleStep(testCase)}
                    >
                      Añadir paso ({testCase.steps.length}/100)
                    </button>
                    <button
                      type="button"
                      className={`case-builder__save-case${savedCases[testCase.key] ? " case-builder__save-case--saved" : ""}`}
                      disabled={!projectId || locked}
                      onClick={() => void savePreviewCase(testCase)}
                    >
                      {savedCases[testCase.key]
                        ? `Actualizar ${savedCases[testCase.key].id} con todos los pasos`
                        : savingCaseKey === testCase.key
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
                <h3 className="typography__heading">Visualiza tu próximo plan de pruebas</h3>
                <p>
                  Escribe una descripción y elige los tipos de prueba para preparar tu vista previa.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
      {consentOpen && generationInput && (
        <GeminiConsentDialog
          onClose={() => setConsentOpen(false)}
          onConfirm={() => {
            setConsentOpen(false);
            if (canGenerate) void generateCases();
          }}
          disabled={!canGenerate}
        >
          <GeminiOutboundText label="Descripción o requisito" text={generationInput.description} />
          <div className="gemini-consent__text">
            <strong>Categorías solicitadas</strong>
            <ul>
              {generationInput.categories.map(({ label, count }, index) => (
                <li key={index}>
                  {label} · {formatCount(count, "caso", "casos")}
                </li>
              ))}
            </ul>
          </div>
        </GeminiConsentDialog>
      )}
    </section>
  );
}
