import { reportRangeError } from "../models/reportRange";
import { useState } from "react";
import Alert from "../Alert";
import { defaultRange, useAnalytics } from "../controllers/useAnalytics";
import { TrendChart, Bars } from "./AnalyticsCharts";
import { download } from "../utils/download";
export default function ReportsView({
  refreshRevision = 0,
  projectId,
  projectName,
}: {
  refreshRevision?: number;
  projectId: string;
  projectName: string;
}) {
  const [range, setRange] = useState(defaultRange);
  const [draft, setDraft] = useState(range);
  const [message, setMessage] = useState("");
  const [invalid, setInvalid] = useState("");
  const [applied, setApplied] = useState(0);
  const { data, error } = useAnalytics(
    projectId,
    range.from,
    range.to,
    `${refreshRevision}:${applied}`,
  );
  const dateError = reportRangeError(draft.from, draft.to);
  return (
    <div className="analytics reports-view">
      <form
        className="analytics__period"
        onSubmit={(e) => {
          e.preventDefault();
          if (dateError) {
            setInvalid(dateError);
            return;
          }
          setInvalid("");
          setMessage("");
          setApplied((v) => v + 1);
          setRange(draft);
        }}
      >
        <label className="workspace__field">
          Desde
          <input
            type="date"
            required
            max={draft.to || undefined}
            value={draft.from}
            onChange={(e) => {
              setMessage("");
              setInvalid("");
              setDraft({ ...draft, from: e.target.value });
            }}
          />
        </label>
        <label className="workspace__field">
          Hasta
          <input
            type="date"
            required
            min={draft.from || undefined}
            value={draft.to}
            onChange={(e) => {
              setMessage("");
              setInvalid("");
              setDraft({ ...draft, to: e.target.value });
            }}
          />
        </label>
        <button className="workspace__secondary" disabled={!!dateError}>
          Aplicar período
        </button>
      </form>
      {data &&
        applied > 0 &&
        !message &&
        !dateError &&
        draft.from === range.from &&
        draft.to === range.to && (
          <Alert tone="success">Período aplicado. Los indicadores están actualizados.</Alert>
        )}
      {message && <Alert tone="success">{message}</Alert>}
      {(error || invalid || dateError) && (
        <Alert tone="error">{dateError || invalid || error}</Alert>
      )}
      {!data && !error && <p role="status">Cargando reportes…</p>}
      {data && (
        <>
          <section className="workspace__panel reports-view__summary layout__panel layout__stack">
            <span className="reports-view__eyebrow">
              {range.from} — {range.to} · UTC
            </span>
            <h2 className="typography__section">Resultados del período</h2>
            <div className="reports-view__metrics">
              {[
                [
                  "Aprobación",
                  data.summary.approvalRate === null
                    ? "Sin datos"
                    : `${data.summary.approvalRate}%`,
                  "approval",
                ],
                ["Registrados", data.summary.recorded, "neutral"],
                ["Fallidos", data.summary.failed, "failure"],
                ["Bloqueados", data.summary.blocked, "blocked"],
              ].map(([label, value, tone]) => (
                <div className={`reports-view__metric reports-view__metric--${tone}`} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <p className="typography__caption">
              La aprobación excluye omitidos y pendientes. Los totales de bugs, casos y cobertura
              reflejan el estado actual del proyecto.
            </p>
            <button
              className="workspace__secondary"
              onClick={() => {
                const rows = [
                  ["Proyecto", projectName],
                  ["Desde", range.from],
                  ["Hasta", range.to],
                  ["Aprobación", String(data.summary.approvalRate ?? "Sin datos")],
                  ["Fecha", "Bugs abiertos", "Bugs cerrados"],
                  ...data.bugTrend.map((r) => [
                    r.date,
                    String(r.open ?? ""),
                    String(r.closed ?? ""),
                  ]),
                  ["Ejecución", "Título", "Fecha", "Aprobación"],
                  ...data.runTrend.map((r) => [
                    r.id,
                    r.title,
                    r.createdAt,
                    String(r.approvalRate ?? ""),
                  ]),
                  ["Caso", "Título", "Fallos", "Evaluados"],
                  ...data.frequentFailures.map((r) => [
                    r.caseId,
                    r.title,
                    String(r.failures),
                    String(r.executions),
                  ]),
                ];
                download(
                  new Blob(
                    [
                      "\uFEFF" +
                        rows
                          .map((r) => r.map((v) => '"' + v.replace(/"/g, '""') + '"').join(";"))
                          .join("\r\n"),
                    ],
                    { type: "text/csv;charset=utf-8" },
                  ),
                  "reporte-analitica.csv",
                );
                setMessage("Reporte CSV preparado para descargar.");
              }}
            >
              Exportar reporte CSV
            </button>
          </section>
          <div className="analytics__grid">
            <TrendChart
              label="Tasa de aprobación por ejecución"
              percent
              dates={data.runTrend.map((r) => r.createdAt)}
              series={[
                {
                  name: "Aprobación",
                  color: "#7563dc",
                  values: data.runTrend.map((r) => r.approvalRate),
                },
              ]}
            />
            <TrendChart
              label="Bugs abiertos y cerrados en el tiempo"
              dates={data.bugTrend.map((r) => r.date)}
              series={[
                { name: "Abiertos", color: "#7563dc", values: data.bugTrend.map((r) => r.open) },
                { name: "Cerrados", color: "#37a58b", values: data.bugTrend.map((r) => r.closed) },
              ]}
            />
          </div>
          <p className="typography__caption">
            Historial de bugs disponible desde{" "}
            {new Date(data.historySince).toLocaleDateString("es")}. Se muestra el saldo al cierre de
            cada día; el día actual es parcial. Hasta 60 ejecuciones recientes del período, según su
            fecha de creación.
          </p>
          <div className="analytics__grid">
            <section className="workspace__panel">
              <h2 className="typography__section">Casos que fallan con frecuencia</h2>
              <p className="typography__caption">
                Hasta 10 casos, ordenados por cantidad de fallos. Fallidos / resultados evaluados en
                el período.
              </p>
              <Bars
                ranked
                emptyLabel="No hay fallos registrados en este período."
                items={data.frequentFailures.map((r) => ({
                  label: `${r.caseId} · ${r.title}`,
                  value: r.failures,
                  total: r.executions,
                }))}
              />
            </section>
            <section className="workspace__panel">
              <h2 className="typography__section">Cobertura por tipo de prueba</h2>
              <p className="typography__caption">
                Casos activos con algún resultado registrado / casos activos. Cobertura acumulada.
              </p>
              <Bars
                items={data.typeCoverage.map((r) => ({
                  label: r.type,
                  value: r.executed,
                  total: r.total,
                }))}
              />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
