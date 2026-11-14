import { describe, expect, it } from 'vitest';
import { MACHINE_HOURS_PER_MONTH, resolveMachineHourlyRate } from './machine-rate';

/**
 * Makine maliyeti müşteri fiyatına doğrudan giriyor. Kod içinde gömülü bir
 * varsayılan ücret olmadığı için bu testler, ücretin yalnızca DB'deki
 * ayarlardan üretilebildiğini doğrular.
 */

describe('resolveMachineHourlyRate', () => {
  it('saatlik ücret girilmişse onu kullanır, makine fiyatını yok sayar', () => {
    const result = resolveMachineHourlyRate({
      hourly_rate: 15,
      purchase_cost: 60000,
      depreciation_months: 36,
      monthly_maintenance: 0,
    });

    expect(result).toEqual({ hourlyRate: 15, configured: true, derived: false });
  });

  it('saatlik ücret 0 ise makine fiyatı + bakımdan türetir', () => {
    // (15000 / 36 + 200) / 160 = (416.666... + 200) / 160 = 3.8541666...
    const result = resolveMachineHourlyRate({
      hourly_rate: 0,
      purchase_cost: 15000,
      depreciation_months: 36,
      monthly_maintenance: 200,
    });

    expect(result.derived).toBe(true);
    expect(result.configured).toBe(true);
    expect(result.hourlyRate).toBeCloseTo(3.8542, 3);
  });

  it('160 saat/ay varsayımını tek yerden kullanır', () => {
    const result = resolveMachineHourlyRate({
      hourly_rate: 0,
      purchase_cost: MACHINE_HOURS_PER_MONTH * 12 * 10,
      depreciation_months: 12,
      monthly_maintenance: 0,
    });

    // 10 yıl değil 1 yıl: (19200 / 12) / 160 = 10 TL/saat
    expect(result.hourlyRate).toBeCloseTo(10, 5);
  });

  it('ne saatlik ücret ne makine fiyatı varsa 0 döner (gömülü varsayılan yok)', () => {
    const result = resolveMachineHourlyRate({
      hourly_rate: 0,
      purchase_cost: 0,
      depreciation_months: 36,
      monthly_maintenance: 0,
    });

    expect(result).toEqual({ hourlyRate: 0, configured: false, derived: false });
  });

  it('amortisman ayı tanımsızsa türetme yapmaz', () => {
    const result = resolveMachineHourlyRate({
      hourly_rate: 0,
      purchase_cost: 15000,
      depreciation_months: 0,
      monthly_maintenance: 0,
    });

    expect(result).toEqual({ hourlyRate: 0, configured: false, derived: false });
  });

  it('satır yoksa 0 döner', () => {
    expect(resolveMachineHourlyRate(null)).toEqual({
      hourlyRate: 0,
      configured: false,
      derived: false,
    });
    expect(resolveMachineHourlyRate(undefined)).toEqual({
      hourlyRate: 0,
      configured: false,
      derived: false,
    });
  });

  it('metin ve negatif değerleri güvenli şekilde sayıya çevirir', () => {
    const result = resolveMachineHourlyRate({
      hourly_rate: '-5',
      purchase_cost: '30000',
      depreciation_months: '36',
      monthly_maintenance: '-100',
    } as any);

    // Saatlik ücret negatif olduğu için yok sayılır; bakım negatifse 0 alınır.
    // (30000 / 36 + 0) / 160 = 5.208333...
    expect(result.derived).toBe(true);
    expect(result.hourlyRate).toBeCloseTo(5.2083, 3);
  });
});
