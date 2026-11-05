import { z } from "zod";
import { withStorageLock } from "./storageLock";

import { isId, parseReference } from "../../backend/src/validation";

const choice = z.string().min(1).max(200);
const filterSchema = z.object({
  search: z.string().max(200),
  statusFilter: choice,
  typeFilter: choice,
  lifecycleFilter: z.enum(["Todos", "Borrador", "Listo", "Obsoleto"]),
  priority: z.enum(["Todos", "Crítica", "Alta", "Media", "Baja"]),
  severity: z.enum(["Todos", "Crítica", "Alta", "Media", "Baja"]),
  assignee: z
    .string()
    .refine((value) => value === "Todos" || value === "Sin asignar" || isId(value)),
  tag: z.string().refine((value) => value === "Todos" || value === "Sin tags" || isId(value)),
  plan: z
    .string()
    .refine(
      (value) => value === "Todos" || value === "Sin plan" || !!parseReference(value, "PLAN"),
    ),
});
export type ListingFilterState = Record<keyof z.infer<typeof filterSchema>, string>;
export const defaultListingFilters: ListingFilterState = {
  search: "",
  statusFilter: "Todos",
  typeFilter: "Todos",
  lifecycleFilter: "Todos",
  priority: "Todos",
  severity: "Todos",
  assignee: "Todos",
  tag: "Todos",
  plan: "Todos",
};

const nameSchema = z.string().trim().min(1).max(60);
const viewSchema = z.object({ id: z.uuid(), name: nameSchema, filters: filterSchema });
export type SavedListingView = z.infer<typeof viewSchema>;
const maxViews = 20;
const documentSchema = z.object({
  version: z.literal(1),
  views: z.array(viewSchema).max(maxViews),
});
export const listingViewsKey = (userId: string, projectId: string, kind: string) =>
  `qatestge-listing-views-v1:${userId}:${projectId}:${kind}`;

export function readListingViews(key: string) {
  const stored = localStorage.getItem(key);
  if (stored === null) return [];
  try {
    return documentSchema.parse(JSON.parse(stored)).views;
  } catch {
    throw new Error("Los datos de las vistas guardadas no son válidos.");
  }
}

export function changeListingViews(
  key: string,
  action: { name: string; filters: ListingFilterState } | { deleteId: string },
) {
  return withStorageLock(key, () => {
    const views = readListingViews(key);
    if ("deleteId" in action) {
      const remaining = views.filter((view) => view.id !== action.deleteId);
      localStorage.setItem(key, JSON.stringify({ version: 1, views: remaining }));
      return remaining;
    }
    const name = nameSchema.safeParse(action.name);
    const filters = filterSchema.safeParse(action.filters);
    if (!name.success || !filters.success) throw new Error("Revisa el nombre y los filtros.");
    if (views.length >= maxViews)
      throw new Error("Puedes guardar hasta 20 vistas en este listado.");
    if (
      views.some((view) => view.name.toLocaleLowerCase("es") === name.data.toLocaleLowerCase("es"))
    )
      throw new Error("Ya hay una vista con ese nombre.");
    const updated = [...views, { id: crypto.randomUUID(), name: name.data, filters: filters.data }];
    localStorage.setItem(key, JSON.stringify({ version: 1, views: updated }));
    return updated;
  });
}
