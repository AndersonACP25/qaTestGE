import type { RunReport } from "../contracts/analyticsContracts";
const labels = { passed: "Aprobado", failed: "Fallido", blocked: "Bloqueado", skipped: "Omitido" };
export async function exportRunReport(report: RunReport, stillCurrent: () => boolean = () => true) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  if (!stillCurrent()) return;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Informe de ejecución", 14, 20);
  doc.setFontSize(11);
  const header = doc.splitTextToSize(
    `${report.projectName} · ${report.runId}\n${report.title}\nResponsable: ${report.owner} · Estado: ${report.status}\nCreada: ${new Date(report.createdAt).toLocaleString("es")}\nInforme generado: ${new Date(report.generatedAt).toLocaleString("es")}`,
    180,
  ) as string[];
  doc.text(header, 14, 30);
  const s = report.summary;
  let y = 30 + header.length * 5 + 5;
  let finalY = y;
  autoTable(doc, {
    startY: y,
    head: [
      ["Casos", "Registrados", "Aprobados", "Fallidos", "Bloqueados", "Omitidos", "Aprobación"],
    ],
    body: [
      [
        s.total,
        s.recorded,
        s.passed,
        s.failed,
        s.blocked,
        s.skipped,
        s.approvalRate === null ? "Sin datos" : `${s.approvalRate}%`,
      ],
    ],
    styles: { fontSize: 9, overflow: "linebreak" },
    margin: { bottom: 20 },
    didDrawPage: (data) => {
      finalY = data.cursor?.y ?? finalY;
    },
  });
  y = finalY + 12;
  for (const result of report.results) {
    autoTable(doc, {
      startY: y,
      head: [
        [
          `${result.caseId} · v${result.caseVersion} · ${result.title}`,
          result.executedAt ? labels[result.status] : "Sin ejecutar",
        ],
      ],
      body: [
        ["Resultado observado", result.notes || "Sin notas"],
        [
          "Registrado",
          result.executedAt ? new Date(result.executedAt).toLocaleString("es") : "Pendiente",
        ],
        ...result.steps.map((step, i) => [`Paso ${i + 1}: ${step.action}`, step.expectedResult]),
        ["Bugs enlazados", result.bugIds.join(", ") || "Ninguno"],
        [
          "Evidencia enlazada",
          result.evidence.map((e) => `${e.id}: ${e.name}`).join("\n") || "Ninguna",
        ],
      ],
      styles: { fontSize: 10, overflow: "linebreak" },
      columnStyles: { 0: { cellWidth: 90 } },
      margin: { bottom: 20 },
      rowPageBreak: "avoid",
      didDrawPage: (data) => {
        finalY = data.cursor?.y ?? finalY;
      },
    });
    y = finalY + 12;
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.text(`qaTestGE · ${report.runId} · ${i} / ${pages}`, 14, 287);
  }
  if (stillCurrent()) doc.save(`informe-${report.runId}.pdf`);
}
