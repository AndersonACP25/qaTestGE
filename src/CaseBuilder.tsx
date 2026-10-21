import { useCaseDesignController } from "./controllers/useCaseDesignController";
import CaseDesignView from "./views/CaseDesignView";
import type { CaseCountDefaults } from "./models/caseCountDefaults";

export default function CaseBuilder({
  defaultCounts,
  projectId,
}: { defaultCounts?: CaseCountDefaults; projectId?: string } = {}) {
  const controller = useCaseDesignController(defaultCounts, projectId);
  return <CaseDesignView {...controller} />;
}
