import Dialog from "../Dialog";
import WorkItemLayout from "../components/WorkItemLayout";
import type { Evidence } from "../types";
export default function EvidenceDetailsDialog({
  evidence,
  onClose,
  onDownload,
}: {
  evidence: Evidence;
  onClose: () => void;
  onDownload: () => void;
}) {
  return (
    <Dialog workItem title="Detalle de la evidencia" onClose={onClose}>
      <WorkItemLayout
        kind="evidence"
        id={evidence.id}
        title={evidence.name}
        status={evidence.hasFile ? "Archivo disponible" : "Solo metadatos"}
        fields={[
          { label: "Tipo", value: evidence.type },
          { label: "Tamaño", value: evidence.size },
          { label: "Proyecto", value: `#${evidence.projectId}` },
        ]}
        anchors={[{ label: "Archivo y vínculos", selector: ".evidence-detail__file" }]}
        actions={
          evidence.hasFile && (
            <button type="button" className="button button-primary" onClick={onDownload}>
              Descargar evidencia
            </button>
          )
        }
      >
        <section className="evidence-detail__file">
          <h4 className="typography__heading">Archivo y vínculos</h4>
          <dl className="record-view__metadata">
            <div>
              <dt>Nombre</dt>
              <dd>{evidence.name}</dd>
            </div>
            <div>
              <dt>Vinculado a</dt>
              <dd>{evidence.related || "Sin vincular"}</dd>
            </div>
            <div>
              <dt>Fecha de carga</dt>
              <dd>{new Date(evidence.createdAt).toLocaleString("es")}</dd>
            </div>
          </dl>
          <p>
            {evidence.hasFile
              ? "La descarga requiere acceso al proyecto."
              : "Este registro todavía no tiene un archivo adjunto."}
          </p>
        </section>
      </WorkItemLayout>
    </Dialog>
  );
}
