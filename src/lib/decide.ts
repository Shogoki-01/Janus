// Janus decision engine — the core IP.
//
// Pure function. No DB, no I/O. Caller is responsible for loading the inputs.
// Invariant: when ANY required input is missing, return MANUAL_REVIEW. Never
// auto-approve or auto-deny on partial data. This is non-negotiable per
// build-spec.md ("Things to get right that AI tools often miss").
//
// MVP shape: criminal flags are landlord-categorized (NONE/MINOR/MAJOR) from
// the SmartMove PDF, eviction is a boolean. There is no eviction lookback
// window — any reported eviction routes to MANUAL_REVIEW (HUD-aligned). The
// landlord ingests the SmartMove report manually; see
// src/lib/providers/screening.ts.

export type StackedDecision =
  | "APPROVED"
  | "CONDITIONAL_DOUBLE_DEPOSIT"
  | "DENIED"
  | "MANUAL_REVIEW";

export type CriminalSeverity = "NONE" | "MINOR" | "MAJOR";

export type DecisionResult = {
  result: StackedDecision;
  reason: string;
  /**
   * Human-readable factors that contributed to the decision. UI surfaces
   * these in the reviewer dashboard so the override flow is informed.
   */
  factors: string[];
};

export type DecisionApplicantInput = {
  id: string;
  /** Verified monthly income in cents. Null = not yet verified. */
  verifiedMonthlyIncomeCents: number | null;
  /** Null = no SmartMove report ingested yet. */
  creditScore: number | null;
  /** Null = no SmartMove report ingested yet. */
  hasCriminalFlags: CriminalSeverity | null;
  /** Null = no SmartMove report ingested yet. */
  hasEvictionFlags: boolean | null;
};

export type DecisionConfigInput = {
  minCreditScore: number;
  incomeMultiplier: number;
  /**
   * Jurisdiction-derived deposit cap (in months of rent). When < 2, the
   * engine cannot recommend a double-deposit conditional approval and
   * falls back to MANUAL_REVIEW.
   */
  maxDepositMonths: number;
};

export type DecisionApplicationInput = {
  rentCents: number;
  isSection8: boolean;
  /** Required when isSection8 = true; cents. */
  voucherTenantPortionCents: number | null;
  applicants: DecisionApplicantInput[];
  config: DecisionConfigInput;
  /**
   * When false, the engine refuses to decide on the grounds that not every
   * applicant has finished their portion of the workflow (paid platform fee,
   * uploaded docs, completed identity verification, submitted SmartMove
   * report). The caller computes this from the per-applicant state.
   */
  allApplicantsComplete: boolean;
};

const manual = (reason: string, factors: string[] = []): DecisionResult => ({
  result: "MANUAL_REVIEW",
  reason,
  factors,
});

export function decide(input: DecisionApplicationInput): DecisionResult {
  const { applicants, config, rentCents, isSection8 } = input;

  if (!input.allApplicantsComplete) {
    return manual("Not all applicants have completed their portion");
  }
  if (applicants.length === 0) {
    return manual("No applicants on the application");
  }

  // ── 1. Stack income across all applicants ──
  const incomes = applicants.map((a) => a.verifiedMonthlyIncomeCents);
  if (incomes.some((v) => v === null)) {
    return manual("Income not verified for every applicant");
  }
  const totalIncomeCents = (incomes as number[]).reduce((sum, c) => sum + c, 0);

  // ── 2. Required income — Section 8 carve-out ──
  // Per HUD source-of-income guidance: when a Housing Choice Voucher is
  // present, the income multiplier applies to the tenant's portion, NOT the
  // full rent. Applying 3× to full rent is a documented discrimination
  // pattern in protected jurisdictions.
  let requiredIncomeCents: number;
  let incomeBasisLabel: string;
  if (isSection8) {
    if (input.voucherTenantPortionCents == null) {
      return manual("Section 8 application missing tenant portion");
    }
    requiredIncomeCents = Math.round(
      input.voucherTenantPortionCents * config.incomeMultiplier
    );
    incomeBasisLabel = `Section 8 tenant portion (${formatUSD(
      input.voucherTenantPortionCents
    )}/mo × ${config.incomeMultiplier})`;
  } else {
    requiredIncomeCents = Math.round(rentCents * config.incomeMultiplier);
    incomeBasisLabel = `Rent (${formatUSD(rentCents)}/mo × ${config.incomeMultiplier})`;
  }

  const incomePass = totalIncomeCents >= requiredIncomeCents;

  // ── 3. Average credit score across applicants with a score ──
  // We require every applicant to have a SmartMove report ingested before
  // deciding. Anything else means the landlord still has work to do.
  if (applicants.some((a) => a.creditScore === null)) {
    return manual("SmartMove report not yet ingested for every applicant");
  }
  const avgCredit =
    (applicants as Array<Required<DecisionApplicantInput> & { creditScore: number }>).reduce(
      (sum, a) => sum + (a.creditScore as number),
      0
    ) / applicants.length;

  // ── 4. Hard-fail flags ──
  // Per HUD 2016 guidance + 2022 update: blanket criminal bans are
  // prohibited. We route any MAJOR-severity flag to MANUAL_REVIEW so a human
  // performs the individualized assessment. We never auto-deny.
  if (applicants.some((a) => a.hasCriminalFlags === null)) {
    return manual("Criminal-background categorization missing for every applicant");
  }
  if (applicants.some((a) => a.hasEvictionFlags === null)) {
    return manual("Eviction flag missing for every applicant");
  }

  const majorCriminalApplicants = applicants.filter(
    (a) => a.hasCriminalFlags === "MAJOR"
  );
  const evictionApplicants = applicants.filter((a) => a.hasEvictionFlags === true);

  // ── 5. Decision tree ──
  const factors = [
    `Stacked income ${formatUSD(totalIncomeCents)}/mo vs required ${formatUSD(requiredIncomeCents)} (${incomeBasisLabel})`,
    `Average credit score ${Math.round(avgCredit)} across ${applicants.length} applicant(s)`,
  ];

  if (!incomePass) {
    return {
      result: "DENIED",
      reason: "Insufficient income",
      factors: [
        ...factors,
        `Shortfall: ${formatUSD(requiredIncomeCents - totalIncomeCents)}/mo`,
      ],
    };
  }

  if (majorCriminalApplicants.length > 0) {
    return {
      result: "MANUAL_REVIEW",
      reason: "Criminal flag — individualized assessment required per HUD guidance",
      factors: [
        ...factors,
        `${majorCriminalApplicants.length} applicant(s) flagged MAJOR by landlord review of SmartMove PDF`,
      ],
    };
  }

  if (evictionApplicants.length > 0) {
    return {
      result: "MANUAL_REVIEW",
      reason: "Eviction record found — individualized review",
      factors: [
        ...factors,
        `${evictionApplicants.length} applicant(s) with eviction history on SmartMove report`,
      ],
    };
  }

  if (avgCredit >= config.minCreditScore) {
    return {
      result: "APPROVED",
      reason: "Meets all criteria",
      factors,
    };
  }

  // Below credit floor. Recommend double deposit IF jurisdiction permits.
  if (config.maxDepositMonths >= 2) {
    return {
      result: "CONDITIONAL_DOUBLE_DEPOSIT",
      reason: `Average credit ${Math.round(avgCredit)} below threshold ${config.minCreditScore}; double deposit recommended`,
      factors: [
        ...factors,
        `Jurisdiction deposit cap: ${config.maxDepositMonths} month(s) — double deposit permissible`,
      ],
    };
  }
  return {
    result: "MANUAL_REVIEW",
    reason: "Below credit threshold but jurisdiction caps deposit — cannot auto-recommend double deposit",
    factors: [
      ...factors,
      `Jurisdiction deposit cap: ${config.maxDepositMonths} month(s) — double deposit not permissible`,
    ],
  };
}

function formatUSD(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
