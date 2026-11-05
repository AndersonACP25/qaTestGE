export interface BugProposalProvider {
  propose(input: {
    description: string;
    templateText?: string;
  }): Promise<
    | { ok: true; proposal: unknown }
    | { ok: false; reason: "quota" | "timeout" | "unavailable" | "invalid" }
  >;
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
