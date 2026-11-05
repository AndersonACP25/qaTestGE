import { useState, type ReactNode } from "react";
import type { CaseBulkInput } from "../../backend/src/models/case-bulk.model";
import { api } from "../api";
import Alert from "../Alert";
import Dialog from "../Dialog";
import TagPicker from "../TagPicker";
import type { Tag, TestCase } from "../types";
import { formatCount } from "../utils/pluralization";

export default function CaseBulkActions({
  projectId,
  items,
  members,
  tags,
  tagError,
  membersError,
  enabled,
  onUpdated,
  children,
}: {
  projectId: string;
  items: TestCase[];
  members: { id: string; name: string }[];
  tags: Tag[];
  tagError: string;
  membersError: string;
  enabled: boolean;
  onUpdated: (updated: number) => void;
  children: (selection?: { ids: Set<string>; toggle: (id: string) => void }) => ReactNode;
}) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [targets, setTargets] = useState<TestCase[] | null>(null);
  const [kind, setKind] = useState<CaseBulkInput["action"]["kind"]>("assign");
  const [assignee, setAssignee] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = items.filter((item) => ids.has(item.id));
  const assigneeName =
    assignee === "none" ? "Sin asignar" : members.find((member) => member.id === assignee)?.name;
  const action: CaseBulkInput["action"] =
    kind === "assign"
      ? { kind, assigneeUserId: assignee === "none" ? null : assignee }
      : { kind, tagIds };
  const canReview =
    kind === "assign" ? !membersError && Boolean(assigneeName) : !tagError && tagIds.length > 0;
  function toggle(id: string) {
    setIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function open() {
    setTargets(selected);
    setKind("assign");
    setAssignee("");
    setTagIds([]);
    setReviewing(false);
    setError("");
  }
  async function confirm() {
    if (!targets || !canReview || busy) return;
    setBusy(true);
    setError("");
    try {
      const payload: CaseBulkInput = {
        projectId,
        cases: targets.map(({ id, version }) => ({ id, version: version ?? 1 })),
        action,
      };
      const result = await api<{ updated: number }>("/test-cases/bulk", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setTargets(null);
      setIds(new Set());
      onUpdated(result.updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo aplicar la operación.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {enabled && items.length > 0 && (
        <div className="layout__actions" aria-label="Selección masiva de casos">
          <span role="status">
            {formatCount(selected.length, "caso seleccionado", "casos seleccionados")}
          </span>
          <button
            type="button"
            className="workspace__secondary"
            disabled={selected.length === items.length}
            onClick={() => setIds(new Set(items.map(({ id }) => id)))}
          >
            Seleccionar página
          </button>
          <button
            type="button"
            className="workspace__secondary"
            disabled={!selected.length}
            onClick={() => setIds(new Set())}
          >
            Limpiar selección
          </button>
          <button
            type="button"
            className="workspace__secondary"
            disabled={!selected.length}
            onClick={open}
          >
            Operación masiva
          </button>
        </div>
      )}
      {children(enabled ? { ids, toggle } : undefined)}
      {enabled && targets && (
        <Dialog
          title="Operación masiva de casos"
          onClose={() => {
            if (!busy) setTargets(null);
          }}
        >
          <div className="layout__stack">
            {error && <Alert tone="error">{error}</Alert>}
            {reviewing ? (
              <>
                <h3 className="typography__heading">Vista previa de cambios</h3>
                <ul>
                  {targets.map((item) => {
                    const newTags = tags.filter(
                      (tag) => tagIds.includes(tag.id) && !item.tagIds?.includes(tag.id),
                    );
                    const change =
                      kind === "assign"
                        ? (item.assigneeUserId ?? null) === (assignee === "none" ? null : assignee)
                          ? "Sin cambios"
                          : `${item.assigneeName || "Sin asignar"} → ${assigneeName}`
                        : newTags.length
                          ? `Añadir ${newTags.map((tag) => tag.name).join(", ")}`
                          : "Sin cambios";
                    return (
                      <li key={item.id}>
                        <strong>{item.id}</strong> · {item.title} · {change}
                      </li>
                    );
                  })}
                </ul>
                <div className="layout__actions">
                  <button
                    type="button"
                    className="workspace__secondary"
                    disabled={busy}
                    onClick={() => {
                      setReviewing(false);
                      setError("");
                    }}
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    className="button button-primary"
                    disabled={busy || !canReview}
                    onClick={() => void confirm()}
                  >
                    {busy ? "Aplicando…" : "Confirmar operación"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>{formatCount(targets.length, "caso seleccionado", "casos seleccionados")}</p>
                <label className="workspace__field">
                  Acción para los casos
                  <select
                    value={kind}
                    onChange={(event) =>
                      setKind(event.target.value === "addTags" ? "addTags" : "assign")
                    }
                  >
                    <option value="assign">Asignar responsable</option>
                    <option value="addTags">Añadir tags</option>
                  </select>
                </label>
                {kind === "assign" ? (
                  <>
                    {membersError && <Alert tone="error">{membersError}</Alert>}
                    <label className="workspace__field">
                      Nuevo responsable
                      <select
                        value={assignee}
                        onChange={(event) => setAssignee(event.target.value)}
                      >
                        <option value="">Selecciona un responsable</option>
                        <option value="none">Sin asignar</option>
                        {members.map((member) => (
                          <option value={member.id} key={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : (
                  <TagPicker
                    tags={tags}
                    error={tagError}
                    selectedIds={tagIds}
                    onChange={setTagIds}
                  />
                )}
                <button
                  type="button"
                  className="workspace__secondary"
                  disabled={!canReview}
                  onClick={() => setReviewing(true)}
                >
                  Revisar cambios
                </button>
              </>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
