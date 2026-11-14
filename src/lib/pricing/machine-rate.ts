/**
 * Makine saatlik ücreti (saf hesap)
 *
 * Kural:
 * - Amortisman kutusuna saatlik ücret girilmişse (hourly_rate > 0) o kullanılır.
 * - Saatlik ücret 0 ise ücret, adminin girdiği **makine fiyatından** türetilir:
 *     (purchase_cost / depreciation_months + monthly_maintenance) / 160 saat
 * - Ne saatlik ücret ne de makine fiyatı varsa ücret 0'dır. Kod içinde gömülü
 *   bir varsayılan fiyat YOKTUR: sessizce uydurulmuş bir makine maliyeti,
 *   müşteriye gösterilen fiyatın DB'deki ayarlarla açıklanamaması demekti.
 */

/** Amortismanı saatlik ücrete çevirirken kullanılan aylık çalışma saati (8 saat × 20 gün). */
export const MACHINE_HOURS_PER_MONTH = 160;

export interface MachineRateRow {
  hourly_rate?: unknown;
  purchase_cost?: unknown;
  depreciation_months?: unknown;
  monthly_maintenance?: unknown;
  is_active?: unknown;
}

export interface MachineRateResult {
  hourlyRate: number;
  /** Ayar okunabildi mi (saatlik ücret veya makine fiyatı). */
  configured: boolean;
  /** Ücret, makine fiyatı + amortismandan mı türetildi? */
  derived: boolean;
}

function toNonNegativeNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function resolveMachineHourlyRate(
  row: MachineRateRow | null | undefined
): MachineRateResult {
  if (!row) {
    return { hourlyRate: 0, configured: false, derived: false };
  }

  const hourlyRate = toNonNegativeNumber(row.hourly_rate);
  if (hourlyRate > 0) {
    return { hourlyRate, configured: true, derived: false };
  }

  const purchaseCost = toNonNegativeNumber(row.purchase_cost);
  const depreciationMonths = toNonNegativeNumber(row.depreciation_months);
  const monthlyMaintenance = toNonNegativeNumber(row.monthly_maintenance);

  if (purchaseCost > 0 && depreciationMonths > 0) {
    const monthlyCost = purchaseCost / depreciationMonths + monthlyMaintenance;
    const derivedRate = monthlyCost / MACHINE_HOURS_PER_MONTH;
    if (derivedRate > 0) {
      return { hourlyRate: derivedRate, configured: true, derived: true };
    }
  }

  return { hourlyRate: 0, configured: false, derived: false };
}
