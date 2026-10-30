import { useMemo, useState } from "react";
import type { TestCase, TestRun } from "../types";
import { typeCoverage } from "../models/typeCoverage";
export default function TypeCoverage({ cases, runs }: { cases: TestCase[]; runs: TestRun[] }) {
  const [filter, setFilter] = useState("Todos");
  const rows = useMemo(() => typeCoverage(cases, runs), [cases, runs]);
  return (
    <section className="quality__panel">
      <h3 className="typography__heading">Cobertura por tipo de prueba</h3>
      <p>
        Casos vigentes con al menos un resultado registrado en el historial del proyecto. Los casos
        obsoletos quedan excluidos.
      </p>
      <label className="workspace__field">
        Tipo de prueba
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option>Todos</option>
          {rows.map((r) => (
            <option key={r.type}>{r.type}</option>
          ))}
        </select>
      </label>
      <table className="quality__table">
        <thead>
          <tr>
            {["Tipo", "Casos vigentes", "Ejecutados", "Cobertura"].map((s) => (
              <th className="quality__cell" key={s}>
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows
            .filter((r) => filter === "Todos" || r.type === filter)
            .map((r) => (
              <tr key={r.type}>
                <td className="quality__cell">{r.type}</td>
                <td className="quality__cell">{r.total}</td>
                <td className="quality__cell">{r.executed}</td>
                <td className="quality__cell">{Math.round((r.executed / r.total) * 100)}%</td>
              </tr>
            ))}
        </tbody>
      </table>
      {!rows.length && <p>No hay casos vigentes.</p>}
    </section>
  );
}
