import { formatCount } from "../utils/pluralization";
export default function TableFooter({
  total,
  page,
  pageSize,
  onPage,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="workspace-table__footer">
      <span>{formatCount(total, "resultado", "resultados")} · datos del proyecto</span>
      <nav className="workspace-table__pagination" aria-label="Páginas de registros">
        <button
          className="workspace__secondary"
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Anterior
        </button>
        <span aria-live="polite">
          Página {page} de {pages}
        </span>
        <button
          className="workspace__secondary"
          type="button"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Siguiente
        </button>
      </nav>
    </div>
  );
}
