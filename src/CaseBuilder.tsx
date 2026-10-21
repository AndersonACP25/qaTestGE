import { useCaseDesignController } from "./controllers/useCaseDesignController";
import CaseDesignView from "./views/CaseDesignView";
import type { CaseCountDefaults } from "./models/caseCountDefaults";

export default function CaseBuilder({
  defaultCounts,
  projectId,
  defaultSelectedCategories,
}: {
  defaultCounts?: CaseCountDefaults;
  projectId?: string;
  defaultSelectedCategories?: string[];
} = {}) {
  const controller = useCaseDesignController(defaultCounts, projectId, defaultSelectedCategories);
  return <CaseDesignView {...controller} />;
}
