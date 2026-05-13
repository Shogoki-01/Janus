// Decision-engine tests. Targets the invariants called out in build-spec.md
// ("Things to get right that AI tools often miss") plus the regressions the
// recent SmartMove pivot introduced (criminal severity → MANUAL_REVIEW;
// any eviction → MANUAL_REVIEW; no eviction lookback window).
//
// Pure-logic file. No mocks, no DB.

import { describe, expect, it } from "vitest";
import {
  decide,
  type DecisionApplicantInput,
  type DecisionApplicationInput,
} from "./decide";

// ───────────────────────── Builders ─────────────────────────
// Small builders so each test only spells out the fields under test. Defaults
// represent a complete, clearly-approvable single-applicant application
// against a US-CA-SF property (credit 720, income 3×rent, no flags).

function approvableApplicant(
  overrides: Partial<DecisionApplicantInput> = {}
): DecisionApplicantInput {
  return {
    id: "ap-1",
    verifiedMonthlyIncomeCents: 1_000_000, // $10,000/mo
    creditScore: 720,
    hasCriminalFlags: "NONE",
    hasEvictionFlags: false,
    ...overrides,
  };
}

function makeInput(
  overrides: Partial<DecisionApplicationInput> = {}
): DecisionApplicationInput {
  return {
    rentCents: 325_000, // $3,250/mo — meets 3× at $10k income
    isSection8: false,
    voucherTenantPortionCents: null,
    applicants: [approvableApplicant()],
    config: {
      minCreditScore: 600,
      incomeMultiplier: 3,
      maxDepositMonths: 2,
    },
    allApplicantsComplete: true,
    ...overrides,
  };
}

// ───────────────────────── Happy paths ─────────────────────────

describe("decide — happy paths", () => {
  it("APPROVED when income, credit, and flags all clear", () => {
    const r = decide(makeInput());
    expect(r.result).toBe("APPROVED");
    expect(r.reason).toMatch(/meets all criteria/i);
  });

  it("DENIED when stacked income is below the multiplier", () => {
    const r = decide(
      makeInput({
        applicants: [
          approvableApplicant({ verifiedMonthlyIncomeCents: 500_000 }), // $5k vs $9,750 required
        ],
      })
    );
    expect(r.result).toBe("DENIED");
    expect(r.reason).toMatch(/insufficient income/i);
    expect(r.factors.some((f) => /shortfall/i.test(f))).toBe(true);
  });

  it("APPROVED when stacked income across roommates clears the bar that one alone wouldn't", () => {
    const r = decide(
      makeInput({
        applicants: [
          approvableApplicant({ id: "ap-1", verifiedMonthlyIncomeCents: 500_000 }),
          approvableApplicant({ id: "ap-2", verifiedMonthlyIncomeCents: 600_000 }),
        ],
      })
    );
    expect(r.result).toBe("APPROVED");
  });

  it("CONDITIONAL_DOUBLE_DEPOSIT when credit dips below threshold and the jurisdiction allows it", () => {
    const r = decide(
      makeInput({
        applicants: [approvableApplicant({ creditScore: 580 })],
        config: { minCreditScore: 600, incomeMultiplier: 3, maxDepositMonths: 2 },
      })
    );
    expect(r.result).toBe("CONDITIONAL_DOUBLE_DEPOSIT");
    expect(r.reason).toMatch(/double deposit/i);
  });
});

// ───────────────────────── Section 8 carve-out ─────────────────────────
//
// HUD source-of-income guidance: when a Housing Choice Voucher is present, the
// income multiplier applies to the tenant's portion, NOT the full rent.
// Applying 3× to full rent is a documented discrimination pattern in protected
// jurisdictions.

describe("decide — Section 8 carve-out", () => {
  it("APPROVES when income covers 3× tenant portion even though it wouldn't cover 3× full rent", () => {
    const r = decide(
      makeInput({
        rentCents: 325_000, // $3,250 — 3× would require $9,750
        isSection8: true,
        voucherTenantPortionCents: 60_000, // $600 — 3× requires $1,800
        applicants: [approvableApplicant({ verifiedMonthlyIncomeCents: 200_000 })], // $2k income
      })
    );
    expect(r.result).toBe("APPROVED");
    expect(r.factors.some((f) => /Section 8 tenant portion/i.test(f))).toBe(true);
  });

  it("DENIES when income is below 3× tenant portion (Section 8 doesn't waive the multiplier — just rebases it)", () => {
    const r = decide(
      makeInput({
        isSection8: true,
        voucherTenantPortionCents: 60_000,
        applicants: [approvableApplicant({ verifiedMonthlyIncomeCents: 100_000 })], // $1k < $1,800 required
      })
    );
    expect(r.result).toBe("DENIED");
  });

  it("MANUAL_REVIEW when Section 8 is flagged but tenant portion is missing", () => {
    const r = decide(
      makeInput({
        isSection8: true,
        voucherTenantPortionCents: null,
      })
    );
    expect(r.result).toBe("MANUAL_REVIEW");
    expect(r.reason).toMatch(/tenant portion/i);
  });
});

// ───────────────────────── Missing-data invariants ─────────────────────────
//
// build-spec.md: "Never auto-approve or auto-deny on partial data." Every
// nullable input below must route to MANUAL_REVIEW.

describe("decide — missing-data invariants (default to MANUAL_REVIEW)", () => {
  it("blocks when allApplicantsComplete is false", () => {
    const r = decide(makeInput({ allApplicantsComplete: false }));
    expect(r.result).toBe("MANUAL_REVIEW");
    expect(r.reason).toMatch(/completed their portion/i);
  });

  it("blocks when any applicant has unverified income", () => {
    const r = decide(
      makeInput({
        applicants: [
          approvableApplicant({ id: "ap-1" }),
          approvableApplicant({ id: "ap-2", verifiedMonthlyIncomeCents: null }),
        ],
      })
    );
    expect(r.result).toBe("MANUAL_REVIEW");
    expect(r.reason).toMatch(/income not verified/i);
  });

  it("blocks when any applicant has no credit score (no SmartMove report yet)", () => {
    const r = decide(
      makeInput({ applicants: [approvableApplicant({ creditScore: null })] })
    );
    expect(r.result).toBe("MANUAL_REVIEW");
    expect(r.reason).toMatch(/SmartMove report/i);
  });

  it("blocks when criminal-flag categorization is missing", () => {
    const r = decide(
      makeInput({ applicants: [approvableApplicant({ hasCriminalFlags: null })] })
    );
    expect(r.result).toBe("MANUAL_REVIEW");
    expect(r.reason).toMatch(/criminal/i);
  });

  it("blocks when eviction flag is missing", () => {
    const r = decide(
      makeInput({ applicants: [approvableApplicant({ hasEvictionFlags: null })] })
    );
    expect(r.result).toBe("MANUAL_REVIEW");
    expect(r.reason).toMatch(/eviction/i);
  });

  it("blocks when the applicants list is empty", () => {
    const r = decide(makeInput({ applicants: [] }));
    expect(r.result).toBe("MANUAL_REVIEW");
    expect(r.reason).toMatch(/no applicants/i);
  });
});

// ───────────────────────── HUD-aligned hard-fail routing ─────────────────────────

describe("decide — HUD-aligned hard-fail routing", () => {
  it("MAJOR criminal → MANUAL_REVIEW (never auto-denies; HUD individualized assessment)", () => {
    const r = decide(
      makeInput({
        applicants: [approvableApplicant({ hasCriminalFlags: "MAJOR" })],
      })
    );
    expect(r.result).toBe("MANUAL_REVIEW");
    expect(r.reason).toMatch(/criminal/i);
    expect(r.reason).toMatch(/individualized/i);
  });

  it("MINOR criminal does NOT block — auto-approves on otherwise clean inputs", () => {
    const r = decide(
      makeInput({
        applicants: [approvableApplicant({ hasCriminalFlags: "MINOR" })],
      })
    );
    expect(r.result).toBe("APPROVED");
  });

  it("any eviction → MANUAL_REVIEW (no lookback window post-SmartMove pivot)", () => {
    const r = decide(
      makeInput({
        applicants: [approvableApplicant({ hasEvictionFlags: true })],
      })
    );
    expect(r.result).toBe("MANUAL_REVIEW");
    expect(r.reason).toMatch(/eviction/i);
  });

  it("criminal MAJOR takes precedence over eviction in the reason", () => {
    // Both flags trip; criminal check runs first in the engine.
    const r = decide(
      makeInput({
        applicants: [
          approvableApplicant({
            hasCriminalFlags: "MAJOR",
            hasEvictionFlags: true,
          }),
        ],
      })
    );
    expect(r.result).toBe("MANUAL_REVIEW");
    expect(r.reason).toMatch(/criminal/i);
  });
});

// ───────────────────────── Deposit-cap fallback ─────────────────────────
//
// When credit dips below threshold AND the jurisdiction caps deposits below
// 2 months (CA, NY, MA, WA), the engine cannot recommend double deposit and
// must fall back to MANUAL_REVIEW.

describe("decide — deposit-cap fallback", () => {
  it("falls back to MANUAL_REVIEW when below credit threshold and jurisdiction caps deposit below 2 months", () => {
    const r = decide(
      makeInput({
        applicants: [approvableApplicant({ creditScore: 580 })],
        config: { minCreditScore: 600, incomeMultiplier: 3, maxDepositMonths: 1 },
      })
    );
    expect(r.result).toBe("MANUAL_REVIEW");
    expect(r.reason).toMatch(/cannot auto-recommend double deposit/i);
    expect(r.factors.some((f) => /not permissible/i.test(f))).toBe(true);
  });

  it("CONDITIONAL_DOUBLE_DEPOSIT path triggers when cap is exactly 2 months", () => {
    const r = decide(
      makeInput({
        applicants: [approvableApplicant({ creditScore: 580 })],
        config: { minCreditScore: 600, incomeMultiplier: 3, maxDepositMonths: 2 },
      })
    );
    expect(r.result).toBe("CONDITIONAL_DOUBLE_DEPOSIT");
  });

  it("income failure beats the deposit-cap fallback — DENIED short-circuits before the credit branch", () => {
    const r = decide(
      makeInput({
        applicants: [
          approvableApplicant({ verifiedMonthlyIncomeCents: 100_000, creditScore: 580 }),
        ],
        config: { minCreditScore: 600, incomeMultiplier: 3, maxDepositMonths: 1 },
      })
    );
    expect(r.result).toBe("DENIED");
  });
});
