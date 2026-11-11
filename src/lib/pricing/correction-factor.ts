/**
 * Experience Correction Factor (ECF)
 * 
 * Axis3 v2 Pricing System
 * 
 * Deneyimsel Düzeltme Katsayısı - Gerçekçi baskı süresi hesaplaması
 * için ek süre katsayıları. CuraEngine'den gelen 'ideal' süreyi
 * gerçek üretim koşullarına uyarlar.
 * 
 * Varsayılan değerler:
 * - Isınma Süresi: 15 dk
 * - Kalibrasyon Süresi: 5 dk
 * - Tabla Hazırlık: 3 dk
 * - Parça Başı Ölü Zaman: 2 dk
 */

import { createClient } from '@/lib/supabase/client';
import type { CorrectionCoefficients, CorrectedTimeResult } from './types';

// =====================================================
// DEFAULT COEFFICIENTS (Standart)
// =====================================================

const DEFAULT_COEFFICIENTS: CorrectionCoefficients = {
  warmUpMinutes: 5,
  calibrationMinutes: 3,
  bedPrepMinutes: 2,
  deadTimePerPartMinutes: 1,
};

// =====================================================
// CORRECTION FACTOR CLASS
// =====================================================

export class CorrectionFactor {
  private supabase = createClient();
  private cachedCoefficients: CorrectionCoefficients | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 10 * 60 * 1000;

  /**
   * Load coefficients from database or use defaults
   */
  async getCoefficients(): Promise<CorrectionCoefficients> {
    const now = Date.now();
    if (this.cachedCoefficients && now - this.cacheTimestamp < this.CACHE_TTL) {
      return this.cachedCoefficients;
    }

    try {
      const { data, error } = await (this.supabase as any)
        .from('pricing_coefficients')
        .select('key, value_minutes')
        .eq('is_active', true);

      if (error || !data || data.length === 0) {
        return DEFAULT_COEFFICIENTS;
      }

      const map = new Map<string, number>();
      (data as { key: string; value_minutes: number }[]).forEach((row) => {
        map.set(row.key, row.value_minutes);
      });

      const coefficients: CorrectionCoefficients = {
        warmUpMinutes: map.get('warm_up_time') ?? DEFAULT_COEFFICIENTS.warmUpMinutes,
        calibrationMinutes: map.get('calibration_time') ?? DEFAULT_COEFFICIENTS.calibrationMinutes,
        bedPrepMinutes: map.get('bed_prep_time') ?? DEFAULT_COEFFICIENTS.bedPrepMinutes,
        deadTimePerPartMinutes: map.get('dead_time_per_part') ?? DEFAULT_COEFFICIENTS.deadTimePerPartMinutes,
      };

      this.cachedCoefficients = coefficients;
      this.cacheTimestamp = now;
      return coefficients;
    } catch {
      return DEFAULT_COEFFICIENTS;
    }
  }

  /**
   * Apply correction factor to raw print time
   * 
   * @param rawPrintTimeHours - CuraEngine'den gelen ideal baskı süresi (saat)
   * @param partCount - Parça sayısı (varsayılan: 1)
   * @returns Düzeltilmiş süre sonucu
   */
  async apply(
    rawPrintTimeHours: number,
    partCount: number = 1
  ): Promise<CorrectedTimeResult> {
    const coeff = await this.getCoefficients();

    const warmUpHours = coeff.warmUpMinutes / 60;
    const calibrationHours = coeff.calibrationMinutes / 60;
    const bedPrepHours = coeff.bedPrepMinutes / 60;
    const deadTimeHours = (coeff.deadTimePerPartMinutes * partCount) / 60;

    const additionalTime = warmUpHours + calibrationHours + bedPrepHours + deadTimeHours;
    const totalCorrected = rawPrintTimeHours + additionalTime;

    return {
      rawPrintTimeHours: this.round(rawPrintTimeHours, 2),
      additionalTimeHours: this.round(additionalTime, 2),
      totalCorrectedHours: this.round(totalCorrected, 2),
      breakdown: {
        warmUp: this.round(warmUpHours, 2),
        calibration: this.round(calibrationHours, 2),
        bedPrep: this.round(bedPrepHours, 2),
        deadTime: this.round(deadTimeHours, 2),
      },
    };
  }

  /**
   * Clear cache (for testing or after admin update)
   */
  clearCache(): void {
    this.cachedCoefficients = null;
    this.cacheTimestamp = 0;
  }

  private round(value: number, precision: number): number {
    const multiplier = Math.pow(10, precision);
    return Math.round(value * multiplier) / multiplier;
  }
}

export const correctionFactor = new CorrectionFactor();
