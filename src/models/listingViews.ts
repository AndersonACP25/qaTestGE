export const defaultListingFilters = {
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
export type ListingFilterState = typeof defaultListingFilters;
