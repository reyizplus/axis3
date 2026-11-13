import { describe, expect, it } from 'vitest';
import { computeQuote, estimateConsumption, PricingError } from './core';
import type { QuoteInput } from './core';

/**
 * These tests lock in the business rules that decide the customer-facing
 * price. Each one corresponds to a real bug that was found in the pricing
 * pipeline, so a regression fails here instead of at checkout.
 */

const BASE: QuoteInput = {
  volumeCm3: 100,
  quantity: 1,
  technology: 'FDM',
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
};

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

describe('computeQuote - G-Code input', () => {
  it('uses the G-Code total and only breaks support out', () => {
    const result = quote({
      gcode: { totalGrams: 100, supportGrams: 20, printHours: 2 },
    });

    expect(result.source).toBe('gcode');
    // 100 g * 1.05 buffer = 105 g total, of which 20% is support.
    expect(result.breakdown.material.totalGrams).toBeCloseTo(105, 2);
    expect(result.breakdown.material.supportGrams).toBeCloseTo(21, 2);
    expect(result.breakdown.material.filamentGrams).toBeCloseTo(84, 2);
    expect(result.breakdown.material.subtotal).toBeCloseTo(80.85, 2);
  });

  it('does not add the support weight on top of the G-Code total', () => {
    const withSupport = quote({
      gcode: { totalGrams: 100, supportGrams: 20, printHours: 2 },
    });
    const withoutSupport = quote({
      gcode: { totalGrams: 100, supportGrams: 0, printHours: 2 },
    });

    expect(withSupport.breakdown.material.subtotal).toBeCloseTo(
      withoutSupport.breakdown.material.subtotal,
      2
    );
  });

  it('uses the real print time instead of the volume estimate', () => {
    const gcode = quote({ gcode: { totalGrams: 50, supportGrams: 0, printHours: 1 } });
    expect(gcode.estimatedTime.rawPrintTimeHours).toBe(1);
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
