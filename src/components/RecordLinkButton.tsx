import { useState } from "react";
import { recordLink } from "../models/recordLinks";

export default function RecordLinkButton({ projectId, id }: { projectId: string; id: string }) {
  const [copied, setCopied] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const url = recordLink(window.location.href, projectId, id);
  async function copy() {
    setCopied(false);
    try {
      await navigator.clipboard.writeText(url);
      setShowUrl(false);
      setCopied(true);
    } catch {
      setShowUrl(true);
    }
  }
  return (
    <div className="layout__stack">
      <button type="button" className="workspace__secondary" onClick={() => void copy()}>
        Copiar enlace
      </button>
      {copied && <span role="status">Enlace copiado.</span>}
      {showUrl && (
        <label className="workspace__field">
          Copia este enlace
          <input readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
        </label>
      )}
    </div>
  );
}
