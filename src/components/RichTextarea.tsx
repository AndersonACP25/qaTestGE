import { useLayoutEffect, useId, useRef, useState, type TextareaHTMLAttributes } from "react";
import FormattedText from "./FormattedText";

const actions = [
  { label: "Negrita", text: "B", marker: "**" },
  { label: "Cursiva", text: "I", marker: "*" },
  { label: "Tachado", text: "S", marker: "~~" },
  { label: "Código en línea", text: "</>", marker: "`" },
  { label: "Lista", text: "Lista", marker: "- " },
  { label: "Cita", text: "Cita", marker: "> " },
];
export default function RichTextarea({
  onMention,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  onMention?: (range: { start: number; end: number }) => void;
}) {
  const ariaLabel = props["aria-label"];
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const input = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const [current, setCurrent] = useState(String(props.value ?? props.defaultValue ?? ""));
  useLayoutEffect(() => {
    const field = input.current;
    const label = field?.closest("label");
    if (!field || !label) return;
    if (!label.htmlFor) label.htmlFor = id;
    if (!ariaLabel) {
      const root = field.closest(".rich-textarea");
      const name = [...label.childNodes]
        .filter((node) => node !== root)
        .map((node) => node.textContent ?? "")
        .join(" ")
        .trim();
      if (name) field.setAttribute("aria-label", name);
    }
  }, [id, ariaLabel]);
  const text = props.value === undefined ? current : String(props.value);
  function format(marker: string) {
    const field = input.current;
    if (!field || field.disabled || field.readOnly || field.matches(":disabled")) return;
    const { selectionStart: start, selectionEnd: end, value } = field;
    const line = marker.endsWith(" ");
    const from = line ? value.lastIndexOf("\n", start - 1) + 1 : start;
    const selected = value.slice(from, end);
    const replacement = line
      ? marker + selected.replaceAll("\n", `\n${marker}`)
      : marker + selected + marker;
    const next = value.slice(0, from) + replacement + value.slice(end);
    if (props.maxLength !== undefined && next.length > props.maxLength) return;
    // Use the native setter so controlled and FormData-based forms receive the same input event.
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(field, next);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.focus();
    const cursorStart = from + marker.length;
    field.setSelectionRange(
      cursorStart,
      line ? from + replacement.length : cursorStart + selected.length,
    );
  }
  return (
    <div className="rich-textarea">
      <span className="rich-textarea__toolbar" role="group" aria-label="Formato de texto">
        {actions.map(({ label, text, marker }) => (
          <button
            type="button"
            className={`rich-textarea__button rich-textarea__button--${label.toLowerCase().replace("ó", "o").replaceAll(" ", "-")}`}
            title={label}
            aria-label={label}
            disabled={props.disabled || props.readOnly || preview}
            key={label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => format(marker)}
          >
            {text}
          </button>
        ))}
        {onMention && (
          <button
            type="button"
            className="rich-textarea__button"
            aria-label="Mencionar usuario"
            disabled={props.disabled || props.readOnly || preview}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const field = input.current;
              if (field && !field.matches(":disabled"))
                onMention({ start: field.selectionStart, end: field.selectionEnd });
            }}
          >
            @ Mencionar
          </button>
        )}
        <button
          type="button"
          className="rich-textarea__button"
          aria-pressed={preview}
          onClick={() => setPreview((v) => !v)}
        >
          {preview ? "Editar texto" : "Vista previa"}
        </button>
      </span>
      <textarea
        {...props}
        id={id}
        rows={props.rows ?? 6}
        className={`rich-textarea__input${props.className ? ` ${props.className}` : ""}`}
        ref={input}
        hidden={preview}
        onInvalid={(event) => {
          props.onInvalid?.(event);
          if (preview) {
            event.preventDefault();
            setPreview(false);
            requestAnimationFrame(() => input.current?.focus());
          }
        }}
        onChange={(event) => {
          setCurrent(event.target.value);
          props.onChange?.(event);
        }}
      />
      {preview && (
        <div className="rich-textarea__preview">
          <FormattedText text={text || "Sin contenido."} />
        </div>
      )}
      <span className="rich-textarea__help">
        Formato Markdown · revisa el resultado en Vista previa.
      </span>
    </div>
  );
}
