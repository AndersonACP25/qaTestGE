import type { Request } from "express";
import { HttpError } from "../http-error.js";
export interface ListQuery {
  limit: number;
  offset: number;
  search?: string;
  status?: string;
}
export function listQuery(request: Request, statuses: readonly string[]): ListQuery | undefined {
  if (["limit", "offset", "search", "status"].every((key) => request.query[key] === undefined))
    return undefined;
  if (typeof request.query.projectId !== "string")
    throw new HttpError(
      400,
      "PROJECT_REQUIRED",
      "La paginación y los filtros requieren projectId.",
    );
  const integer = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^\d+$/.test(value) || Number(value) > max)
      throw new HttpError(400, "INVALID_PAGINATION", "Revisa los límites de la página.");
    return Number(value);
  };
  const limit = integer(request.query.limit, 50, 100),
    offset = integer(request.query.offset, 0, 1000000);
  const search = request.query.search,
    status = request.query.status;
  if (
    limit < 1 ||
    (search !== undefined && (typeof search !== "string" || search.length > 200)) ||
    (status !== undefined && (typeof status !== "string" || !statuses.includes(status)))
  )
    throw new HttpError(400, "INVALID_FILTER", "Revisa los filtros y la página.");
  return {
    limit,
    offset,
    ...(typeof search === "string" ? { search } : {}),
    ...(typeof status === "string" ? { status } : {}),
  };
}
export function listSql(
  alias: string,
  projectId: string | undefined,
  options: ListQuery | undefined,
  searchColumns: readonly string[],
) {
  const values: (string | number)[] = [];
  const bind = (value: string | number) => {
    values.push(value);
    return `$${values.length}`;
  };
  const where: string[] = [];
  if (projectId) where.push(`${alias}.project_id=${bind(projectId)}`);
  if (options?.status) where.push(`${alias}.status=${bind(options.status)}`);
  if (options?.search?.trim()) {
    const placeholder = bind(`%${options.search.trim().replace(/[\\%_]/g, "\\$&")}%`);
    where.push(
      `(${searchColumns.map((column) => `${column} ILIKE ${placeholder} ESCAPE '\\'`).join(" OR ")})`,
    );
  }
  return {
    sql: `${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${alias}.id DESC${options ? ` LIMIT ${bind(options.limit)} OFFSET ${bind(options.offset)}` : ""}`,
    values,
  };
}
