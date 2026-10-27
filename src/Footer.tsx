export default function Footer({
  status,
  version,
  compact = false,
}: {
  status: string;
  version?: string;
  compact?: boolean;
}) {
  return (
    <footer className={`app-footer${compact ? " app-footer--compact" : ""}`}>
      <span className="app-footer__metadata">
        © {new Date().getFullYear()} qaTestGE{version ? ` · v${version}` : ""}
      </span>
      <span className="app-footer__status">{status}</span>
    </footer>
  );
}
