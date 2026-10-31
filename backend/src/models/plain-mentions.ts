import { HttpError } from "../http-error.js";
/** Resolve exact display names only; duplicate names require a stable selection. */
export function resolvePlainMentions(
  body: string,
  members: { id: string; name: string }[],
): string {
  const byName = new Map<string, typeof members>();
  for (const member of members) {
    if (/[\]\r\n]/.test(member.name)) continue;
    const key = member.name.normalize("NFC").toLocaleLowerCase("es");
    byName.set(key, [...(byName.get(key) ?? []), member]);
  }
  if (!byName.size) return body;
  const names = [...byName.keys()]
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}_@\\[])@(${names.join("|")})(?=$|[\\s,.!?;:)])`,
    "giu",
  );
  const result = body.replace(pattern, (whole: string, prefix: string, name: string) => {
    const candidates = byName.get(name.normalize("NFC").toLocaleLowerCase("es"));
    if (!candidates) return whole;
    if (candidates.length !== 1)
      throw new HttpError(
        400,
        "AMBIGUOUS_MENTION",
        `Hay varios integrantes llamados ${name}. Selecciona la persona en las sugerencias de @.`,
      );
    const member = candidates[0];
    return `${prefix}@[${member.name}](user:${member.id})`;
  });
  if (result.length > 5000)
    throw new HttpError(
      400,
      "COMMENT_TOO_LONG",
      "El comentario con sus menciones supera 5000 caracteres. Reduce el texto.",
    );
  return result;
}
