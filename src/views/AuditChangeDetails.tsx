import type { Activity } from "../../backend/src/models/collaboration.model";
function fields(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};
}
const fieldLabels: Record<string, string> = {
  profile: "Perfil",
  detail: "Detalle",
  page_size: "Eventos por página",
  code: "Código",
  test_case_id: "Caso vinculado",
  tag_id: "Tag",
  release_version: "Versión del release",
  plan_id: "Plan de pruebas",
  owner_user_id: "Responsable de la ejecución",
  color: "Color",
  bug_id: "Bug vinculado",
  title: "Título",
  body: "Comentario",
  status: "Estado",
  role: "Rol",
  lifecycle: "Estado documental",
  test_type: "Tipo de prueba",
  severity: "Severidad",
  priority: "Prioridad",
  environment: "Entorno",
  affected_version: "Versión afectada",
  notes: "Notas",
  action: "Acción",
  expected_result: "Resultado esperado",
  suite: "Suite",
  preconditions: "Precondiciones",
  name: "Nombre",
  description: "Descripción",
  owner: "Responsable",
  version: "Versión",
  states: "Estados",
  transitions: "Transiciones",
  closed_states: "Estados resueltos",
  deleted_at: "Fecha de eliminación",
  assignee_user_id: "Responsable QA",
  user_id: "Integrante",
};
export function auditChanges(row: Activity) {
  const before = fields(row.before);
  const after = fields(row.after);
  const value = (entry: unknown) =>
    entry === undefined ? "—" : typeof entry === "string" ? entry : JSON.stringify(entry);
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(
      (key) =>
        Object.hasOwn(fieldLabels, key) &&
        JSON.stringify(before[key]) !== JSON.stringify(after[key]),
    )
    .map((key) => ({
      key,
      label: fieldLabels[key],
      before: value(before[key]),
      after: value(after[key]),
    }));
}
export function AuditChangeDetails({ changes }: { changes: ReturnType<typeof auditChanges> }) {
  return (
    <dl className="project-activity__changes">
      {changes.map(({ key, label, before, after }) => (
        <div className="collaboration__change" key={key}>
          <dt>{label}</dt>
          <dd>Antes: {before}</dd>
          <dd>Después: {after}</dd>
        </div>
      ))}
    </dl>
  );
}
