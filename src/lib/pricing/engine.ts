/**
 * Pricing Engine v2 - The Axis3 Pricing Brain
 * 
 * 4 Sütunlu Fiyatlandırma Modeli:
 * 1. Materyal Maliyeti: (gram maliyeti + %10 fire payı)
 * 2. Makine Amortismanı: (toplam baskı süresi × saatlik makine ücreti)
 * 3. İşçilik: (dosya hazırlığı + destek ayıklama + son işlem)
 * 4. Risk Primi: %15-20 güvenlik marjı
 * 
 * CuraEngine entegrasyonu ile gerçek G-Code analizi.
 */

import { createClient } from '@/lib/supabase/client';
import { deliveryCalculator } from '@/lib/utils/delivery-calculator';
import { correctionFactor } from './correction-factor';

import type {
  PricingInput,
  PricingResult,
  PriceBreakdown as PricingPriceBreakdown,
  MaterialCost,
  MachineAmortizationCost,
  ElectricityCost,
  LaborCost,
  RiskPremium,
  ProfitMarginCost,
} from './types';

export type { PricingInput, PricingResult };

// =====================================================
// DEFAULT VALUES
// =====================================================

const DEFAULT_WASTE_PERCENTAGE = 10.0;

// =====================================================
// PRICING ENGINE CLASS
// =====================================================

export class PricingEngine {
  private supabase = createClient();

  /**
   * Main pricing calculation entry point
   * 
   * Flow:
   * 1. Load material & machine data from DB
   * 2. Retrieve G-Code analysis if available (real data)
   * 3. Fall back to volume-based estimation if no G-Code
   * 4. Apply Experience Correction Factor (ECF)
   * 5. Calculate 4-column pricing
   * 6. Return result
   */
  async calculatePrice(input: PricingInput): Promise<PricingResult> {
    try {
      const [material, machineSettings, laborSettings, riskPremium, elecRate, srvFee, profitMarg] = await Promise.all([
        this.getMaterial(input.materialId),
        this.getMachineRate(input.machineType),
        this.getLaborSettings(input.technology),
        this.getRiskPremium(input.technology),
        this.getElectricityRate(),
        this.getServiceFee(),
        this.getProfitMarginMultiplier(),
      ]);

      if (!material) {
        return this.errorResult('Malzeme bulunamadı');
      }

      // Step 1: Get real G-Code data or use volume-based estimation
      let filamentGrams: number;
      let supportGrams: number;
      let rawPrintTimeHours: number;
      let layerCount: number;

      const extraBufferSetting = await this.getSettingWithEnabled('filament_buffer_multiplier', 1.20);
      const extraBuffer = extraBufferSetting.enabled ? extraBufferSetting.value : 1.0;
      if (input.useGCodeAnalysis) {
        const analysis = await this.getGCodeAnalysis(input.fileId, material.density);
        if (analysis) {
          filamentGrams = analysis.filamentWeightGrams * extraBuffer;
          supportGrams = analysis.supportWeightGrams * extraBuffer;
          rawPrintTimeHours = analysis.actualPrintTimeHours;
          layerCount = analysis.totalLayerCount;
        } else {
          const est = await this.estimateFromVolume(input.volumeCm3, material, input.technology, input.timeMultiplier, input.infillPercentage);
          filamentGrams = est.filamentGrams;
          supportGrams = est.supportGrams;
          rawPrintTimeHours = est.printTimeHours;
          layerCount = est.layerCount;
        }
      } else {
        const est = await this.estimateFromVolume(input.volumeCm3, material, input.technology, input.timeMultiplier, input.infillPercentage);
        filamentGrams = est.filamentGrams;
        supportGrams = est.supportGrams;
        rawPrintTimeHours = est.printTimeHours;
        layerCount = est.layerCount;
      }

      // Step 2: Apply Experience Correction Factor (ECF)
      const correctedTime = await correctionFactor.apply(rawPrintTimeHours, input.quantity);

      // Step 3: Calculate Material Cost (column 1)
      const totalGrams = filamentGrams + supportGrams;
      const wasteMultiplier = 1 + (material.wastePercentage ?? DEFAULT_WASTE_PERCENTAGE) / 100;
      const materialCost: MaterialCost = {
        filamentGrams: this.round(filamentGrams, 2),
        supportGrams: this.round(supportGrams, 2),
        totalGrams: this.round(totalGrams, 2),
        wastePercentage: material.wastePercentage ?? DEFAULT_WASTE_PERCENTAGE,
        unitCostPerGram: material.costPerGram,
        subtotal: this.round(totalGrams * material.costPerGram * wasteMultiplier),
      };

      // Step 4: Calculate Machine Amortization (column 2)
      const machineAmortization: MachineAmortizationCost = {
        correctedPrintTimeHours: correctedTime.totalCorrectedHours,
        hourlyRate: machineSettings.hourlyRate,
        subtotal: this.round(correctedTime.totalCorrectedHours * machineSettings.hourlyRate),
      };

      // Step 5: Calculate Labor Cost (column 3)
      const laborTotalMinutes =
        laborSettings.filePrepMinutes +
        laborSettings.supportRemovalMinutes +
        laborSettings.postProcessingMinutes;
      const laborCost: LaborCost = {
        filePrepMinutes: laborSettings.filePrepMinutes,
        supportRemovalMinutes: laborSettings.supportRemovalMinutes,
        postProcessingMinutes: laborSettings.postProcessingMinutes,
        totalMinutes: laborTotalMinutes,
        hourlyRate: laborSettings.hourlyRate,
        subtotal: this.round((laborTotalMinutes / 60) * laborSettings.hourlyRate),
      };

      // Step 6: Calculate Electricity Cost (column 3b)
      const electricityCost: ElectricityCost = {
        printTimeHours: correctedTime.totalCorrectedHours,
        rate: elecRate.rate,
        subtotal: this.round(correctedTime.totalCorrectedHours * elecRate.rate),
      };

      // Step 7: Calculate subtotal before risk & margin
      const baseSubtotal = materialCost.subtotal + machineAmortization.subtotal
        + electricityCost.subtotal + laborCost.subtotal;

      // Step 8: Apply Risk Premium
      const riskPremiumCost: RiskPremium = {
        baseTotal: this.round(baseSubtotal),
        premiumPercentage: riskPremium.premiumPercentage,
        subtotal: this.round(baseSubtotal * (riskPremium.premiumPercentage / 100)),
      };

      // Step 9: Fixed Service Fee
      const serviceFee = srvFee.fee;

      // Step 10: Profit Margin (skip if disabled)
      const profitBase = baseSubtotal + riskPremiumCost.subtotal + serviceFee;
      const profitEnabled = profitMarg.enabled !== false;
      const effectiveMultiplier = profitEnabled ? profitMarg.multiplier : 1;
      const profitMarginCost: ProfitMarginCost = {
        baseTotal: this.round(profitBase),
        multiplier: effectiveMultiplier,
        subtotal: this.round(profitBase * (effectiveMultiplier - 1)),
      };

      // Step 11: Calculate final totals
      let totalBeforeDiscount = (baseSubtotal + riskPremiumCost.subtotal
        + serviceFee + profitMarginCost.subtotal) * input.quantity;

      // Apply quantity discount (configurable tiers)
      let quantityDiscount: number | undefined;
      const discountTiers = await this.getQuantityDiscountTiers();
      const sorted = [...discountTiers].sort((a, b) => b.minQty - a.minQty);
      for (const tier of sorted) {
        if (input.quantity >= tier.minQty) {
          quantityDiscount = this.round(totalBeforeDiscount * (tier.discountPercent / 100));
          totalBeforeDiscount -= quantityDiscount;
          break;
        }
      }

      // Apply preorder discount
      let preorderDiscount: number | undefined;
      if (input.preorderDiscountPercent != null && input.preorderDiscountPercent > 0) {
        const pdAmount = totalBeforeDiscount * (input.preorderDiscountPercent / 100);
        preorderDiscount = this.round(pdAmount);
        totalBeforeDiscount -= preorderDiscount;
      }

      const totalNet = totalBeforeDiscount;
      const pricePerUnit = this.round(totalNet / input.quantity);

      // Step 12: Calculate delivery days
      const deliveryDays = await deliveryCalculator.calculateSingleItemDelivery(
        correctedTime.totalCorrectedHours,
        input.technology
      );

      // Step 14: Build final breakdown (no VAT — handled at cart level)
      const breakdown: PricingPriceBreakdown = {
        material: materialCost,
        machineAmortization: machineAmortization,
        electricity: electricityCost,
        labor: laborCost,
        riskPremium: riskPremiumCost,
        serviceFee: this.round(serviceFee),
        profitMargin: profitMarginCost,
        subtotal: this.round(totalNet),
        totalBeforeVat: this.round(totalNet),
        vatRate: 0,
        vatAmount: 0,
        totalWithVat: this.round(totalNet),
        pricePerUnit,
        totalPrice: this.round(totalNet),
        quantityDiscount,
        preorderDiscount,
      };

      return {
        success: true,
        totalPrice: this.round(totalNet),
        breakdown,
        estimatedTime: {
          rawPrintTimeHours: correctedTime.rawPrintTimeHours,
          correctedTimeHours: correctedTime.totalCorrectedHours,
          correctionBreakdown: {
            warmUpMinutes: correctedTime.breakdown.warmUp * 60,
            calibrationMinutes: correctedTime.breakdown.calibration * 60,
            bedPrepMinutes: correctedTime.breakdown.bedPrep * 60,
            deadTimePerPartMinutes: correctedTime.breakdown.deadTime * 60,
          },
        },
        deliveryDays,
        error: null,
      };
    } catch (err) {
      return this.errorResult(
        err instanceof Error ? err.message : 'Fiyat hesaplama hatası'
      );
    }
  }

  /**
   * Estimate print parameters from volume (fallback when no G-Code)
   * Uses infill percentage and adds extra filament buffer
   * Values are loaded from global_settings DB table with fallbacks
   */
  private async getEstimationSettings(): Promise<{
    shellRatio: number;
    supportRatio: number;
    printRateFdm: number;
    printRateSla: number;
    defaultLayerCount: number;
  }> {
    try {
      const { data } = await (this.supabase
        .from('global_settings') as any)
        .select('key, value')
        .in('key', ['estimation_shell_ratio', 'estimation_support_ratio', 'estimation_print_rate_fdm', 'estimation_print_rate_sla', 'estimation_default_layer_count']);

      const settings: Record<string, any> = {};
      if (data) {
        (data as { key: string; value: any }[]).forEach((row) => {
          settings[row.key] = row.value;
        });
      }

      return {
        shellRatio: settings.estimation_shell_ratio?.value ?? 0.4,
        supportRatio: settings.estimation_support_ratio?.value ?? 0.15,
        printRateFdm: settings.estimation_print_rate_fdm?.value ?? 15,
        printRateSla: settings.estimation_print_rate_sla?.value ?? 6,
        defaultLayerCount: settings.estimation_default_layer_count?.value ?? 250,
      };
    } catch {
      return { shellRatio: 0.4, supportRatio: 0.15, printRateFdm: 15, printRateSla: 6, defaultLayerCount: 250 };
    }
  }

  private async estimateFromVolume(
    volumeCm3: number,
    material: {
      density: number;
      costPerGram: number;
      wastePercentage?: number;
      printSpeedModifier?: number;
    },
    technology: string = 'FDM',
    timeMultiplier: number = 1.0,
    infillPercentage: number = 100
  ): Promise<{ filamentGrams: number; supportGrams: number; printTimeHours: number; layerCount: number }> {
    const estSettings = await this.getEstimationSettings();
    const effectiveVolumeRatio = estSettings.shellRatio + (1 - estSettings.shellRatio) * (infillPercentage / 100);
    const effectiveVolume = volumeCm3 * effectiveVolumeRatio;

    const baseGrams = effectiveVolume * material.density;
    const supportGrams = baseGrams * estSettings.supportRatio;
    const filamentGrams = baseGrams + supportGrams;

    const baseRate = technology === 'SLA' ? estSettings.printRateSla : estSettings.printRateFdm;
    const speedMod = material.printSpeedModifier ?? 1.0;
    const estimated = (volumeCm3 / (baseRate * speedMod)) * timeMultiplier;
    const printTimeHours = Math.max(estimated, 0.3);

    const layerCount = estSettings.defaultLayerCount;

    return { filamentGrams, supportGrams, printTimeHours, layerCount };
  }

  /**
   * Get G-Code analysis result from database cache
   */
  private async getGCodeAnalysis(fileId: string, materialDensity?: number): Promise<{
    filamentWeightGrams: number;
    supportWeightGrams: number;
    actualPrintTimeHours: number;
    totalLayerCount: number;
  } | null> {
    const { data } = await (this.supabase as any)
      .from('gcode_analysis_results')
      .select('filament_weight_grams, support_weight_grams, actual_print_time_hours, total_layer_count')
      .eq('file_id', fileId)
      .order('created_at', { ascending: false } as any)
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    const row = data as any;
    return {
      filamentWeightGrams: row.filament_weight_grams || 0,
      supportWeightGrams: row.support_weight_grams || 0,
      actualPrintTimeHours: row.actual_print_time_hours || 0,
      totalLayerCount: row.total_layer_count || 0,
    };
  }

  /**
   * Save G-Code analysis result to database cache
   */
  private async saveAnalysisResult(
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

  /**
   * Load material data from database
   */
  private async getMaterial(materialId: string): Promise<{
    costPerGram: number;
    density: number;
    wastePercentage: number;
    printSpeedModifier: number;
  } | null> {
    const { data } = await (this.supabase
      .from('materials') as any)
      .select('cost_per_gram, density, waste_percentage, print_speed_modifier')
      .eq('id', materialId)
      .eq('is_active', true)
      .single();

    if (!data) return null;

    return {
      costPerGram: (data as any).cost_per_gram || 0,
      density: (data as any).density || 1.24,
      wastePercentage: (data as any).waste_percentage ?? DEFAULT_WASTE_PERCENTAGE,
      printSpeedModifier: (data as any).print_speed_modifier ?? 1.0,
    };
  }

  /**
   * Get machine hourly rate from database
   */
  private async getMachineRate(machineType: string): Promise<{ hourlyRate: number }> {
    const { data } = await (this.supabase as any)
      .from('machine_amortization')
      .select('hourly_rate')
      .eq('machine_type', machineType)
      .eq('is_active', true)
      .maybeSingle();

    if (data) {
      return { hourlyRate: (data as any).hourly_rate || 5 };
    }

    const defaultRates: Record<string, number> = {
      FDM_STANDARD: 5,
      FDM_INDUSTRIAL: 15,
      SLA_STANDARD: 10,
      SLA_INDUSTRIAL: 25,
    };

    return { hourlyRate: defaultRates[machineType] || 5 };
  }

  /**
   * Get labor settings from database
   */
  private async getLaborSettings(technology: string): Promise<{
    filePrepMinutes: number;
    supportRemovalMinutes: number;
    postProcessingMinutes: number;
    hourlyRate: number;
  }> {
    const { data: settings } = await (this.supabase as any)
      .from('labor_time_settings')
      .select('task_type, base_minutes, per_complexity_minutes')
      .eq('is_active', true);

    const minutes: Record<string, number> = {
      file_prep: 10,
      support_removal: 15,
      post_processing: 10,
    };

    if (settings) {
      (settings as { task_type: string; base_minutes: number }[]).forEach((row) => {
        minutes[row.task_type] = row.base_minutes;
      });
    }

    if (technology === 'SLA') {
      minutes.support_removal = 5;
      minutes.post_processing = 20;
    }

    const laborRate = await this.getLaborRate();
    return {
      filePrepMinutes: minutes.file_prep,
      supportRemovalMinutes: minutes.support_removal,
      postProcessingMinutes: minutes.post_processing,
      hourlyRate: laborRate,
    };
  }

  /**
   * Get risk premium percentage from database
   */
  private async getRiskPremium(technology: string): Promise<{ premiumPercentage: number }> {
    const { data } = await (this.supabase as any)
      .from('risk_premium_settings')
      .select('premium_percentage')
      .eq('technology', technology)
      .eq('is_active', true)
      .maybeSingle();

    if (data) {
      return { premiumPercentage: (data as any).premium_percentage || 15 };
    }

    return { premiumPercentage: technology === 'SLA' ? 20 : 15 };
  }

  /**
   * Get quantity discount tiers from global settings
   */
  private async getQuantityDiscountTiers(): Promise<{ minQty: number; discountPercent: number }[]> {
    try {
      const { data } = await (this.supabase
        .from('global_settings') as any)
        .select('value')
        .eq('key', 'quantity_discounts')
        .maybeSingle();

      if (!data) return [];
      const raw = (data as any).value;
      // Return empty if disabled
      if (raw?.enabled === false) return [];

      const tiers = (raw?.tiers || raw || []) as { minQty?: number; discountPercent?: number }[];
      return tiers
        .map((t: { minQty?: number; discountPercent?: number }) => ({
          minQty: Number(t.minQty) || 0,
          discountPercent: Number(t.discountPercent) || 0,
        }))
        .filter((t: { minQty: number }) => t.minQty > 0);
    } catch {
      return [];
    }
  }

  /**
   * Get a global setting with its enabled status
   */
  private async getSettingWithEnabled(key: string, defaultVal: number): Promise<{ value: number; enabled: boolean }> {
    try {
      const { data } = await (this.supabase
        .from('global_settings') as any)
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (!data) return { value: defaultVal, enabled: true };
      const v = (data as any).value;
      return {
        value: typeof v?.value === 'number' ? v.value : defaultVal,
        enabled: v?.enabled !== false,
      };
    } catch {
      return { value: defaultVal, enabled: true };
    }
  }

  /**
   * Get electricity rate per hour from global_settings
   */
  private async getElectricityRate(): Promise<{ rate: number }> {
    const s = await this.getSettingWithEnabled('electricity_rate_per_hour', 15);
    return { rate: s.enabled ? s.value : 0 };
  }

  /**
   * Get fixed service fee from global_settings
   */
  private async getServiceFee(): Promise<{ fee: number }> {
    const s = await this.getSettingWithEnabled('fixed_service_fee', 25);
    return { fee: s.enabled ? s.value : 0 };
  }

  /**
   * Get profit margin multiplier and enabled status from global_settings
   */
  private async getProfitMarginMultiplier(): Promise<{ multiplier: number; enabled: boolean }> {
    const s = await this.getSettingWithEnabled('profit_margin_multiplier', 1.3);
    return { multiplier: s.value, enabled: s.enabled };
  }

  /**
   * Get labor hourly rate from global_settings
   */
  private async getLaborRate(): Promise<number> {
    const s = await this.getSettingWithEnabled('labor_rate_per_hour', 50);
    return s.enabled ? s.value : 0;
  }

  /**
   * Save pricing calculation to history
   */
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
        useGCode: input.useGCodeAnalysis,
        correctedTime: result.estimatedTime,
      } as any,
    });
  }

  /**
   * Create error result
   */
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
      },
      estimatedTime: {
        rawPrintTimeHours: 0,
        correctedTimeHours: 0,
        correctionBreakdown: { warmUpMinutes: 0, calibrationMinutes: 0, bedPrepMinutes: 0, deadTimePerPartMinutes: 0 },
      },
      deliveryDays: 0,
      error,
    };
  }

  /**
   * Round to 2 decimal places
   */
  private round(value: number, precision: number = 2): number {
    const multiplier = Math.pow(10, precision);
    return Math.round(value * multiplier) / multiplier;
  }
}

export const pricingEngine = new PricingEngine();
