import { usePermissions } from "../controllers/ProjectPermissions";
import { useEffect, useState } from "react";
import Alert from "../Alert";
import { listTestCaseAttachments, deleteTestCaseAttachment, testCaseImageUrl } from "../api";
import type { TestCase, TestCaseAttachment } from "../types";
export default function CaseAttachmentsPanel({ testCase }: { testCase: TestCase }) {
  const readOnly = !usePermissions().can("evidence.write");
  const [attachments, setAttachments] = useState<TestCaseAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(true);
  const [attachmentError, setAttachmentError] = useState("");
  const [deletingAttachment, setDeletingAttachment] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!testCase.projectId) {
      setAttachmentError("No se puede consultar adjuntos sin el proyecto asociado.");
      setLoadingAttachments(false);
      return;
    }
    const abort = new AbortController();
    setLoadingAttachments(true);
    setAttachmentError("");
    void listTestCaseAttachments(testCase.id, testCase.projectId)
      .then((items) => {
        if (!abort.signal.aborted) setAttachments(items);
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted)
          setAttachmentError(
            cause instanceof Error ? cause.message : "No se pudieron cargar los adjuntos.",
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoadingAttachments(false);
      });
    return () => abort.abort();
  }, [testCase.id, testCase.projectId, revision]);
  async function removeAttachment(attachment: TestCaseAttachment) {
    if (!testCase.projectId || deletingAttachment) return;
    setDeletingAttachment(attachment.id);
    setAttachmentError("");
    try {
      await deleteTestCaseAttachment(testCase.id, attachment.id, testCase.projectId);
      setRevision((current) => current + 1);
    } catch (cause) {
      setAttachmentError(
        cause instanceof Error ? cause.message : "No se pudo eliminar el adjunto.",
      );
    } finally {
      setDeletingAttachment("");
    }
  }
  return (
    <section className="workspace__attachments" aria-label="Adjuntos del caso">
      <h3 className="typography__heading">Imágenes y enlaces</h3>
      {loadingAttachments && <p className="workspace__notice">Cargando adjuntos…</p>}
      {attachmentError && <Alert tone="error">{attachmentError}</Alert>}
      {!loadingAttachments && !attachmentError && !attachments.length && (
        <p className="workspace__notice">
          Este caso todavía no tiene imágenes ni enlaces adjuntos.
        </p>
      )}
      {attachments.map((attachment) => (
        <div className="workspace__attachment" key={attachment.id}>
          {attachment.kind === "image" ? (
            <a
              href={testCaseImageUrl(testCase.id, attachment.id, attachment.projectId)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={testCaseImageUrl(testCase.id, attachment.id, attachment.projectId)}
                alt={attachment.name}
              />
              <span>{attachment.name}</span>
            </a>
          ) : (
            <a href={attachment.url ?? undefined} target="_blank" rel="noopener noreferrer">
              {attachment.name}
              <span>{attachment.url}</span>
            </a>
          )}
          <button
            type="button"
            className="workspace__secondary"
            disabled={readOnly || Boolean(deletingAttachment)}
            onClick={() => void removeAttachment(attachment)}
          >
            {deletingAttachment === attachment.id ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      ))}
    </section>
  );
}
