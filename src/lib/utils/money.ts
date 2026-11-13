/**
 * Money helpers shared by pricing and order totals.
 *
 * Comparing and summing TL values as floats produces drift (0.1 + 0.2). The
 * codebase rounds every displayed/stored amount to kuruş and uses integer
 * cents whenever two amounts are compared.
 */

export function roundMoney(value: number, precision = 2): number {
  if (!Number.isFinite(value)) return 0;
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

export function toCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

export function fromCents(cents: number): number {
  return roundMoney(cents / 100);
}
