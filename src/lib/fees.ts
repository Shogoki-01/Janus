// Lease fee catalog. Dollar amounts are fixed constants here; per-case
// applicability is stored as booleans on Application (feeInternetCable,
// feeResidentBenefits, feeAdminOneTime). When we later need per-property
// or per-org overrides, this module is the single place to grow toward
// a real catalog table.

export const FEE_INTERNET_CABLE_CENTS = 9_800; // $98/mo
export const FEE_RESIDENT_BENEFITS_CENTS = 5_000; // $50/mo
export const FEE_ADMIN_ONE_TIME_CENTS = 12_500; // $125 one-time at move-in

export type LeaseFeeFlags = {
  feeInternetCable: boolean;
  feeResidentBenefits: boolean;
  feeAdminOneTime: boolean;
};

export type LeaseFeeBreakdown = {
  /** Active recurring fees and the dollar amount each. */
  monthly: Array<{ key: string; label: string; cents: number }>;
  /** Active one-time fees (charged at move-in). */
  oneTime: Array<{ key: string; label: string; cents: number }>;
  /** Sum of monthly recurring fee cents. */
  monthlyFeesCents: number;
  /** Sum of one-time fee cents. */
  oneTimeFeesCents: number;
};

export function breakdownFees(flags: LeaseFeeFlags): LeaseFeeBreakdown {
  const monthly: LeaseFeeBreakdown["monthly"] = [];
  const oneTime: LeaseFeeBreakdown["oneTime"] = [];
  if (flags.feeInternetCable) {
    monthly.push({
      key: "INTERNET_CABLE",
      label: "Internet & cable",
      cents: FEE_INTERNET_CABLE_CENTS,
    });
  }
  if (flags.feeResidentBenefits) {
    monthly.push({
      key: "RESIDENT_BENEFITS",
      label: "Resident benefits package",
      cents: FEE_RESIDENT_BENEFITS_CENTS,
    });
  }
  if (flags.feeAdminOneTime) {
    oneTime.push({
      key: "ADMIN_ONE_TIME",
      label: "One-time admin fee",
      cents: FEE_ADMIN_ONE_TIME_CENTS,
    });
  }
  return {
    monthly,
    oneTime,
    monthlyFeesCents: monthly.reduce((acc, f) => acc + f.cents, 0),
    oneTimeFeesCents: oneTime.reduce((acc, f) => acc + f.cents, 0),
  };
}

/** Total recurring monthly amount = rent + all active monthly fees (in cents). */
export function totalMonthlyCents(rentCents: number, flags: LeaseFeeFlags): number {
  return rentCents + breakdownFees(flags).monthlyFeesCents;
}
