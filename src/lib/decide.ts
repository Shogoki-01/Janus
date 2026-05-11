// Janus decision engine — the core IP.
//
// Pure function. No DB, no I/O. Caller is responsible for loading the inputs.
// Invariant: when ANY required input is missing, return MANUAL_REVIEW. Never
// auto-approve or auto-deny on partial data. This is non-negotiable per
// build-spec.md ("Things to get right that AI tools often miss").

export type StackedDecision =
  | "APPROVED"
  | "CONDITIONAL_DOUBLE_DEPOSIT"
  | "DENIED"
  | "MANUAL_REVIEW";

export type DecisionResult = {
  result: StackedDecision;
  reason: string;
  /**
   * Human-readable factors that contributed to the decision. UI surfaces
   * these in the reviewer dashboard so the override flow is informed.
   */
  factors: string[];
};

export type CriminalFlag = {
  /** Offense category. Match against config.disqualifyingOffenses. */
  type: string;
  date: string; // ISO
  description?: string;
};

export type EvictionFlag = {
  date: string; // ISO
  description?: string;
};

export type DecisionApplicantInput = {
  id: string;
  /** Verified monthly income in cents. Null = not yet verified. */
  verifiedMonthlyIncomeCents: number | null;
  /** Null = no credit pulled or no score returned. */
  creditScore: number | null;
  criminalFlags: CriminalFlag[] | null;
  evictionFlags: EvictionFlag[] | null;
};

export type DecisionConfigInput = {
  minCreditScore: number;
  incomeMultiplier: number;
  evictionLookbackYears: number;
  disqualifyingOffenses: string[];
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
   * applicant has finished their portion of the workflow. The caller computes
   * this from invite + payment + screening status.
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
  const scoredApplicants = applicants.filter((a) => a.creditScore !== null);
  if (scoredApplicants.length === 0) {
    return manual("No credit scores returned for any applicant");
  }
  const avgCredit =
    scoredApplicants.reduce((sum, a) => sum + (a.creditScore as number), 0) /
    scoredApplicants.length;

  // ── 4. Hard-fail flags ──
  // Per HUD 2016 guidance + 2022 update: blanket criminal bans are
  // prohibited. We route any disqualifying-offense match to MANUAL_REVIEW so
  // a human performs the individualized assessment. We never auto-deny.
  if (applicants.some((a) => a.criminalFlags === null)) {
    return manual("Criminal-background check not returned for every applicant");
  }
  const criminalHit = applicants.flatMap((a) =>
    (a.criminalFlags ?? []).filter((f) =>
      config.disqualifyingOffenses.includes(f.type)
    )
  );
  const hasDisqualifyingCriminal = criminalHit.length > 0;

  if (applicants.some((a) => a.evictionFlags === null)) {
    return manual("Eviction history not returned for every applicant");
  }
  const lookbackMs = config.evictionLookbackYears * 365 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const recentEviction = applicants.some((a) =>
    (a.evictionFlags ?? []).some(
      (f) => now - new Date(f.date).getTime() < lookbackMs
    )
  );

  // ── 5. Decision tree ──
  const factors = [
    `Stacked income ${formatUSD(totalIncomeCents)}/mo vs required ${formatUSD(requiredIncomeCents)} (${incomeBasisLabel})`,
    `Average credit score ${Math.round(avgCredit)} across ${scoredApplicants.length} applicant(s)`,
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

  if (hasDisqualifyingCriminal) {
    return {
      result: "MANUAL_REVIEW",
      reason: "Criminal flag — individualized assessment required (HUD guidance)",
      factors: [
        ...factors,
        `Matched offense categor${criminalHit.length === 1 ? "y" : "ies"}: ${criminalHit
          .map((f) => f.type)
          .join(", ")}`,
      ],
    };
  }

  if (recentEviction) {
    return {
      result: "DENIED",
      reason: "Recent eviction within lookback window",
      factors: [
        ...factors,
        `Eviction lookback window: ${config.evictionLookbackYears} year(s)`,
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
