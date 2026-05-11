// Money / number / date formatters. Use these everywhere instead of inline
// toLocaleString — keeps formatting consistent across reviewer + applicant UI.

export function formatUSD(cents: number, opts: { decimals?: 0 | 2 } = {}): string {
  const decimals = opts.decimals ?? 2;
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Like formatUSD but takes whole dollars. Convenience for fixtures. */
export function formatDollars(dollars: number, opts: { decimals?: 0 | 2 } = {}): string {
  return formatUSD(dollars * 100, opts);
}

export function formatMultiplier(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}×`;
}
