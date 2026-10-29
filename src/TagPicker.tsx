import Alert from "./Alert";
import type { Tag } from "./types";
export default function TagPicker({
  tags,
  error,
  selectedIds,
  onChange,
}: {
  tags: Tag[];
  error: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <fieldset className="workspace__fieldset">
      <legend>Tags</legend>
      {error ? (
        <Alert tone="error">{error}</Alert>
      ) : tags.length ? (
        tags.map((tag) => (
          <label className="workspace__check" key={tag.id}>
            <input
              type="checkbox"
              name="tagIds"
              value={tag.id}
              checked={selectedIds.includes(tag.id)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selectedIds, tag.id]
                    : selectedIds.filter((id) => id !== tag.id),
                )
              }
            />
            <span className="tags-view__swatch" style={{ backgroundColor: tag.color }} />
            {tag.name}
          </label>
        ))
      ) : (
        <p>No hay tags. Puedes crearlos desde la sección Tags.</p>
      )}
    </fieldset>
  );
}
