import type { TestCase } from "./types";
import { useState } from "react";
import type { CaseTemplate } from "../backend/src/models/design-templates.model";
import type { CaseCategory } from "./models/caseDesign.model";
import {
  useCaseDesignController,
  type CaseDesignOrigin,
} from "./controllers/useCaseDesignController";
import CaseDesignView from "./views/CaseDesignView";
import type { CaseCountDefaults } from "./models/caseCountDefaults";

export default function CaseBuilder({
  canProposeWithGemini = false,
  canSave = false,
  origin,
  onSaved,
  catalog,
  defaultCounts,
  projectId,
  defaultSelectedCategories,
  templates = [],
  onOpenTemplate,
}: {
  canProposeWithGemini?: boolean;
  canSave?: boolean;
  origin?: CaseDesignOrigin;
  onSaved?: (testCase: TestCase) => void;
  catalog?: CaseCategory[];
  defaultCounts?: CaseCountDefaults;
  projectId?: string;
  defaultSelectedCategories?: string[];
  templates?: CaseTemplate[];
  onOpenTemplate?: (template: CaseTemplate) => void;
} = {}) {
  const controller = useCaseDesignController(
    defaultCounts,
    projectId,
    defaultSelectedCategories,
    catalog,
    origin,
    onSaved,
  );
  const [templateId, setTemplateId] = useState("");
  const selected = templates.find(({ id }) => id === templateId);
  return (
    <div className="layout__stack">
      {onOpenTemplate && templates.length > 0 && (
        <div className="workspace__panel layout__panel layout__stack">
          <h2 className="typography__section">Diseñar desde una plantilla</h2>
          <p>Abre un borrador editable con los pasos, tags y responsable del proyecto.</p>
          <div className="layout__actions">
            <label className="workspace__field">
              Plantilla de caso
              <select
                value={selected?.id ?? ""}
                onChange={(event) => setTemplateId(event.target.value)}
              >
                <option value="">Selecciona una plantilla</option>
                {templates.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="workspace__secondary"
              disabled={!selected}
              onClick={() => {
                if (selected) onOpenTemplate(selected);
              }}
            >
              Preparar caso
            </button>
          </div>
        </div>
      )}
      <CaseDesignView
        {...controller}
        canProposeWithGemini={canProposeWithGemini}
        canSave={canSave}
      />
    </div>
  );
}
