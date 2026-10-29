import type { CaseCategory } from "./models/caseDesign.model";
import { useCaseDesignController } from "./controllers/useCaseDesignController";
import CaseDesignView from "./views/CaseDesignView";
import type { CaseCountDefaults } from "./models/caseCountDefaults";

export default function CaseBuilder({
  catalog,
  defaultCounts,
  projectId,
  defaultSelectedCategories,
}: {
  catalog?: CaseCategory[];
  defaultCounts?: CaseCountDefaults;
  projectId?: string;
  defaultSelectedCategories?: string[];
} = {}) {
  const controller = useCaseDesignController(
    defaultCounts,
    projectId,
    defaultSelectedCategories,
    catalog,
  );
  return <CaseDesignView {...controller} />;
}
