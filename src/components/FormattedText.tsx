import type { ReactNode } from "react";

// A deliberately small Markdown subset; content is always escaped by React.
function inline(text: string): ReactNode[] {
  return text
    .split(
      /(@\[[^\]\r\n]{1,100}\]\(user:[1-9]\d{0,18}\)|\*\*[^*\n]+\*\*|\*[^*\n]+\*|~~[^~\n]+~~|`[^`\n]+`)/g,
    )
    .map((part, i) => {
      const mention = /^@\[([^\]]+)\]\(user:\d+\)$/.exec(part);
      if (mention)
        return (
          <strong className="collaboration__mention" key={i}>
            @{mention[1]}
          </strong>
        );
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={i}>{inline(part.slice(2, -2))}</strong>;
      if (part.startsWith("*") && part.endsWith("*"))
        return <em key={i}>{inline(part.slice(1, -1))}</em>;
      if (part.startsWith("~~") && part.endsWith("~~"))
        return <s key={i}>{inline(part.slice(2, -2))}</s>;
      if (part.startsWith("`") && part.endsWith("`"))
        return (
          <code key={i}>{part.slice(1, -1).replace(/@\[([^\]]+)\]\(user:\d+\)/g, "@$1")}</code>
        );
      return part;
    });
}
export default function FormattedText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("- ")) {
      const items: ReactNode[] = [];
      const key = i;
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(<li key={i}>{inline(lines[i].slice(2))}</li>);
        i++;
      }
      i--;
      blocks.push(<ul key={key}>{items}</ul>);
    } else if (lines[i].startsWith("> "))
      blocks.push(<blockquote key={i}>{inline(lines[i].slice(2))}</blockquote>);
    else
      blocks.push(
        <div className="formatted-text__line" key={i}>
          {inline(lines[i])}
        </div>,
      );
  }
  return <div className={`formatted-text ${className}`}>{blocks}</div>;
}
