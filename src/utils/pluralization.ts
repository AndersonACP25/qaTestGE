const spanishPlurals = new Intl.PluralRules("es");

/** Pass complete phrases so nouns, adjectives and verbs agree together. */
export function pluralize(count: number, singular: string, plural: string): string {
  return spanishPlurals.select(count) === "one" ? singular : plural;
}

export function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${pluralize(count, singular, plural)}`;
}
