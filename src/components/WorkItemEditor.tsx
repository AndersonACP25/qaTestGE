import TagPicker from "../TagPicker";
import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
const properties = new Set([
  "priority",
  "status",
  "severity",
  "environment",
  "affectedVersion",
  "assignee",
  "assigneeUserId",
  "testType",
  "lifecycle",
  "suite",
  "owner",
  "ownerUserId",
]);
function nodes(children: ReactNode, path = "root"): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(children).flatMap((node, index) => {
    if (!isValidElement<Record<string, unknown>>(node)) return [];
    const key = `${path}:${String(node.key ?? index)}`;
    return node.type === Fragment
      ? nodes(node.props.children as ReactNode, key)
      : [cloneElement(node, { key })];
  });
}
function names(node: ReactElement<Record<string, unknown>>): string[] {
  return [
    ...(typeof node.props.name === "string" ? [node.props.name] : []),
    ...nodes(node.props.children as ReactNode).flatMap(names),
  ];
}
export default function WorkItemEditor({
  enabled = true,
  kind,
  id = "Nuevo",
  children,
}: {
  enabled?: boolean;
  kind: "bug" | "case" | "run";
  id?: string;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  const fields = nodes(children);
  const title = fields.filter((field) => names(field).includes("title"));
  const assignee = fields.filter(
    (field) =>
      field.props["data-editor-property"] === "assignee" || names(field).includes("ownerUserId"),
  );
  const metadata = fields.filter(
    (field) =>
      field.type === TagPicker ||
      field.props["data-editor-property"] ||
      names(field).some((name) => properties.has(name)),
  );
  const propertyFields = metadata.filter((field) => !assignee.includes(field));
  const body = fields.filter(
    (field) => !title.includes(field) && !metadata.includes(field) && !assignee.includes(field),
  );
  return (
    <div className={`work-item-editor work-item-editor--${kind}`}>
      <header className="work-item-editor__header">
        <div className="work-item__type">
          <span className="work-item__type-dot" />
          {{ bug: "Bug", case: "Test Case", run: "Test Run" }[kind]}
          <span className="work-item__id record-view__id">{id}</span>
        </div>
        {title}
        <div className="work-item-editor__assignee">{assignee}</div>
      </header>
      <section className="work-item-editor__properties" aria-label="Propiedades del registro">
        {propertyFields.filter((field) => field.type !== TagPicker)}
        {propertyFields.filter((field) => field.type === TagPicker)}
      </section>
      <section className="work-item-editor__body" aria-label="Contenido del registro">
        {body}
      </section>
    </div>
  );
}
