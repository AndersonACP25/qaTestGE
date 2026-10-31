import Alert from "../Alert";
import { useAnalytics, defaultRange } from "../controllers/useAnalytics";
import { Distribution, TrendChart } from "./AnalyticsCharts";
import type { NavigationPage } from "../types";
export default function DashboardView({
  projectId,
  onNavigate,
}: {
  projectId: string;
  onNavigate: (p: NavigationPage) => void;
}) {
  const range = defaultRange();
  const { data, error } = useAnalytics(projectId, range.from, range.to);
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!data) return <p role="status">Cargando indicadores…</p>;
  const s = data.summary;
  return (
    <div className="analytics">
      <div className="workspace__metrics">
        {[
          ["Bugs abiertos", s.openBugs],
          ["Casos activos", s.activeCases],
          ["Ejecuciones activas", s.activeRuns],
          ["Aprobación · 30 días", s.approvalRate === null ? "Sin datos" : `${s.approvalRate}%`],
        ].map(([label, value]) => (
          <div className="workspace__metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="analytics__grid">
        <Distribution open={s.openBugs} closed={s.closedBugs} />
        <TrendChart
          label="Aprobación por ejecución · 30 días"
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
      </div>
      <section className="workspace__panel">
        <h2 className="typography__section">Cobertura de requisitos</h2>
        <p>
          <strong>
            {s.coveredRequirements} / {s.requirements}
          </strong>{" "}
          con al menos un caso activo vinculado.
        </p>
        <progress
          aria-label="Cobertura de requisitos"
          max={Math.max(1, s.requirements)}
          value={s.coveredRequirements}
        />
        <div className="quality__actions">
          <button className="workspace__secondary" onClick={() => onNavigate("coverage")}>
            Ver matriz de cobertura
          </button>
          <button className="workspace__secondary" onClick={() => onNavigate("reports")}>
            Explorar reportes y tendencias
          </button>
        </div>
      </section>
      <p className="typography__caption">
        La aprobación incluye resultados registrados aprobados, fallidos y bloqueados. Omite los no
        ejecutados y los omitidos.
      </p>
    </div>
  );
}
