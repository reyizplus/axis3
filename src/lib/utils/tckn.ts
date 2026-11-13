/**
 * Turkish ID number (TCKN) validation.
 *
 * iyzico requires a valid buyer identity number; a wrong value makes the
 * payment fail at the gateway with an opaque error. Validate locally first.
 *
 * Rules: 11 digits, first digit non-zero, plus the two official checksums.
 */
export function isValidTurkishId(value: string | null | undefined): boolean {
  const tckn = (value || '').trim();
  if (!/^[1-9]\d{10}$/.test(tckn)) return false;

  const digits = tckn.split('').map(Number);

  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];

  const tenth = (oddSum * 7 - evenSum) % 10;
  if (tenth !== digits[9]) return false;

  const firstTenSum = digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0);
  return firstTenSum % 10 === digits[10];
}
