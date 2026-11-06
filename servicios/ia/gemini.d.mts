type ProposalResult =
  | { ok: true; proposal: unknown }
  | { ok: false; reason: "quota" | "timeout" | "unavailable" | "invalid" };

export interface BugProposalProvider {
  propose(input: { description: string; templateText?: string }): Promise<ProposalResult>;
  summarizeRun?(input: {
    counts: { passed: number; failed: number; blocked: number; skipped: number; pending: number };
    findings: { caseId: string; title: string; status: "failed" | "blocked" }[];
  }): Promise<ProposalResult>;
  proposeCases?(input: {
    description: string;
    categories: { label: string; count: number }[];
  }): Promise<ProposalResult>;
}

export function geminiBugProposalProvider(
  env: { [key: string]: string | undefined },
  priorities: readonly string[],
  fetchRequest?: typeof fetch,
): BugProposalProvider | undefined;

export const defaultGeminiModel: string;
export function verifyGeminiKey(
  key: string,
  model: string,
  fetchRequest?: typeof fetch,
): Promise<"valid" | "rejected" | "quota" | "unavailable" | "timeout">;
