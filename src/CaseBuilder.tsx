import { useCaseDesignController } from "./controllers/useCaseDesignController";
import CaseDesignView from "./views/CaseDesignView";
import type { CaseCountDefaults } from "./models/caseCountDefaults";

export default function CaseBuilder({ defaultCounts }: { defaultCounts?: CaseCountDefaults } = {}) {
  const controller = useCaseDesignController(defaultCounts);
  return <CaseDesignView {...controller} />;
}
