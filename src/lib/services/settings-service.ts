import { createClient } from '@/lib/supabase/client';
import { normalizeVatRate } from '@/lib/pricing/core';

let cachedVatRate: number | null = null;

export async function getVatRate(): Promise<number> {
  if (cachedVatRate !== null) return cachedVatRate;
  try {
    const supabase = createClient();
    const { data, error } = await (supabase.from('global_settings') as any)
      .select('value')
      .eq('key', 'vat_rate')
      .single();
    if (error || !data) return 0.20;
    const v = (data as any).value as { value?: number } | null;
    // 0.2 ile 20 aynı sonucu verir; dönüşüm tek yerde (normalizeVatRate).
    cachedVatRate = normalizeVatRate(v?.value ?? 20);
    return cachedVatRate;
  } catch {
    return 0.20;
  }
}

export function resetVatRateCache(): void {
  cachedVatRate = null;
}

interface CachedShippingSettings {
  shippingFee: number;
  freeShippingMinAmount: number;
}

let cachedShippingSettings: CachedShippingSettings | null = null;

export async function getShippingSettings(): Promise<CachedShippingSettings> {
  if (cachedShippingSettings !== null) return cachedShippingSettings;
  try {
    const supabase = createClient();
    const { data } = await (supabase
      .from('global_settings') as any)
      .select('value')
      .eq('key', 'shipping_settings')
      .maybeSingle();
    const settings: CachedShippingSettings = (data?.value as unknown as CachedShippingSettings) || { shippingFee: 0, freeShippingMinAmount: 0 };
    cachedShippingSettings = settings;
    return settings;
  } catch {
    return { shippingFee: 0, freeShippingMinAmount: 0 };
  }
}

export function resetShippingSettingsCache(): void {
  cachedShippingSettings = null;
}
