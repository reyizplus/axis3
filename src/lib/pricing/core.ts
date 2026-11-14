/**
 * Pricing Core (pure)
 *
 * All money and time math lives here so it can be tested without a database
 * and so the browser preview and the server-side order creation cannot drift
 * apart. `PricingEngine` only loads settings and calls `computeQuote`.
 *
 * Pricing rules (single source of truth):
 * - Material, machine, electricity and per-part labor scale with quantity.
 * - Setup (warm-up, calibration, bed prep), file preparation and the service
 *   fee are charged ONCE per order — never once per part.
 * - Supports are counted once. For G-Code input the total filament weight
 *   already includes supports, so the support weight is only a breakdown.
 * - **FDM is priced only from a real G-Code analysis.** Volume estimation was
 *   removed as a price source because it drifted up to +40 % on simple models
 *   (the 20 mm cube: 6.23 g estimated vs 4.41 g sliced). With no G-Code there
 *   is no FDM price at all — see `PricingError` below — so a customer can never
 *   be shown a number the machine time does not support.
 * - SLA keeps the volume estimate on purpose (there is no SLA slicer yet) and
 *   the UI labels it "Tahmini".
 * - The filament buffer is a safety margin for *estimates* only; a measured
 *   G-Code weight is used as-is. The material waste percentage still applies
 *   because it covers real losses (failed prints, spool changes), not guesswork.
 * - Discounts can never take the order below its direct cost (break-even).
 * - VAT is computed here so the UI can show the tax-exclusive price with the
 *   tax amount next to it; the order total is still built by `order-totals`.
 * - Every component is rounded to kuruş and the total is the sum of the
 *   rounded components, so the breakdown always adds up exactly.
 */

import { roundMoney, toCents } from '@/lib/utils/money';
import type {
  CorrectionCoefficients,
  PriceBreakdown,
} from './types';

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PricingError';
  }
}

export interface EstimationConfig {
  /** Fraction of the model volume that is solid shell (0..1). */
  shellRatio: number;
  /** Support volume as a fraction of the model volume (0..1). */
  supportRatio: number;
  /** Extrusion rate in cm³ per hour for FDM. */
  printRateFdm: number;
  /** Extrusion rate in cm³ per hour for SLA. */
  printRateSla: number;
  /** Extra material buffer for purge/prime/brim (>= 1). */
  filamentBufferMultiplier: number;
}

export interface PricingRates {
  machineHourlyRate: number;
  electricityRatePerHour: number;
  laborHourlyRate: number;
  riskPercentage: number;
  /** Fixed fee charged once per order. */
  serviceFee: number;
  /** Must be >= 1. A value of 1 means "no profit margin added". */
  profitMultiplier: number;
}

export interface LaborMinutes {
  filePrepMinutes: number;
  supportRemovalMinutes: number;
  postProcessingMinutes: number;
}

export interface QuantityDiscountTier {
  minQty: number;
  discountPercent: number;
}

export interface GCodeConsumption {
  /** Total filament weight, including supports. */
  totalGrams: number;
  /** Support portion of `totalGrams` (breakdown only). */
  supportGrams: number;
  /** Actual print time for one part, in hours. */
  printHours: number;
}

export interface QuoteInput {
  volumeCm3: number;
  quantity: number;
  technology: 'FDM' | 'SLA';
  density: number;
  costPerGram: number;
  wastePercentage: number;
  printSpeedModifier: number;
  infillPercentage: number;
  timeMultiplier: number;
  gcode?: GCodeConsumption | null;
  /**
   * Kullanıcı destek yapılarını istedi mi? `false` ise destek ayıklama işçiliği
   * ücretlendirilmez. Verilmezse "destek var" kabul edilir (eski davranış), ama
   * ölçülmüş G-Code'da hiç destek gramı yoksa yine de işçilik alınmaz.
   */
  supportEnabled?: boolean | null;
  preorderDiscountPercent?: number | null;
  labor: LaborMinutes;
  coefficients: CorrectionCoefficients;
  estimation: EstimationConfig;
  rates: PricingRates;
  quantityDiscountTiers: QuantityDiscountTier[];
  /** 0..1, e.g. 0.20 for %20 VAT. */
  vatRate: number;
}

export interface ConsumptionEstimate {
  /** Model filament in grams, excluding supports. */
  modelGrams: number;
  supportGrams: number;
  totalGrams: number;
  /** Print time for ONE part in hours. */
  printHours: number;
  source: 'gcode' | 'volume';
}

export interface QuoteResult {
  breakdown: PriceBreakdown;
  estimatedTime: {
    rawPrintTimeHours: number;
    correctedTimeHours: number;
    orderSetupHours: number;
    totalOrderHours: number;
    correctionBreakdown: {
      warmUpMinutes: number;
      calibrationMinutes: number;
      bedPrepMinutes: number;
      deadTimePerPartMinutes: number;
    };
  };
  source: 'gcode' | 'volume';
  warnings: string[];
}

const MAX_QUANTITY = 1000;
const MIN_PRINT_HOURS = 0.1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * KDV oranını 0..1 aralığına çevirir.
 *
 * `global_settings.vat_rate` yüzde olarak `0.2` tutuyor (admin ekranı
 * `value × 100` gösteriyor). Birisi `20` yazarsa sepet ve sipariş servisi
 * tutarı 20 katına çıkarıyordu; motor ise 20'yi yüzde kabul edip düzeltiyordu,
 * yani iki taraf ayrışıyordu. Tek dönüşüm noktası burasıdır.
 */
export function normalizeVatRate(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  const rate = parsed > 1 ? parsed / 100 : parsed;
  return clamp(rate, 0, 1);
}

/**
 * Estimate material and time from the model volume.
 *
 * `infillPercentage` is the infill density; the shell is always solid. The
 * print time uses the same extruded volume, otherwise a 20% infill part would
 * be charged the machine time of a solid part.
 */
export function estimateConsumption(input: {
  volumeCm3: number;
  density: number;
  printSpeedModifier: number;
  infillPercentage: number;
  timeMultiplier: number;
  technology: 'FDM' | 'SLA';
  estimation: EstimationConfig;
}): ConsumptionEstimate {
  const shellRatio = clamp(finite(input.estimation.shellRatio, 0.4), 0, 1);
  const supportRatio = clamp(finite(input.estimation.supportRatio, 0), 0, 1);
  const infill = clamp(finite(input.infillPercentage, 20), 0, 100) / 100;
  const speedModifier = clamp(finite(input.printSpeedModifier, 1), 0.1, 5);
  const timeMultiplier = clamp(finite(input.timeMultiplier, 1), 0.1, 10);

  const modelRatio = shellRatio + (1 - shellRatio) * infill;
  const modelGrams = input.volumeCm3 * modelRatio * input.density;
  const supportGrams = modelGrams * supportRatio;
  const totalGrams = modelGrams + supportGrams;

  const baseRate =
    input.technology === 'SLA'
      ? finite(input.estimation.printRateSla, 6)
      : finite(input.estimation.printRateFdm, 15);
  const rate = baseRate > 0 ? baseRate : 15;

  // Support extrusion adds time too; it is material that goes through the
  // nozzle. The ratio keeps that consistent with the gram estimate.
  const extrudedVolume = input.volumeCm3 * (modelRatio + modelRatio * supportRatio);
  const printHours = Math.max(
    MIN_PRINT_HOURS,
    (extrudedVolume / (rate * speedModifier)) * timeMultiplier
  );

  return {
    modelGrams,
    supportGrams,
    totalGrams,
    printHours,
    source: 'volume',
  };
}

function normalizeGCode(gcode: GCodeConsumption, estimation: EstimationConfig): ConsumptionEstimate {
  const totalGrams = Math.max(0, finite(gcode.totalGrams, 0));
  const supportGrams = clamp(finite(gcode.supportGrams, 0), 0, totalGrams);
  const printHours = Math.max(0.01, finite(gcode.printHours, 0));

  return {
    modelGrams: totalGrams - supportGrams,
    supportGrams,
    totalGrams,
    printHours,
    source: 'gcode',
  };
}

function applyBuffer(
  estimate: ConsumptionEstimate,
  buffer: number
): ConsumptionEstimate {
  const multiplier = clamp(finite(buffer, 1), 1, 2);
  if (multiplier === 1) return estimate;

  const totalGrams = estimate.totalGrams * multiplier;
  const supportRatio = estimate.totalGrams > 0 ? estimate.supportGrams / estimate.totalGrams : 0;
  const supportGrams = totalGrams * supportRatio;

  return {
    ...estimate,
    totalGrams,
    supportGrams,
    modelGrams: totalGrams - supportGrams,
  };
}

function selectDiscountTier(
  quantity: number,
  tiers: QuantityDiscountTier[]
): QuantityDiscountTier | null {
  let selected: QuantityDiscountTier | null = null;

  for (const tier of tiers) {
    const minQty = Math.floor(finite(tier.minQty, 0));
    const percent = clamp(finite(tier.discountPercent, 0), 0, 100);
    if (minQty > 0 && quantity >= minQty && (!selected || minQty > selected.minQty)) {
      selected = { minQty, discountPercent: percent };
    }
  }

  return selected;
}

/**
 * Compute a complete quote for one line item (quantity included).
 *
 * All `PriceBreakdown` subtotals are for the whole line (quantity included),
 * not per unit. `pricePerUnit` is the only per-unit value.
 */
export function computeQuote(input: QuoteInput): QuoteResult {
  const quantity = Math.floor(finite(input.quantity, 0));
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    throw new PricingError(`Geçersiz adet: ${input.quantity}`);
  }
  if (!Number.isFinite(input.volumeCm3) || input.volumeCm3 <= 0) {
    throw new PricingError('Model hacmi geçersiz');
  }
  if (!Number.isFinite(input.density) || input.density <= 0) {
    throw new PricingError('Malzeme yoğunluğu tanımlı değil');
  }
  if (!Number.isFinite(input.costPerGram) || input.costPerGram <= 0) {
    throw new PricingError('Malzeme birim fiyatı tanımlı değil');
  }

  // FDM fiyatı yalnızca gerçek dilimlemeden üretilir. Hacim tahminine düşmek
  // sessiz bir fiyat sapması demekti: 20 mm küpte tahmin 6.23 g, gerçek
  // dilimleme 4.41 g (%41 fark). Fiyat yoksa uydurma sayı da yok.
  if (input.technology === 'FDM' && !input.gcode) {
    throw new PricingError(
      'FDM fiyatı gerçek dilimleme sonucu olmadan hesaplanamaz'
    );
  }

  const vatRate = normalizeVatRate(input.vatRate);

  const wastePercentage = clamp(finite(input.wastePercentage, 0), 0, 100);
  const warnings: string[] = [];

  const rawEstimate = input.gcode
    ? normalizeGCode(input.gcode, input.estimation)
    : estimateConsumption({
        volumeCm3: input.volumeCm3,
        density: input.density,
        printSpeedModifier: input.printSpeedModifier,
        infillPercentage: input.infillPercentage,
        timeMultiplier: input.timeMultiplier,
        technology: input.technology,
        estimation: input.estimation,
      });

  // Buffer yalnızca tahmin içindir. Ölçülmüş bir G-Code gramına da %5 eklemek
  // "gerçek dilimleme" etiketini yalancı yapar ve fiyatı yukarı sapıtır.
  const estimate =
    rawEstimate.source === 'gcode'
      ? rawEstimate
      : applyBuffer(rawEstimate, input.estimation.filamentBufferMultiplier);

  // ---------- Material (whole line) ----------
  const wasteMultiplier = 1 + wastePercentage / 100;
  const materialSubtotal = roundMoney(
    estimate.totalGrams * quantity * input.costPerGram * wasteMultiplier
  );

  // ---------- Time ----------
  const coefficients = input.coefficients;
  const warmUpHours = Math.max(0, finite(coefficients.warmUpMinutes, 0)) / 60;
  const calibrationHours = Math.max(0, finite(coefficients.calibrationMinutes, 0)) / 60;
  const bedPrepHours = Math.max(0, finite(coefficients.bedPrepMinutes, 0)) / 60;
  const deadTimePerPartHours =
    Math.max(0, finite(coefficients.deadTimePerPartMinutes, 0)) / 60;

  const setupHours = warmUpHours + calibrationHours + bedPrepHours;
  const correctedPerUnitHours = estimate.printHours + deadTimePerPartHours;
  const totalOrderHours = correctedPerUnitHours * quantity + setupHours;

  // ---------- Machine (whole line) ----------
  const machineHourlyRate = Math.max(0, finite(input.rates.machineHourlyRate, 0));
  if (machineHourlyRate === 0) {
    warnings.push('Makine saatlik ücreti 0; makine maliyeti fiyata eklenmiyor.');
  }
  const machineSubtotal = roundMoney(totalOrderHours * machineHourlyRate);

  // ---------- Electricity (whole line) ----------
  const electricityRate = Math.max(0, finite(input.rates.electricityRatePerHour, 0));
  const electricitySubtotal = roundMoney(totalOrderHours * electricityRate);

  // ---------- Labor (file prep once, the rest per part) ----------
  const filePrepMinutes = Math.max(0, finite(input.labor.filePrepMinutes, 0));

  // Destek ayıklama yalnızca gerçekten destek varsa işçilik doğurur. Destek
  // kapalıysa ya da ölçülen G-Code'da destek gramı 0 ise bu süre fiyata
  // eklenmiyordu; "destek yok ama 15 dk destek temizliği" sessiz bir fazla
  // ücretlendirmeydi. Hacim tahmininde (SLA) destek varsayılır.
  const supportPresent =
    input.supportEnabled === false
      ? false
      : estimate.source === 'gcode'
        ? estimate.supportGrams > 0
        : true;

  const supportRemovalPerPart = supportPresent
    ? Math.max(0, finite(input.labor.supportRemovalMinutes, 0))
    : 0;
  const postProcessingPerPart = Math.max(0, finite(input.labor.postProcessingMinutes, 0));

  const laborMinutesTotal =
    filePrepMinutes + (supportRemovalPerPart + postProcessingPerPart) * quantity;
  const laborHourlyRate = Math.max(0, finite(input.rates.laborHourlyRate, 0));
  const laborSubtotal = roundMoney((laborMinutesTotal / 60) * laborHourlyRate);

  // ---------- Direct cost ----------
  const directCost = roundMoney(
    materialSubtotal + machineSubtotal + electricitySubtotal + laborSubtotal
  );

  // ---------- Risk premium ----------
  const riskPercentage = clamp(finite(input.rates.riskPercentage, 0), 0, 100);
  const riskSubtotal = roundMoney(directCost * (riskPercentage / 100));

  // ---------- Service fee (once per order) ----------
  const serviceFee = roundMoney(Math.max(0, finite(input.rates.serviceFee, 0)));

  // ---------- Profit margin ----------
  const profitMultiplier = Math.max(1, finite(input.rates.profitMultiplier, 1));
  const profitBase = roundMoney(directCost + riskSubtotal + serviceFee);
  const profitSubtotal = roundMoney(profitBase * (profitMultiplier - 1));

  // ---------- Gross, before discounts ----------
  const gross = roundMoney(
    directCost + riskSubtotal + serviceFee + profitSubtotal
  );

  // ---------- Discounts ----------
  const tier = selectDiscountTier(quantity, input.quantityDiscountTiers);
  let quantityDiscount = tier
    ? roundMoney(gross * (tier.discountPercent / 100))
    : undefined;

  const preorderPercent = clamp(
    finite(input.preorderDiscountPercent ?? 0, 0),
    0,
    100
  );
  const afterQuantityDiscount = roundMoney(gross - (quantityDiscount ?? 0));
  let preorderDiscount =
    preorderPercent > 0
      ? roundMoney(afterQuantityDiscount * (preorderPercent / 100))
      : undefined;

  // A discount must never sell below direct cost. Reduce the preorder
  // discount first, then the quantity discount, so the breakdown still adds up.
  let net = roundMoney(gross - (quantityDiscount ?? 0) - (preorderDiscount ?? 0));
  let discountCapped = false;

  if (net < directCost) {
    discountCapped = true;
    let allowedDiscountCents = Math.max(0, toCents(gross) - toCents(directCost));

    const preorderCents = toCents(preorderDiscount ?? 0);
    const preorderAllowed = Math.min(preorderCents, allowedDiscountCents);
    if (preorderAllowed < preorderCents) {
      preorderDiscount = preorderAllowed > 0 ? preorderAllowed / 100 : undefined;
    }
    allowedDiscountCents -= preorderAllowed;

    const quantityCents = toCents(quantityDiscount ?? 0);
    const quantityAllowed = Math.min(quantityCents, allowedDiscountCents);
    if (quantityAllowed < quantityCents) {
      quantityDiscount = quantityAllowed > 0 ? quantityAllowed / 100 : undefined;
    }

    net = roundMoney(gross - (quantityDiscount ?? 0) - (preorderDiscount ?? 0));
  }

  const pricePerUnit = roundMoney(net / quantity);

  // KDV, sipariş toplamında (order-totals) yeniden hesaplanır; burada yalnızca
  // müşteriye "KDV hariç" fiyatın yanında gerçek vergi tutarını gösterebilmek
  // için hesaplanıyor. `totalPrice` bilinçli olarak KDV hariç kalır; sepet ve
  // checkout bu tutara KDV'yi bir kez ekler.
  const vatAmount = roundMoney(net * vatRate);
  const totalWithVat = roundMoney(net + vatAmount);

  const breakdown: PriceBreakdown = {
    material: {
      filamentGrams: roundMoney(estimate.modelGrams * quantity, 2),
      supportGrams: roundMoney(estimate.supportGrams * quantity, 2),
      totalGrams: roundMoney(estimate.totalGrams * quantity, 2),
      wastePercentage,
      wasteGrams: roundMoney(
        (estimate.totalGrams * quantity * wastePercentage) / 100,
        2
      ),
      unitCostPerGram: input.costPerGram,
      subtotal: materialSubtotal,
    },
    machineAmortization: {
      correctedPrintTimeHours: roundMoney(totalOrderHours, 2),
      hourlyRate: machineHourlyRate,
      subtotal: machineSubtotal,
    },
    electricity: {
      printTimeHours: roundMoney(totalOrderHours, 2),
      rate: electricityRate,
      subtotal: electricitySubtotal,
    },
    labor: {
      filePrepMinutes,
      supportRemovalMinutes: roundMoney(supportRemovalPerPart * quantity, 2),
      postProcessingMinutes: roundMoney(postProcessingPerPart * quantity, 2),
      totalMinutes: roundMoney(laborMinutesTotal, 2),
      hourlyRate: laborHourlyRate,
      subtotal: laborSubtotal,
    },
    riskPremium: {
      baseTotal: directCost,
      premiumPercentage: riskPercentage,
      subtotal: riskSubtotal,
    },
    serviceFee,
    profitMargin: {
      baseTotal: profitBase,
      multiplier: profitMultiplier,
      subtotal: profitSubtotal,
    },
    subtotal: net,
    totalBeforeVat: net,
    vatRate,
    vatAmount,
    totalWithVat,
    pricePerUnit,
    totalPrice: net,
    quantityDiscount,
    preorderDiscount,
    directCost,
    discountCapped,
  };

  return {
    breakdown,
    estimatedTime: {
      rawPrintTimeHours: roundMoney(estimate.printHours, 2),
      correctedTimeHours: roundMoney(correctedPerUnitHours, 2),
      orderSetupHours: roundMoney(setupHours, 2),
      totalOrderHours: roundMoney(totalOrderHours, 2),
      correctionBreakdown: {
        warmUpMinutes: Math.round(warmUpHours * 60 * 100) / 100,
        calibrationMinutes: Math.round(calibrationHours * 60 * 100) / 100,
        bedPrepMinutes: Math.round(bedPrepHours * 60 * 100) / 100,
        deadTimePerPartMinutes: Math.round(deadTimePerPartHours * 60 * quantity * 100) / 100,
      },
    },
    source: estimate.source,
    warnings,
  };
}
