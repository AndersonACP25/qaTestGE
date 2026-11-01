import { useId, useRef, useState } from "react";
import Alert from "../Alert";
export default function FileDropzone({
  file,
  onFile,
  label = "Archivo",
  accept,
  disabled = false,
}: {
  file: File | null;
  onFile: (file: File) => void;
  label?: string;
  accept?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  function receive(files: FileList | null) {
    setDragging(false);
    if (disabled || !files?.length) return;
    if (files.length !== 1) {
      setError("Selecciona un solo archivo.");
      return;
    }
    setError("");
    onFile(files[0]);
  }
  return (
    <div
      className={`file-dropzone${dragging ? " file-dropzone--active" : ""}${disabled ? " file-dropzone--disabled" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={(event) => {
        if (
          !event.currentTarget.contains(
            event.relatedTarget instanceof Node ? event.relatedTarget : null,
          )
        )
          setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        receive(event.dataTransfer.files);
      }}
    >
      <label className="file-dropzone__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        ref={input}
        className="file-dropzone__input"
        tabIndex={-1}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => receive(event.target.files)}
      />
      <button
        className="workspace__secondary import-panel__trigger"
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        Subir archivo
      </button>
      <span>{file ? file.name : "o arrastra un archivo aquí"}</span>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
