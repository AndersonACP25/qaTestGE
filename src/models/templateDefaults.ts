import type { TemplateDefaults } from "../../backend/src/models/design-templates.model";

export function availableTemplateDefaults(
  defaults: TemplateDefaults | undefined,
  tags: readonly { id: string }[],
  members: readonly { id: string }[],
): TemplateDefaults {
  return {
    tagIds: defaults?.tagIds.filter((id) => tags.some((tag) => tag.id === id)) ?? [],
    assigneeUserId: members.find(({ id }) => id === defaults?.assigneeUserId)?.id ?? null,
  };
}
