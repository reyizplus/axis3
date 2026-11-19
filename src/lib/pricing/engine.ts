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
import { computeQuote, normalizeVatRate, PricingError } from './core';
import type { QuantityDiscountTier } from './core';
import { resolveMachineHourlyRate } from './machine-rate';
import { getCachedAnalysis } from './server/analysis-cache';

import type {
  PricingInput,
  PricingResult,
  PriceBreakdown as PricingPriceBreakdown,
} from './types';

export type { PricingInput, PricingResult };

const DEFAULT_WASTE_PERCENTAGE = 10.0;
const DEFAULT_FILAMENT_BUFFER = 1.05;
/** Türkiye standart KDV oranı; DB'de kayıt yoksa iki taraf aynı varsayılanı kullanır. */
const DEFAULT_VAT_RATE = 0.2;

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

/** Dilimleme kill switch: yalnızca açıkça 'false' verilirse kapanır. */
export function isSlicingEnabled(): boolean {
  return process.env.SLICING_ENABLED !== 'false';
}

/**
 * G-Code analizinin kullanılıp kullanılmayacağına karar verir.
 *
 * Kurallar (hepsi testlidir):
 * - `useGCodeAnalysis` kapalıysa sorgu yapılmaz.
 * - Kill switch kapalıysa sorgu yapılmaz (eski davranışa dönüş).
 * - SLA'da dilimleme yok; sorgu yapılmaz (K3).
 * - Profil hash'i yoksa sorgu yapılmaz: hangi profille üretildiği bilinmeyen
 *   bir analizle fiyat vermek sessiz sapma demektir.
 */
export function selectGcodeSource(params: {
  useGCodeAnalysis: boolean;
  slicingEnabled: boolean;
  technology: 'FDM' | 'SLA';
  slicerProfileHash?: string | null;
}): { shouldQuery: boolean; profileHash: string | null; warning: string | null } {
  if (!params.useGCodeAnalysis || !params.slicingEnabled) {
    return { shouldQuery: false, profileHash: null, warning: null };
  }
  if (params.technology === 'SLA') {
    return { shouldQuery: false, profileHash: null, warning: null };
  }
  const hash = params.slicerProfileHash?.trim();
  if (!hash) {
    return { shouldQuery: false, profileHash: null, warning: 'gcode_profile_missing' };
  }
  return { shouldQuery: true, profileHash: hash, warning: null };
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
      const [material, machine, labor, riskPremium, electricity, serviceFee, profit, coefficients, vat] =
        await Promise.all([
          this.getMaterial(input.materialId),
          this.getMachineRate(input.machineType),
          this.getLaborSettings(input.technology, input.supportEnabled !== false),
          this.getRiskPremium(input.technology),
          this.getElectricityRate(),
          this.getServiceFee(),
          this.getProfitMarginMultiplier(),
          this.correctionFactor.getCoefficients(),
          this.getVatRate(),
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
          `${input.machineType} için ne saatlik ücret ne de makine fiyatı tanımlı; makine maliyeti fiyata eklenmiyor. Admin > makine amortismanı ayarlarını doldurun.`
        );
      }
      if (machine.derived) {
        warnOnce(
          `machine-derived-${input.machineType}`,
          `${input.machineType} saatlik ücreti 0 olduğu için makine fiyatı + amortismandan türetildi (${machine.hourlyRate.toFixed(2)} TL/saat).`
        );
      }
      if (machine.hourlyRate === 0) {
        warnOnce(
          `machine-zero-${input.machineType}`,
          `${input.machineType} makine saatlik ücreti 0; makine maliyeti fiyata eklenmiyor.`
        );
      }
      if (!profit.configured) {
        warnOnce(
          'profit-margin-missing',
          'Kâr marjı çarpanı tanımlı değil; 1.00 (kâr eklenmiyor) kullanılıyor.'
        );
      }
      if (!vat.configured) {
        warnOnce(
          'vat-rate-missing',
          `KDV oranı tanımlı değil; %${Math.round(DEFAULT_VAT_RATE * 100)} varsayıldı.`
        );
      }

      const gcodeSource = selectGcodeSource({
        useGCodeAnalysis: input.useGCodeAnalysis,
        slicingEnabled: isSlicingEnabled(),
        technology: input.technology,
        slicerProfileHash: input.slicerProfileHash,
      });

      const gcode = gcodeSource.shouldQuery && gcodeSource.profileHash
        ? await this.getGCodeAnalysis(input.fileId, gcodeSource.profileHash)
        : null;

      const engineWarnings: string[] = [];
      if (gcodeSource.warning) engineWarnings.push(gcodeSource.warning);
      if (gcodeSource.shouldQuery && !gcode) engineWarnings.push('gcode_analysis_missing');

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
        supportEnabled: input.supportEnabled !== false,
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
          profitMultiplier: profit.enabled ? profit.multiplier : 1,
        },
        quantityDiscountTiers: discountTiers,
        vatRate: vat.rate,
      });

      const deliveryDays = await this.deliveryCalculator.calculateSingleItemDelivery(
        quote.estimatedTime.totalOrderHours ?? quote.estimatedTime.correctedTimeHours,
        input.technology
      );

      for (const warning of quote.warnings) {
        warnOnce(`quote-${warning}`, warning);
      }
      for (const warning of engineWarnings) {
        warnOnce(`engine-${warning}`, warning);
      }

      return {
        success: true,
        totalPrice: quote.breakdown.totalPrice,
        breakdown: quote.breakdown as PricingPriceBreakdown,
        estimatedTime: quote.estimatedTime,
        deliveryDays,
        estimationSource: quote.source,
        warnings: [...quote.warnings, ...engineWarnings],
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
   * Profil hash'i ile eşleşen önbellek analizini okur.
   *
   * Hash zorunludur: "dosyanın en son analizi" kavramı kaldırıldı, çünkü
   * kullanıcı kaliteyi değiştirdiğinde eski analiz yeni seçimlerle eşleşip
   * sessiz bir fiyat sapması üretiyordu.
   */
  private async getGCodeAnalysis(
    fileId: string,
    profileHash: string
  ): Promise<{
    totalGrams: number;
    supportGrams: number;
    printHours: number;
  } | null> {
    const cached = await getCachedAnalysis(this.supabase, fileId, profileHash);
    if (!cached) return null;

    return {
      totalGrams: cached.grams,
      // Destek payı ölçülmüş G-Code'dan gelir; toplam gramın içindedir.
      supportGrams: cached.supportGrams,
      printHours: cached.printSeconds / 3600,
    };
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
    derived: boolean;
  }> {
    const { data } = await (this.supabase as any)
      .from('machine_amortization')
      .select('hourly_rate, purchase_cost, depreciation_months, monthly_maintenance')
      .eq('machine_type', machineType)
      .eq('is_active', true)
      .maybeSingle();

    // Gömülü varsayılan fiyat yok: yalnızca DB'deki saatlik ücret veya
    // adminin girdiği makine fiyatı + amortisman kullanılır.
    return resolveMachineHourlyRate(data ?? null);
  }

  /**
   * `global_settings.vat_rate` değerini 0..1 orana çevirir.
   *
   * Dönüşüm `normalizeVatRate` içinde tek yerde tutulur; sepet, sipariş
   * servisi ve motor aynı fonksiyonu kullanır ki 0.2 ile 20 aynı sonucu versin.
   */
  private async getVatRate(): Promise<{ rate: number; configured: boolean }> {
    try {
      const { data } = await (this.supabase.from('global_settings') as any)
        .select('value')
        .eq('key', 'vat_rate')
        .maybeSingle();

      if (!data) return { rate: DEFAULT_VAT_RATE, configured: false };

      const value = asNumber((data as any).value?.value, DEFAULT_VAT_RATE * 100);

      return {
        rate: normalizeVatRate(value),
        configured: true,
      };
    } catch {
      return { rate: DEFAULT_VAT_RATE, configured: false };
    }
  }

  private async getLaborSettings(
    technology: string,
    supportEnabled: boolean
  ): Promise<{
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
      // Destek kapalıyken destek ayıklama işçiliği ücretlendirilmez; süre DB'de
      // dolu olsa bile yapılmayan iş fiyata girmemeli.
      supportRemovalMinutes: supportEnabled ? minutes.support_removal : 0,
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

  /**
   * Public: `quoteOrder` aynı kademeleri sepet/checkout'a bildirir, böylece
   * müşteri "fiyat neden düştü" sorusunun cevabını (yüzde ve sonraki kademe)
   * görebilir.
   */
  async getQuantityDiscountTiers(): Promise<QuantityDiscountTier[]> {
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
        material: { filamentGrams: 0, supportGrams: 0, totalGrams: 0, wastePercentage: 0, wasteGrams: 0, unitCostPerGram: 0, subtotal: 0 },
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
      warnings: [error],
      error,
    };
  }
}

export const pricingEngine = new PricingEngine();
