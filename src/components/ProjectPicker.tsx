import type { ChangeEventHandler } from "react";
import type { Project } from "../api";
export default function ProjectPicker({
  projects,
  value,
  disabled,
  onChange,
}: {
  projects: Project[];
  value: string;
  disabled: boolean;
  onChange: ChangeEventHandler<HTMLSelectElement>;
}) {
  return (
    <label className="project-picker">
      <span className="project-picker__label">Proyecto</span>
      <span className="project-picker__control">
        <span className="project-picker__icon" aria-hidden="true">
          ▦
        </span>
        <select aria-label="Proyecto" disabled={disabled} value={value} onChange={onChange}>
          <option value="" disabled>
            Selecciona un proyecto
          </option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name} · #{project.id}
            </option>
          ))}
        </select>
        <span className="project-picker__chevron" aria-hidden="true">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </span>
    </label>
  );
}
