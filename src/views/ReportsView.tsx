import { formatCount } from "../utils/pluralization";
import { useMemo } from "react";
import type { Bug, Evidence, TestCase, TestRun } from "../types";
import { calculateReportMetrics } from "../models/reportMetrics";

const caseStatusLabels = ["Pendiente", "Aprobado", "Fallido"] as const;
const resultStatusLabels = [
  ["passed", "Aprobado", "success"],
  ["failed", "Fallido", "error"],
  ["blocked", "Bloqueado", "warning"],
  ["skipped", "Omitido", "neutral"],
] as const;

export default function ReportsView({
  projectName,
  bugs,
  cases,
  runs,
  evidence,
}: {
  projectName: string;
  bugs: Bug[];
  cases: TestCase[];
  runs: TestRun[];
  evidence: Evidence[];
}) {
  const metrics = useMemo(
    () => calculateReportMetrics(bugs, cases, runs, evidence),
    [bugs, cases, runs, evidence],
  );
  const bugStatuses = [
    { label: "Abiertos y en seguimiento", count: metrics.openBugs, tone: "warning" },
    { label: "Resueltos", count: metrics.resolvedBugs, tone: "success" },
  ];
  const caseStatuses = caseStatusLabels.map((label) => ({
    label,
    count: metrics.casesByStatus[label],
    tone: label === "Aprobado" ? "success" : label === "Fallido" ? "error" : "neutral",
  }));
  const resultStatuses = resultStatusLabels.map(([key, label, tone]) => ({
    label,
    count: metrics.resultsByStatus[key],
    tone,
  }));

  function downloadCsv() {
    const rows = [
      ["Proyecto", projectName],
      ["Generado", new Date().toLocaleString("es")],
      ["Indicador", "Valor"],
      ["Bugs abiertos y en seguimiento", String(metrics.openBugs)],
      ["Bugs resueltos", String(metrics.resolvedBugs)],
      ["Casos de prueba", String(cases.length)],
      ["Ejecuciones activas", String(metrics.activeRuns)],
      ["Ejecuciones completadas", String(metrics.completedRuns)],
      ["Progreso promedio de ejecuciones (%)", String(metrics.averageRunProgress)],
      ["Tasa de aprobación (%)", String(metrics.approvalRate)],
      ["Resultados registrados", String(metrics.recordedResults)],
      ["Evidencias", String(metrics.evidenceCount)],
      ...caseStatuses.map(({ label, count }) => [`Casos: ${label}`, String(count)]),
      ...resultStatuses.map(({ label, count }) => [`Resultados: ${label}`, String(count)]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(";"))
      .join("\r\n");
    const file = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte-${projectName.trim().replaceAll(/\s+/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="reports" aria-labelledby="reports-title">
      <div className="reports__heading">
        <div>
          <h2 className="typography__section" id="reports-title">
            Resumen de {projectName}
          </h2>
          <p>
            Indicadores calculados con los registros actuales del proyecto. Los casos omitidos no
            cuentan para la tasa de aprobación.
          </p>
        </div>
        <button
          type="button"
          className="workspace__secondary reports__download"
          onClick={downloadCsv}
        >
          Descargar CSV
        </button>
      </div>

      <div className="reports__metrics">
        {[
          {
            label: "Bugs abiertos",
            value: metrics.openBugs,
            detail: formatCount(metrics.resolvedBugs, "resuelto", "resueltos"),
          },
          {
            label: "Casos de prueba",
            value: cases.length,
            detail: formatCount(metrics.casesByStatus.Pendiente, "pendiente", "pendientes"),
          },
          {
            label: "Ejecuciones completadas",
            value: metrics.completedRuns,
            detail: `${metrics.activeRuns} en curso`,
          },
          { label: "Evidencias", value: metrics.evidenceCount, detail: "En el proyecto actual" },
        ].map((item) => (
          <article className="reports__metric" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </div>

      <div className="reports__quality">
        <article className="reports__quality-card">
          <span>Progreso promedio de ejecuciones</span>
          <strong>{metrics.averageRunProgress}%</strong>
          <progress value={metrics.averageRunProgress} max={100} aria-label="Progreso promedio" />
        </article>
        <article className="reports__quality-card">
          <span>Tasa de aprobación</span>
          <strong>{metrics.approvalRate}%</strong>
          <small>
            {formatCount(metrics.recordedResults, "resultado registrado", "resultados registrados")}
          </small>
        </article>
      </div>

      <div className="reports__distributions">
        {[
          { title: "Estado de bugs", rows: bugStatuses },
          { title: "Estado de casos de prueba", rows: caseStatuses },
          { title: "Resultados de ejecución", rows: resultStatuses },
        ].map(({ title, rows }) => {
          const total = rows.reduce((sum, row) => sum + row.count, 0);
          return (
            <section className="reports__distribution" key={title} aria-label={title}>
              <h3 className="typography__heading">{title}</h3>
              {rows.map(({ label, count, tone }) => (
                <div className="reports__bar-row" key={label}>
                  <div className="reports__bar-label">
                    <span>{label}</span>
                    <strong>{count}</strong>
                  </div>
                  <div
                    className="reports__bar"
                    role="img"
                    aria-label={`${label}: ${count} de ${total}`}
                  >
                    <span
                      className={`reports__bar-fill reports__bar-fill--${tone}`}
                      style={{ width: `${total ? (count / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
              {!total && <p className="reports__empty">Sin registros para mostrar.</p>}
            </section>
          );
        })}
      </div>
    </section>
  );
}
