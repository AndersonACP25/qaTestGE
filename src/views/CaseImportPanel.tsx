import ImportPanel from "./ImportPanel";
export default function CaseImportPanel(props: { projectId: string; onChanged: () => void }) {
  return <ImportPanel {...props} kind="cases" />;
}
