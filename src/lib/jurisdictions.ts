// Jurisdiction caps lookup for application fees and security deposits.
//
// Sources: state statutes + city ordinances. Numbers are point-in-time; review
// annually. When a landlord configures a property, we look up the most specific
// match (city → state → country) and use that to clamp configurable values:
//
//   • Fee above the cap → block save with a warning.
//   • Deposit cap below 2× rent → decision engine cannot auto-recommend
//     double deposit; falls back to MANUAL_REVIEW (see lib/decide.ts).
//
// Jurisdiction keys follow ISO-style "US-CA" / "US-CA-SF" / "US-WA-SEA". The
// lookup walks from most specific to most general.

export type FeeCap = {
  /** Maximum application fee in cents. null = no statutory cap. */
  maxFeeCents: number | null;
  /** CPI-adjusted? If so, value should be reviewed annually. */
  cpiAdjusted?: boolean;
  /** Citation / note for the reviewer UI. */
  note?: string;
};

export type DepositCap = {
  /**
   * Maximum security deposit expressed in months of rent.
   * Decision engine treats < 2 as blocking the auto double-deposit path.
   */
  maxMonths: number;
  note?: string;
};

// ────────────────── Application fee caps ──────────────────
// Conservative defaults. Where the law indexes to CPI, we record the
// most recent published figure and flag for annual review.
const FEE_CAPS: Record<string, FeeCap> = {
  "US-CA": {
    maxFeeCents: 6202, // $62.02 — 2026 figure, CPI-adjusted from $30 (1997)
    cpiAdjusted: true,
    note: "California: CPI-adjusted cap; review annually (Civ. Code § 1950.6)",
  },
  "US-NY": {
    maxFeeCents: 2000, // $20 — Housing Stability and Tenant Protection Act of 2019
    note: "New York: $20 statutory cap (background-check + application combined)",
  },
  "US-WI": {
    maxFeeCents: 2500, // $25
    note: "Wisconsin: $25 cap; pass-through credit-check cost is separate",
  },
  "US-MA": {
    maxFeeCents: 0,
    note: "Massachusetts: application fees prohibited (G.L. c. 186 § 15B)",
  },
  "US-WA-SEA": {
    maxFeeCents: null,
    note: "Seattle: actual cost of report only; require itemized receipt",
  },
};

// ────────────────── Security deposit caps (months of rent) ──────────────────
const DEPOSIT_CAPS: Record<string, DepositCap> = {
  "US-CA": {
    // AB 12 (eff. 2024): 1 month for most landlords; 2 months for small
    // landlords (≤ 2 properties / ≤ 4 units, natural-person owner).
    // Conservative default: 1. Per-property override can set this to 2 with
    // proof of small-landlord status.
    maxMonths: 1,
    note: "California AB 12 (2024): 1 month cap for most landlords; 2 months for qualifying small landlords",
  },
  "US-NY": {
    maxMonths: 1,
    note: "New York: 1 month cap (Real Property Law § 7-108)",
  },
  "US-MA": {
    maxMonths: 1,
    note: "Massachusetts: 1 month cap (G.L. c. 186 § 15B)",
  },
  "US-NJ": {
    maxMonths: 1.5,
    note: "New Jersey: 1.5 months cap (Rent Security Deposit Act)",
  },
  "US-WA": {
    maxMonths: 1,
    note: "Washington: 1 month cap on non-refundable + refundable combined for many cases",
  },
};

// ────────────────── Walk the hierarchy ──────────────────
function walkUp(jurisdiction: string): string[] {
  // "US-CA-SF" → ["US-CA-SF", "US-CA", "US"]
  const parts = jurisdiction.split("-");
  const chain: string[] = [];
  for (let i = parts.length; i > 0; i--) {
    chain.push(parts.slice(0, i).join("-"));
  }
  return chain;
}

export function getFeeCap(jurisdiction: string): FeeCap | null {
  for (const key of walkUp(jurisdiction)) {
    if (FEE_CAPS[key]) return FEE_CAPS[key];
  }
  return null;
}

export function getDepositCap(jurisdiction: string): DepositCap | null {
  for (const key of walkUp(jurisdiction)) {
    if (DEPOSIT_CAPS[key]) return DEPOSIT_CAPS[key];
  }
  return null;
}

/**
 * Convenience: derive the effective `maxDepositMonths` used by the decision
 * engine. Defaults to 2 (i.e. double deposit allowed) when no statutory cap
 * is on file for the jurisdiction.
 */
export function effectiveMaxDepositMonths(jurisdiction: string): number {
  return getDepositCap(jurisdiction)?.maxMonths ?? 2;
}
