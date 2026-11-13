/**
 * Pricing Engine - database-backed loader around the pure pricing core.
 *
 * The math lives in `./core.ts`. This class only resolves the current
 * material/machine/labor/settings values and calls `computeQuote`, so the
 * browser preview and the server-side order creation run the exact same rules.
 */

import { createClient } from '@/lib/supabase/client';
import { CorrectionFactor } from './correction-factor';
import { DeliveryCalculator } from '@/lib/utils/delivery-calculator';
import { computeQuote, PricingError } from './core';
import type { QuantityDiscountTier } from './core';

import type {
  PricingInput,
  PricingResult,
  PriceBreakdown as PricingPriceBreakdown,
} from './types';

export type { PricingInput, PricingResult };

const DEFAULT_WASTE_PERCENTAGE = 10.0;
const DEFAULT_FILAMENT_BUFFER = 1.05;

const warnedOnce = new Set<string>();

function warnOnce(key: string, message: string) {
  if (warnedOnce.has(key)) return;
  warnedOnce.add(key);
  console.warn(`[PricingEngine] ${message}`);
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// =====================================================
// PRICING ENGINE CLASS
// =====================================================

export class PricingEngine {
  private client: any = null;
  private correctionFactor: CorrectionFactor;
  private deliveryCalculator: DeliveryCalculator;

  /**
   * @param client Optional Supabase client. Server-side code MUST pass a server
   *               client; when omitted the browser client is used.
   */
  constructor(client?: any) {
    this.client = client ?? null;
    const resolved = client ?? undefined;
    this.correctionFactor = new CorrectionFactor(resolved);
    this.deliveryCalculator = new DeliveryCalculator(resolved);
  }

  private get supabase(): any {
    if (!this.client) this.client = createClient();
    return this.client;
  }

  async calculatePrice(input: PricingInput): Promise<PricingResult> {
    try {
      const [material, machine, labor, riskPremium, electricity, serviceFee, profit, coefficients] =
        await Promise.all([
          this.getMaterial(input.materialId),
          this.getMachineRate(input.machineType),
          this.getLaborSettings(input.technology),
          this.getRiskPremium(input.technology),
          this.getElectricityRate(),
          this.getServiceFee(),
          this.getProfitMarginMultiplier(),
          this.correctionFactor.getCoefficients(),
        ]);

      if (!material) {
        return this.errorResult('Malzeme bulunamadı');
      }

      const [estimation, bufferSetting, discountTiers] = await Promise.all([
        this.getEstimationSettings(),
        this.getSettingWithEnabled('filament_buffer_multiplier', DEFAULT_FILAMENT_BUFFER),
        this.getQuantityDiscountTiers(),
      ]);

      if (!machine.configured) {
        warnOnce(
          `machine-rate-${input.machineType}`,
          `${input.machineType} için makine saatlik ücreti tanımlı değil; varsayılan ${machine.hourlyRate} TL/saat kullanılıyor.`
        );
      }
      if (machine.hourlyRate === 0) {
        warnOnce(
          `machine-zero-${input.machineType}`,
          `${input.machineType} makine saatlik ücreti 0; makine maliyeti fiyata eklenmiyor. Admin > fiyatlandırma ayarlarını kontrol edin.`
        );
      }
      if (!profit.configured) {
        warnOnce(
          'profit-margin-missing',
          'Kâr marjı çarpanı tanımlı değil; 1.00 (kâr eklenmiyor) kullanılıyor.'
        );
      }

      const gcode = input.useGCodeAnalysis
        ? await this.getGCodeAnalysis(input.fileId)
        : null;

      const quote = computeQuote({
        volumeCm3: input.volumeCm3,
        quantity: input.quantity,
        technology: input.technology,
        density: material.density,
        costPerGram: material.costPerGram,
        wastePercentage: material.wastePercentage,
        printSpeedModifier: material.printSpeedModifier,
        infillPercentage: input.infillPercentage ?? (input.technology === 'SLA' ? 100 : 20),
        timeMultiplier: input.timeMultiplier ?? 1,
        gcode,
        preorderDiscountPercent: input.preorderDiscountPercent ?? null,
        labor,
        coefficients,
        estimation: {
          ...estimation,
          filamentBufferMultiplier: bufferSetting.enabled
            ? bufferSetting.value
            : 1,
        },
        rates: {
          machineHourlyRate: machine.hourlyRate,
          electricityRatePerHour: electricity.rate,
          laborHourlyRate: labor.hourlyRate,
          riskPercentage: riskPremium.premiumPercentage,
          serviceFee: serviceFee.fee,
          profitMultiplier: profit.multiplier,
        },
        quantityDiscountTiers: discountTiers,
      });

      const deliveryDays = await this.deliveryCalculator.calculateSingleItemDelivery(
        quote.estimatedTime.totalOrderHours ?? quote.estimatedTime.correctedTimeHours,
        input.technology
      );

      for (const warning of quote.warnings) {
        warnOnce(`quote-${warning}`, warning);
      }

      return {
        success: true,
        totalPrice: quote.breakdown.totalPrice,
        breakdown: quote.breakdown as PricingPriceBreakdown,
        estimatedTime: quote.estimatedTime,
        deliveryDays,
        estimationSource: quote.source,
        warnings: quote.warnings,
        error: null,
      };
    } catch (err) {
      return this.errorResult(
        err instanceof Error ? err.message : 'Fiyat hesaplama hatası'
      );
    }
  }

  // =====================================================
  // SETTINGS LOADERS
  // =====================================================

  private async getEstimationSettings(): Promise<{
    shellRatio: number;
    supportRatio: number;
    printRateFdm: number;
    printRateSla: number;
    filamentBufferMultiplier: number;
  }> {
    const fallback = {
      shellRatio: 0.4,
      supportRatio: 0.15,
      printRateFdm: 15,
      printRateSla: 6,
      filamentBufferMultiplier: DEFAULT_FILAMENT_BUFFER,
    };

    try {
      const { data } = await (this.supabase.from('global_settings') as any)
        .select('key, value')
        .in('key', [
          'estimation_shell_ratio',
          'estimation_support_ratio',
          'estimation_print_rate_fdm',
          'estimation_print_rate_sla',
          'estimation_default_layer_count',
        ]);

      const settings: Record<string, any> = {};
      if (data) {
        (data as { key: string; value: any }[]).forEach((row) => {
          settings[row.key] = row.value;
        });
      }

      const shellRatio = asNumber(settings.estimation_shell_ratio?.value, fallback.shellRatio);
      const supportRatio = asNumber(settings.estimation_support_ratio?.value, fallback.supportRatio);
      const printRateFdm = asNumber(settings.estimation_print_rate_fdm?.value, fallback.printRateFdm);
      const printRateSla = asNumber(settings.estimation_print_rate_sla?.value, fallback.printRateSla);

      return {
        shellRatio: Math.min(1, Math.max(0, shellRatio)),
        supportRatio: Math.min(1, Math.max(0, supportRatio)),
        printRateFdm: printRateFdm > 0 ? printRateFdm : fallback.printRateFdm,
        printRateSla: printRateSla > 0 ? printRateSla : fallback.printRateSla,
        filamentBufferMultiplier: fallback.filamentBufferMultiplier,
      };
    } catch {
      return fallback;
    }
  }

  /**
   * Load the cached G-Code analysis. Returns null when there is no usable
   * analysis so the caller falls back to the volume estimate.
   */
  private async getGCodeAnalysis(fileId: string): Promise<{
    totalGrams: number;
    supportGrams: number;
    printHours: number;
  } | null> {
    const { data } = await (this.supabase as any)
      .from('gcode_analysis_results')
      .select('filament_weight_grams, support_weight_grams, actual_print_time_hours, total_layer_count, raw_header')
      .eq('file_id', fileId)
      .order('created_at', { ascending: false } as any)
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    const row = data as any;
    // Old rows may contain simulated output; never price from those.
    if (row.raw_header && JSON.stringify(row.raw_header).includes('SIMULATED')) {
      return null;
    }

    const totalGrams = asNumber(row.filament_weight_grams, 0);
    const printHours = asNumber(row.actual_print_time_hours, 0);
    if (totalGrams <= 0 || printHours <= 0) return null;

    return {
      totalGrams,
      supportGrams: asNumber(row.support_weight_grams, 0),
      printHours,
    };
  }

  /**
   * Save G-Code analysis result to database cache
   */
  async saveAnalysisResult(
    fileId: string,
    analysis: import('./types').GCodeAnalysisResult
  ): Promise<void> {
    await (this.supabase as any).from('gcode_analysis_results').insert({
      file_id: fileId,
      filament_weight_grams: analysis.filamentWeightGrams,
      support_weight_grams: analysis.supportWeightGrams,
      actual_print_time_hours: analysis.actualPrintTimeHours,
      actual_print_time_seconds: analysis.actualPrintTimeSeconds,
      total_layer_count: analysis.totalLayerCount,
      filament_length_mm: analysis.filamentLengthMm,
      total_travel_distance_mm: analysis.totalTravelDistanceMm,
      total_extrusion_distance_mm: analysis.totalExtrusionDistanceMm,
      retraction_count: analysis.retractionCount,
      min_layer_height_mm: analysis.minLayerHeightMm,
      max_layer_height_mm: analysis.maxLayerHeightMm,
      raw_header: analysis.rawHeader as any,
    });
  }

  private async getMaterial(materialId: string): Promise<{
    costPerGram: number;
    density: number;
    wastePercentage: number;
    printSpeedModifier: number;
  } | null> {
    const { data } = await (this.supabase.from('materials') as any)
      .select('cost_per_gram, density, waste_percentage, print_speed_modifier')
      .eq('id', materialId)
      .eq('is_active', true)
      .maybeSingle();

    if (!data) return null;

    const costPerGram = asNumber((data as any).cost_per_gram, 0);
    const density = asNumber((data as any).density, 0);

    if (costPerGram <= 0) {
      throw new PricingError('Malzeme birim fiyatı (TL/g) tanımlı değil.');
    }
    if (density <= 0) {
      throw new PricingError('Malzeme yoğunluğu tanımlı değil.');
    }

    return {
      costPerGram,
      density,
      wastePercentage: asNumber((data as any).waste_percentage, DEFAULT_WASTE_PERCENTAGE),
      printSpeedModifier: asNumber((data as any).print_speed_modifier, 1.0),
    };
  }

  private async getMachineRate(machineType: string): Promise<{
    hourlyRate: number;
    configured: boolean;
  }> {
    const { data } = await (this.supabase as any)
      .from('machine_amortization')
      .select('hourly_rate')
      .eq('machine_type', machineType)
      .eq('is_active', true)
      .maybeSingle();

    if (data) {
      return {
        hourlyRate: Math.max(0, asNumber((data as any).hourly_rate, 0)),
        configured: true,
      };
    }

    const defaultRates: Record<string, number> = {
      FDM_STANDARD: 5,
      FDM_INDUSTRIAL: 15,
      SLA_STANDARD: 10,
      SLA_INDUSTRIAL: 25,
    };

    return {
      hourlyRate: defaultRates[machineType] ?? 5,
      configured: false,
    };
  }

  private async getLaborSettings(technology: string): Promise<{
    filePrepMinutes: number;
    supportRemovalMinutes: number;
    postProcessingMinutes: number;
    hourlyRate: number;
  }> {
    const defaults =
      technology === 'SLA'
        ? { file_prep: 10, support_removal: 5, post_processing: 20 }
        : { file_prep: 10, support_removal: 15, post_processing: 10 };

    const { data: settings } = await (this.supabase as any)
      .from('labor_time_settings')
      .select('task_type, base_minutes, is_active')
      .eq('is_active', true);

    const minutes: Record<string, number> = { ...defaults };
    if (settings) {
      (settings as { task_type: string; base_minutes: number }[]).forEach((row) => {
        if (row.task_type in minutes) {
          minutes[row.task_type] = Math.max(0, asNumber(row.base_minutes, minutes[row.task_type]));
        }
      });
    }

    return {
      filePrepMinutes: minutes.file_prep,
      supportRemovalMinutes: minutes.support_removal,
      postProcessingMinutes: minutes.post_processing,
      hourlyRate: await this.getLaborRate(),
    };
  }

  private async getRiskPremium(technology: string): Promise<{ premiumPercentage: number }> {
    const { data } = await (this.supabase as any)
      .from('risk_premium_settings')
      .select('premium_percentage')
      .eq('technology', technology)
      .eq('is_active', true)
      .maybeSingle();

    if (data) {
      // An explicit 0 is a valid business choice (risk disabled), not a
      // missing value — do not replace it with the 15% default.
      return { premiumPercentage: Math.max(0, asNumber((data as any).premium_percentage, 0)) };
    }

    return { premiumPercentage: technology === 'SLA' ? 20 : 15 };
  }

  private async getQuantityDiscountTiers(): Promise<QuantityDiscountTier[]> {
    try {
      const { data } = await (this.supabase.from('global_settings') as any)
        .select('value')
        .eq('key', 'quantity_discounts')
        .maybeSingle();

      if (!data) return [];
      const raw = (data as any).value;
      if (raw?.enabled === false) return [];

      const tiers = (raw?.tiers || raw || []) as { minQty?: number; discountPercent?: number }[];
      return tiers
        .map((tier) => ({
          minQty: Math.floor(asNumber(tier.minQty, 0)),
          discountPercent: Math.min(100, Math.max(0, asNumber(tier.discountPercent, 0))),
        }))
        .filter((tier) => tier.minQty > 0);
    } catch {
      return [];
    }
  }

  private async getSettingWithEnabled(
    key: string,
    defaultVal: number
  ): Promise<{ value: number; enabled: boolean }> {
    try {
      const { data } = await (this.supabase.from('global_settings') as any)
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (!data) return { value: defaultVal, enabled: true };
      const raw = (data as any).value;

      return {
        value: asNumber(raw?.value, defaultVal),
        enabled: raw?.enabled !== false,
      };
    } catch {
      return { value: defaultVal, enabled: true };
    }
  }

  private async getElectricityRate(): Promise<{ rate: number }> {
    const setting = await this.getSettingWithEnabled('electricity_rate_per_hour', 15);
    return { rate: setting.enabled ? Math.max(0, setting.value) : 0 };
  }

  private async getServiceFee(): Promise<{ fee: number }> {
    const setting = await this.getSettingWithEnabled('fixed_service_fee', 25);
    return { fee: setting.enabled ? Math.max(0, setting.value) : 0 };
  }

  private async getProfitMarginMultiplier(): Promise<{
    multiplier: number;
    enabled: boolean;
    configured: boolean;
  }> {
    try {
      const { data } = await (this.supabase.from('global_settings') as any)
        .select('value')
        .eq('key', 'profit_margin_multiplier')
        .maybeSingle();

      if (!data) {
        return { multiplier: 1.3, enabled: true, configured: false };
      }

      const raw = (data as any).value;
      const multiplier = Math.max(1, asNumber(raw?.value, 1));

      return {
        multiplier,
        enabled: raw?.enabled !== false,
        configured: true,
      };
    } catch {
      return { multiplier: 1, enabled: true, configured: false };
    }
  }

  private async getLaborRate(): Promise<number> {
    const setting = await this.getSettingWithEnabled('labor_rate_per_hour', 50);
    return setting.enabled ? Math.max(0, setting.value) : 0;
  }

  // =====================================================
  // HISTORY & ERRORS
  // =====================================================

  async savePricingHistory(
    fileId: string,
    input: PricingInput,
    result: PricingResult
  ): Promise<void> {
    if (!result.success) return;

    await (this.supabase.from('pricing_history') as any).insert({
      file_id: fileId,
      material_id: input.materialId,
      volume_cm3: input.volumeCm3,
      calculated_price: result.totalPrice,
      price_breakdown: result.breakdown as any,
      settings_snapshot: {
        technology: input.technology,
        machineType: input.machineType,
        quantity: input.quantity,
        useGCode: input.useGCodeAnalysis,
        estimationSource: result.estimationSource ?? 'volume',
        correctedTime: result.estimatedTime,
        warnings: result.warnings ?? [],
      } as any,
    });
  }

  private errorResult(error: string): PricingResult {
    return {
      success: false,
      totalPrice: 0,
      breakdown: {
        material: { filamentGrams: 0, supportGrams: 0, totalGrams: 0, wastePercentage: 0, unitCostPerGram: 0, subtotal: 0 },
        machineAmortization: { correctedPrintTimeHours: 0, hourlyRate: 0, subtotal: 0 },
        electricity: { printTimeHours: 0, rate: 0, subtotal: 0 },
        labor: { filePrepMinutes: 0, supportRemovalMinutes: 0, postProcessingMinutes: 0, totalMinutes: 0, hourlyRate: 0, subtotal: 0 },
        riskPremium: { baseTotal: 0, premiumPercentage: 0, subtotal: 0 },
        serviceFee: 0,
        profitMargin: { baseTotal: 0, multiplier: 1, subtotal: 0 },
        subtotal: 0,
        totalBeforeVat: 0,
        vatRate: 0,
        vatAmount: 0,
        totalWithVat: 0,
        pricePerUnit: 0,
        totalPrice: 0,
        directCost: 0,
      },
      estimatedTime: {
        rawPrintTimeHours: 0,
        correctedTimeHours: 0,
        orderSetupHours: 0,
        totalOrderHours: 0,
        correctionBreakdown: { warmUpMinutes: 0, calibrationMinutes: 0, bedPrepMinutes: 0, deadTimePerPartMinutes: 0 },
      },
      deliveryDays: 0,
      estimationSource: 'volume',
      warnings: [error],
      error,
    };
  }
}

export const pricingEngine = new PricingEngine();
