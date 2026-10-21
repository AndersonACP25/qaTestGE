import { useCaseDesignController } from "./controllers/useCaseDesignController";
import CaseDesignView from "./views/CaseDesignView";

export default function CaseBuilder() {
  const controller = useCaseDesignController();
  return <CaseDesignView {...controller} />;
}
