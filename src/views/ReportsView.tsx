import { useState } from "react";
import Alert from "../Alert";
import { defaultRange, useAnalytics } from "../controllers/useAnalytics";
import { TrendChart, Bars } from "./AnalyticsCharts";
import { download } from "../utils/download";
export default function ReportsView({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [range, setRange] = useState(defaultRange);
  const [draft, setDraft] = useState(range);
  const [invalid, setInvalid] = useState("");
  const { data, error } = useAnalytics(projectId, range.from, range.to);
  return (
    <div className="analytics">
      <form
        className="quality__actions"
        onSubmit={(e) => {
          e.preventDefault();
          if (
            !draft.from ||
            !draft.to ||
            draft.from > draft.to ||
            (Date.parse(draft.to) - Date.parse(draft.from)) / 86400000 > 365
          ) {
            setInvalid("Selecciona un período válido de hasta 366 días.");
            return;
          }
          setInvalid("");
          setRange(draft);
        }}
      >
        <label className="workspace__field">
          Desde
          <input
            type="date"
            required
            value={draft.from}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
        </label>
        <label className="workspace__field">
          Hasta
          <input
            type="date"
            required
            value={draft.to}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
        </label>
        <button className="workspace__secondary">Aplicar período</button>
      </form>
      {(error || invalid) && <Alert tone="error">{invalid || error}</Alert>}
      {!data && !error && <p role="status">Cargando reportes…</p>}
      {data && (
        <>
          <section className="workspace__panel">
            <h2 className="typography__section">Resultados del período</h2>
            <p>
              Aprobación:{" "}
              <strong>
                {data.summary.approvalRate === null ? "Sin datos" : `${data.summary.approvalRate}%`}
              </strong>{" "}
              · Registrados: {data.summary.recorded} · Fallidos: {data.summary.failed} · Bloqueados:{" "}
              {data.summary.blocked}
            </p>
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
