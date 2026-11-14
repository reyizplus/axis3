import { describe, expect, it } from 'vitest';
import { computeQuote, estimateConsumption, normalizeVatRate, PricingError } from './core';
import type { QuoteInput } from './core';

/**
 * These tests lock in the business rules that decide the customer-facing
 * price. Each one corresponds to a real bug that was found in the pricing
 * pipeline, so a regression fails here instead of at checkout.
 */

const BASE: QuoteInput = {
  volumeCm3: 100,
  quantity: 1,
  // FDM artık G-Code olmadan fiyatlanmıyor; kurulum/işçilik/makine/KDV
  // kuralları teknolojiden bağımsız olduğu için bu testler SLA ile koşuyor.
  technology: 'SLA',
  density: 1.24,
  costPerGram: 0.7,
  wastePercentage: 10,
  printSpeedModifier: 1,
  infillPercentage: 20,
  timeMultiplier: 1,
  labor: { filePrepMinutes: 10, supportRemovalMinutes: 15, postProcessingMinutes: 10 },
  coefficients: { warmUpMinutes: 5, calibrationMinutes: 3, bedPrepMinutes: 2, deadTimePerPartMinutes: 1 },
  estimation: {
    shellRatio: 0.4,
    supportRatio: 0.15,
    printRateFdm: 15,
    printRateSla: 6,
    filamentBufferMultiplier: 1.05,
  },
  rates: {
    machineHourlyRate: 0,
    electricityRatePerHour: 2.59,
    laborHourlyRate: 12,
    riskPercentage: 0,
    serviceFee: 25,
    profitMultiplier: 1,
  },
  quantityDiscountTiers: [],
  vatRate: 0.2,
};

/** FDM fiyatı yalnızca gerçek dilimleme ile üretilir. */
const FDM_SLICE = { totalGrams: 100, supportGrams: 20, printHours: 2 };

function quote(overrides: Partial<QuoteInput> = {}) {
  return computeQuote({ ...BASE, ...overrides });
}

describe('estimateConsumption', () => {
  it('counts supports exactly once', () => {
    const estimate = estimateConsumption({
      volumeCm3: 100,
      density: 1.24,
      printSpeedModifier: 1,
      infillPercentage: 20,
      timeMultiplier: 1,
      technology: 'FDM',
      estimation: BASE.estimation,
    });

    // model = 100 * (0.4 + 0.6 * 0.20) * 1.24 = 64.48 g
    // support = 64.48 * 0.15 = 9.672 g
    expect(estimate.modelGrams).toBeCloseTo(64.48, 2);
    expect(estimate.supportGrams).toBeCloseTo(9.672, 2);
    expect(estimate.totalGrams).toBeCloseTo(74.152, 2);
    // The old code added the support twice (74.152 + 9.672 = 83.824).
    expect(estimate.totalGrams).not.toBeCloseTo(83.824, 2);
  });

  it('prices 20% infill faster than a solid part', () => {
    const common = {
      volumeCm3: 100,
      density: 1.24,
      printSpeedModifier: 1,
      timeMultiplier: 1,
      technology: 'FDM' as const,
      estimation: BASE.estimation,
    };

    const sparse = estimateConsumption({ ...common, infillPercentage: 20 });
    const solid = estimateConsumption({ ...common, infillPercentage: 100 });

    expect(sparse.printHours).toBeCloseTo(59.8 / 15, 3);
    expect(solid.printHours).toBeCloseTo(115 / 15, 3);
    expect(sparse.printHours).toBeLessThan(solid.printHours);
  });

  it('applies the speed multiplier as an inverse time factor', () => {
    const common = {
      volumeCm3: 100,
      density: 1.24,
      printSpeedModifier: 1,
      infillPercentage: 20,
      technology: 'FDM' as const,
      estimation: BASE.estimation,
    };

    const normal = estimateConsumption({ ...common, timeMultiplier: 1 });
    const fast = estimateConsumption({ ...common, timeMultiplier: 0.5 });

    expect(fast.printHours).toBeCloseTo(normal.printHours / 2, 4);
  });
});

describe('computeQuote - quantity and setup', () => {
  it('charges setup, file prep and the service fee once per order', () => {
    const single = quote({ quantity: 1 });
    const triple = quote({ quantity: 3 });

    expect(single.breakdown.serviceFee).toBe(25);
    expect(triple.breakdown.serviceFee).toBe(25);

    // File preparation is per order; support removal and post processing are
    // per part.
    expect(single.breakdown.labor.filePrepMinutes).toBe(10);
    expect(triple.breakdown.labor.filePrepMinutes).toBe(10);
    expect(triple.breakdown.labor.supportRemovalMinutes).toBe(45);
    expect(triple.breakdown.labor.postProcessingMinutes).toBe(30);

    const singleSetup = single.estimatedTime.orderSetupHours ?? 0;
    const tripleSetup = triple.estimatedTime.orderSetupHours ?? 0;
    expect(singleSetup).toBeCloseTo(10 / 60, 2);
    expect(tripleSetup).toBeCloseTo(10 / 60, 2);
  });

  it('scales machine and electricity time with quantity', () => {
    const single = quote({
      quantity: 1,
      rates: { ...BASE.rates, machineHourlyRate: 10, electricityRatePerHour: 2.59 },
    });
    const triple = quote({
      quantity: 3,
      rates: { ...BASE.rates, machineHourlyRate: 10, electricityRatePerHour: 2.59 },
    });

    const perUnit = single.estimatedTime.correctedTimeHours;
    const expectedTriple =
      perUnit * 3 + (single.estimatedTime.orderSetupHours ?? 0);

    expect(triple.estimatedTime.totalOrderHours).toBeCloseTo(expectedTriple, 1);
    expect(triple.breakdown.machineAmortization.subtotal).toBeGreaterThan(
      single.breakdown.machineAmortization.subtotal * 2
    );
    expect(triple.breakdown.electricity.subtotal).toBeGreaterThan(
      single.breakdown.electricity.subtotal * 2
    );
  });
});

describe('computeQuote - destek işçiliği', () => {
  it('destek kapalıysa destek ayıklama süresi ücretlendirilmez', () => {
    const withSupport = quote();
    const withoutSupport = quote({ supportEnabled: false });

    expect(withSupport.breakdown.labor.supportRemovalMinutes).toBe(15);
    expect(withoutSupport.breakdown.labor.supportRemovalMinutes).toBe(0);
    expect(withoutSupport.breakdown.labor.totalMinutes).toBe(20);
    expect(withoutSupport.breakdown.labor.subtotal).toBeLessThan(
      withSupport.breakdown.labor.subtotal
    );
  });

  it('ölçülen G-Code destek gramı 0 ise destek işçiliği alınmaz', () => {
    const result = quote({
      technology: 'FDM',
      gcode: { totalGrams: 100, supportGrams: 0, printHours: 2 },
    });

    expect(result.breakdown.labor.supportRemovalMinutes).toBe(0);
    expect(result.breakdown.labor.totalMinutes).toBe(20);
  });

  it('ölçülen destek gramı varsa destek işçiliği alınır', () => {
    const result = quote({
      technology: 'FDM',
      gcode: FDM_SLICE,
    });

    expect(result.breakdown.labor.supportRemovalMinutes).toBe(15);
  });

  it('kullanıcı desteği kapattıysa G-Code destek gramı olsa da işçilik alınmaz', () => {
    const result = quote({
      technology: 'FDM',
      gcode: FDM_SLICE,
      supportEnabled: false,
    });

    expect(result.breakdown.labor.supportRemovalMinutes).toBe(0);
  });

  it('seçim verilmezse hacim tahmininde destek varsayılır', () => {
    const result = quote();

    expect(result.source).toBe('volume');
    expect(result.breakdown.labor.supportRemovalMinutes).toBe(15);
  });
});

describe('computeQuote - G-Code input', () => {
  it('uses the G-Code total and only breaks support out', () => {
    const result = quote({
      technology: 'FDM',
      gcode: FDM_SLICE,
    });

    expect(result.source).toBe('gcode');
    // Ölçülmüş grama buffer EKLENMEZ: 100 g gerçekten 100 g'dır.
    expect(result.breakdown.material.totalGrams).toBeCloseTo(100, 2);
    expect(result.breakdown.material.supportGrams).toBeCloseTo(20, 2);
    expect(result.breakdown.material.filamentGrams).toBeCloseTo(80, 2);
    // Fire kırılımı görünür olmalı: 100 g * %10 = 10 g.
    expect(result.breakdown.material.wastePercentage).toBe(10);
    expect(result.breakdown.material.wasteGrams).toBeCloseTo(10, 2);
    // 100 g * 0.7 TL/g * 1.10 fire
    expect(result.breakdown.material.subtotal).toBeCloseTo(77, 2);
  });

  it('does not add the support weight on top of the G-Code total', () => {
    const withSupport = quote({
      technology: 'FDM',
      gcode: { totalGrams: 100, supportGrams: 20, printHours: 2 },
    });
    const withoutSupport = quote({
      technology: 'FDM',
      gcode: { totalGrams: 100, supportGrams: 0, printHours: 2 },
    });

    expect(withSupport.breakdown.material.subtotal).toBeCloseTo(
      withoutSupport.breakdown.material.subtotal,
      2
    );
  });

  it('uses the real print time instead of the volume estimate', () => {
    const gcode = quote({
      technology: 'FDM',
      gcode: { totalGrams: 50, supportGrams: 0, printHours: 1 },
    });
    expect(gcode.estimatedTime.rawPrintTimeHours).toBe(1);
  });

  it('refuses to price FDM without a slice', () => {
    // Hacim tahmini 20 mm küpte 6.23 g verirken gerçek dilimleme 4.41 g
    // veriyordu (%41 sapma). Fiyat yoksa uydurma sayı da yok.
    expect(() => quote({ technology: 'FDM', gcode: null })).toThrow(PricingError);
    expect(() => quote({ technology: 'FDM', gcode: undefined })).toThrow(/dilimleme/i);
  });

  it('keeps the volume estimate for SLA (no SLA slicer yet)', () => {
    const result = quote({ technology: 'SLA' });
    expect(result.source).toBe('volume');
    expect(result.breakdown.totalPrice).toBeGreaterThan(0);
  });

  it('applies the filament buffer only to estimates', () => {
    const estimated = quote({ technology: 'SLA' });
    const noBuffer = quote({
      technology: 'SLA',
      estimation: { ...BASE.estimation, filamentBufferMultiplier: 1 },
    });

    // SLA tahmini: 74.152 g * 1.05 = 77.86 g
    expect(estimated.breakdown.material.totalGrams).toBeCloseTo(77.86, 1);
    expect(noBuffer.breakdown.material.totalGrams).toBeCloseTo(74.15, 1);
    expect(estimated.breakdown.material.totalGrams).toBeGreaterThan(
      noBuffer.breakdown.material.totalGrams
    );

    // Ölçülmüş dilimleme gramı buffer'lanmaz.
    const sliced = quote({ technology: 'FDM', gcode: FDM_SLICE });
    expect(sliced.breakdown.material.totalGrams).toBeCloseTo(100, 2);
  });
});

describe('computeQuote - VAT', () => {
  it('computes VAT on top of the tax-exclusive total', () => {
    const result = quote({ technology: 'SLA', vatRate: 0.2 });
    const net = result.breakdown.totalPrice;

    expect(result.breakdown.vatRate).toBe(0.2);
    expect(result.breakdown.vatAmount).toBeCloseTo(net * 0.2, 2);
    expect(result.breakdown.totalWithVat).toBeCloseTo(net + net * 0.2, 2);
    // `totalPrice` bilinçli olarak KDV hariç: sepet/checkout KDV'yi bir kez
    // ekliyor, iki yerde eklenirse müşteri %20 fazla öder.
    expect(result.breakdown.totalPrice).toBeCloseTo(net, 2);
  });

  it('treats a missing VAT rate as 0 instead of inventing tax', () => {
    const result = quote({ technology: 'SLA', vatRate: 0 });
    expect(result.breakdown.vatAmount).toBe(0);
    expect(result.breakdown.totalWithVat).toBeCloseTo(result.breakdown.totalPrice, 2);
  });

  it('normalizes a percentage-style VAT rate (20 → 0.2)', () => {
    // Sepet/sipariş servisi ve motor aynı dönüşümü kullanmazsa 20 değeri
    // tutarı 20 katına çıkarıyordu.
    expect(normalizeVatRate(20)).toBeCloseTo(0.2, 6);
    expect(normalizeVatRate(0.2)).toBeCloseTo(0.2, 6);
    expect(normalizeVatRate(1)).toBe(1);
    expect(normalizeVatRate(-5)).toBe(0);
    expect(normalizeVatRate(Number.NaN)).toBe(0);

    const percentStyle = quote({ technology: 'SLA', vatRate: 20 });
    const ratioStyle = quote({ technology: 'SLA', vatRate: 0.2 });
    expect(percentStyle.breakdown.vatRate).toBeCloseTo(ratioStyle.breakdown.vatRate, 6);
    expect(percentStyle.breakdown.vatAmount).toBeCloseTo(
      ratioStyle.breakdown.vatAmount,
      2
    );
  });
});

describe('computeQuote - discounts', () => {
  it('never discounts below the direct cost', () => {
    const result = quote({
      quantity: 10,
      preorderDiscountPercent: 90,
      quantityDiscountTiers: [{ minQty: 5, discountPercent: 15 }],
    });

    const directCost = result.breakdown.directCost ?? 0;
    expect(result.breakdown.discountCapped).toBe(true);
    expect(directCost).toBeGreaterThan(0);
    expect(result.breakdown.subtotal).toBeCloseTo(directCost, 2);
    expect(result.breakdown.totalPrice).toBeCloseTo(directCost, 2);

    const totalDiscount =
      (result.breakdown.quantityDiscount ?? 0) + (result.breakdown.preorderDiscount ?? 0);
    const gross =
      directCost +
      result.breakdown.riskPremium.subtotal +
      result.breakdown.serviceFee +
      result.breakdown.profitMargin.subtotal;
    expect(gross - totalDiscount).toBeCloseTo(result.breakdown.subtotal, 2);
  });

  it('applies the best matching quantity tier exactly once', () => {
    const result = quote({
      quantity: 10,
      rates: { ...BASE.rates, profitMultiplier: 1.3 },
      quantityDiscountTiers: [
        { minQty: 5, discountPercent: 5 },
        { minQty: 10, discountPercent: 10 },
        { minQty: 20, discountPercent: 15 },
      ],
    });

    const gross =
      (result.breakdown.directCost ?? 0) +
      result.breakdown.riskPremium.subtotal +
      result.breakdown.serviceFee +
      result.breakdown.profitMargin.subtotal;

    // Enough margin for the discount to apply without hitting the floor.
    expect(result.breakdown.discountCapped).toBeFalsy();
    expect(result.breakdown.quantityDiscount).toBeCloseTo(gross * 0.1, 2);
  });

  it('ignores a preorder discount when the order is not a preorder', () => {
    const noDiscount = quote({ preorderDiscountPercent: null });
    const zeroDiscount = quote({ preorderDiscountPercent: 0 });

    expect(noDiscount.breakdown.preorderDiscount).toBeUndefined();
    expect(zeroDiscount.breakdown.preorderDiscount).toBeUndefined();
    expect(noDiscount.breakdown.totalPrice).toBeCloseTo(zeroDiscount.breakdown.totalPrice, 2);
  });
});

describe('computeQuote - explicit zeros', () => {
  it('treats a 0 machine rate as a real value, not a missing setting', () => {
    const result = quote({
      rates: { ...BASE.rates, machineHourlyRate: 0 },
    });

    expect(result.breakdown.machineAmortization.hourlyRate).toBe(0);
    expect(result.breakdown.machineAmortization.subtotal).toBe(0);
    expect(result.warnings.some((warning) => warning.includes('Makine saatlik ücreti 0'))).toBe(true);
  });

  it('keeps a 0 risk premium at zero', () => {
    const result = quote({
      rates: { ...BASE.rates, riskPercentage: 0 },
    });

    expect(result.breakdown.riskPremium.premiumPercentage).toBe(0);
    expect(result.breakdown.riskPremium.subtotal).toBe(0);
  });
});

describe('computeQuote - money integrity', () => {
  it('keeps the breakdown additive to the kuruş', () => {
    const result = quote({
      quantity: 4,
      rates: {
        ...BASE.rates,
        machineHourlyRate: 7.35,
        riskPercentage: 12.5,
        profitMultiplier: 1.3,
      },
      quantityDiscountTiers: [{ minQty: 3, discountPercent: 7 }],
    });

    const b = result.breakdown;
    const directCost =
      b.material.subtotal +
      b.machineAmortization.subtotal +
      b.electricity.subtotal +
      b.labor.subtotal;

    expect(b.directCost).toBeCloseTo(directCost, 2);

    const gross = directCost + b.riskPremium.subtotal + b.serviceFee + b.profitMargin.subtotal;
    const net = gross - (b.quantityDiscount ?? 0) - (b.preorderDiscount ?? 0);
    expect(b.subtotal).toBeCloseTo(net, 2);
    expect(b.totalPrice).toBeCloseTo(net, 2);
    expect(b.totalBeforeVat).toBeCloseTo(net, 2);
  });

  it('rounds pricePerUnit against the line total, not the other way round', () => {
    const result = quote({ quantity: 3 });
    expect(result.breakdown.pricePerUnit).toBeCloseTo(
      result.breakdown.totalPrice / 3,
      2
    );
  });

  it('produces a positive price for a normal configuration', () => {
    const result = quote();
    expect(result.breakdown.totalPrice).toBeGreaterThan(0);
    expect(result.breakdown.directCost).toBeGreaterThan(0);
    expect(Number.isFinite(result.breakdown.totalPrice)).toBe(true);
  });
});

describe('computeQuote - validation', () => {
  it('rejects non-positive quantity and volume', () => {
    expect(() => quote({ quantity: 0 })).toThrow(PricingError);
    expect(() => quote({ volumeCm3: 0 })).toThrow(PricingError);
  });

  it('rejects missing density or material cost', () => {
    expect(() => quote({ density: 0 })).toThrow(PricingError);
    expect(() => quote({ costPerGram: 0 })).toThrow(PricingError);
  });
});
