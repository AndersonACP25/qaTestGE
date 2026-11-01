export interface MentionSelection {
  start: number;
  end: number;
  id: string;
  name: string;
}
export interface MentionDraft {
  text: string;
  selections: MentionSelection[];
}
const token = /@\[([^\]\r\n]{1,100})\]\(user:([1-9]\d{0,18})\)/g;
export function readMentionDraft(body: string): MentionDraft {
  const selections: MentionSelection[] = [];
  const text = body.replace(token, (_whole: string, name: string, id: string, offset: number) => {
    const start =
      offset -
      selections.reduce(
        (sum, m) => sum + (`@[${m.name}](user:${m.id})`.length - (m.end - m.start)),
        0,
      );
    selections.push({ start, end: start + name.length + 1, id, name });
    return `@${name}`;
  });
  return { text, selections };
}
export function editMentionDraft(draft: MentionDraft, text: string): MentionDraft {
  let start = 0;
  while (start < draft.text.length && start < text.length && draft.text[start] === text[start])
    start++;
  let oldEnd = draft.text.length,
    newEnd = text.length;
  while (oldEnd > start && newEnd > start && draft.text[oldEnd - 1] === text[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  const delta = newEnd - oldEnd;
  return {
    text,
    selections: draft.selections.flatMap((m) => {
      if (m.end <= start) return [m];
      if (m.start >= oldEnd) return [{ ...m, start: m.start + delta, end: m.end + delta }];
      return [];
    }),
  };
}
export function writeMentionDraft(draft: MentionDraft): string {
  let body = draft.text;
  for (const m of [...draft.selections].sort((a, b) => b.start - a.start)) {
    if (
      body.slice(m.start, m.end) === `@${m.name}` &&
      !/[\p{L}\p{N}_@]/u.test(body.charAt(m.start - 1)) &&
      !/[\p{L}\p{N}_]/u.test(body.charAt(m.end))
    )
      body = body.slice(0, m.start) + `@[${m.name}](user:${m.id})` + body.slice(m.end);
  }
  return body;
}
