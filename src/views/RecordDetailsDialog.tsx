import { usePermissions } from "../controllers/ProjectPermissions";
import Dialog from "../Dialog";
import { formatCount } from "../utils/pluralization";
import type { ReactNode } from "react";
import type { Bug, TestCase } from "../types";

export type RecordDetail = { kind: "bug"; record: Bug } | { kind: "case"; record: TestCase };

export default function RecordDetailsDialog({
  detail,
  onClose,
  onEdit,
  children,
}: {
  detail: RecordDetail;
  onClose: () => void;
  onEdit: () => void;
  children?: ReactNode;
}) {
  const { record } = detail;
  const permission = usePermissions();
  const isBug = detail.kind === "bug";
  const bug: Bug | null = detail.kind === "bug" ? detail.record : null;
  const testCase: TestCase | null = detail.kind === "case" ? detail.record : null;
  const steps = testCase?.steps ?? [];

  return (
    <Dialog wide title={isBug ? "Detalle del bug" : "Detalle del caso de prueba"} onClose={onClose}>
      <article className={`record-view record-view--${detail.kind}`}>
        <header className="record-view__hero">
          <div className="record-view__identity">
            <span className="record-view__id">{record.id}</span>
            <h3 className="typography__heading">{record.title}</h3>
            <span className="record-view__project">
              {bug ? bug.project : testCase?.suite ? `Suite: ${testCase.suite}` : "Sin suite"}
            </span>
          </div>
          <div className="record-view__badges">
            <span
              className={`record-view__status record-view__status--${record.status.toLowerCase().replaceAll(" ", "-")}`}
            >
              {record.status}
            </span>
            {bug && (
              <span
                className={`record-view__priority record-view__priority--${bug.priority.toLowerCase()}`}
              >
                {bug.priority}
              </span>
            )}
          </div>
        </header>

        {bug ? (
          <section className="record-view__section">
            <h4>Descripción</h4>
            <p>
              Severidad: {bug.severity ?? "Media"} · Entorno: {bug.environment || "Sin indicar"} ·
              Versión: {bug.affectedVersion || "Sin indicar"}
            </p>
            {bug.sourceResultId && (
              <section>
                <h4>Origen del fallo</h4>
                <p>
                  {bug.sourceCaseId} · {bug.sourceRunId} · {bug.sourceResultId}
                </p>
                <ol>
                  {bug.sourceSteps?.map((s, i) => (
                    <li key={i}>
                      {s.action}
                      <p>Esperado: {s.expectedResult}</p>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            <p className="record-view__copy">{bug.description?.trim() || "Sin descripción."}</p>
            <dl className="record-view__metadata">
              <div>
                <dt>Responsable</dt>
                <dd>{bug.assignee || "Sin asignar"}</dd>
              </div>
              <div>
                <dt>Creado</dt>
                <dd>
                  {bug.createdAt ? new Date(bug.createdAt).toLocaleString("es") : bug.updated}
                </dd>
              </div>
            </dl>
          </section>
        ) : (
          <>
            <section className="record-view__section">
              <h4>Precondiciones</h4>
              <p>
                {testCase?.testType ?? "Funcional"} · {testCase?.lifecycle ?? "Borrador"} · Versión{" "}
                {testCase?.version ?? 1}
              </p>
              <p className="record-view__copy">
                {testCase?.preconditions?.trim() || "Sin precondiciones."}
              </p>
              <p>Responsable QA: {testCase?.assigneeName || "Sin asignar"}</p>
            </section>
            <section className="record-view__section">
              <div className="record-view__section-heading">
                <h4>Pasos y resultados esperados</h4>
                <span>{formatCount(steps.length, "paso", "pasos")}</span>
              </div>
              {steps.length ? (
                <ol className="record-view__steps">
                  {steps.map((step, index) => (
                    <li className="record-view__step" key={`${index}-${step.action}`}>
                      <span className="record-view__step-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <span>Acción</span>
                        <p>{step.action}</p>
                      </div>
                      <div>
                        <span>Resultado esperado</span>
                        <p>{step.expectedResult}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="record-view__copy">Este caso todavía no tiene pasos definidos.</p>
              )}
            </section>
            <section className="record-view__section">
              <dl className="record-view__metadata">
                <div>
                  <dt>Suite</dt>
                  <dd>{testCase?.suite || "Sin suite"}</dd>
                </div>
                <div>
                  <dt>Creado</dt>
                  <dd>
                    {testCase?.createdAt
                      ? new Date(testCase.createdAt).toLocaleString("es")
                      : testCase?.updated}
                  </dd>
                </div>
              </dl>
            </section>
          </>
        )}

        {children}

        <footer className="record-view__actions">
          <button type="button" className="workspace__secondary" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={!permission.can(isBug ? "bugs.write" : "cases.write")}
            onClick={onEdit}
          >
            {isBug ? "Editar bug" : "Editar caso"}
          </button>
        </footer>
      </article>
    </Dialog>
  );
}
