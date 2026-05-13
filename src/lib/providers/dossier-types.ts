// Public types + constants for the dossier scenarios. Safe for client and
// server use (no SDK imports, no env access). The actual generator lives in
// dossier.ts and is server-only.

import type { StackedDecision } from "@/lib/decide";

export type ScenarioOutcome =
  | "DENY"
  | "APPROVE"
  | "APPROVE_2X_DEPOSIT"
  | "APPROVE_3X_DEPOSIT";

export const SCENARIO_OUTCOMES: ScenarioOutcome[] = [
  "DENY",
  "APPROVE",
  "APPROVE_2X_DEPOSIT",
  "APPROVE_3X_DEPOSIT",
];

export const SCENARIO_LABELS: Record<ScenarioOutcome, string> = {
  DENY: "Deny",
  APPROVE: "Approve · 1× deposit",
  APPROVE_2X_DEPOSIT: "Approve · 2× deposit",
  APPROVE_3X_DEPOSIT: "Approve · 3× deposit",
};

export type ScenarioTemplates = {
  slack: string;
  internalEmail: string;
  applicantEmail: string;
};

export type DossierOutput = {
  scenarios: Record<ScenarioOutcome, ScenarioTemplates>;
};

/** Maps the decision engine's StackedDecision → the closest scenario toggle. */
export function decisionToScenarioOutcome(d: StackedDecision): ScenarioOutcome {
  switch (d) {
    case "APPROVED":
      return "APPROVE";
    case "CONDITIONAL_DOUBLE_DEPOSIT":
      return "APPROVE_2X_DEPOSIT";
    case "DENIED":
      return "DENY";
    case "MANUAL_REVIEW":
      // Engine couldn't decide. Default toggle to approve-1× so the operator
      // sees the most common positive case first; they'll switch based on judgment.
      return "APPROVE";
  }
}
