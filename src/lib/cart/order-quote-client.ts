'use client';

/**
 * Sepet → sipariş/teklif payload'ı ve teklif istemcisi.
 *
 * Checkout bu dönüşümü kendi içinde tekrar ettiğinde bir alan (ör.
 * `supportEnabled`) unutulduğunda sunucu farklı fiyat üretiyor ve müşteri
 * "fiyatlar güncellendi" hatası alıyordu. Tek bir dönüşüm noktası tutuluyor.
 */

import type { CartItem } from './cart-service';
import type { StoreItem } from './store-cart';
import type {
  OrderItemInput,
  OrderQuote,
  StoreItemInput,
} from '@/lib/services/order-creation-service';

export function toOrderItemInput(item: CartItem): OrderItemInput {
  return {
    fileId: item.fileId,
    materialId: item.materialId,
    quantity: item.quantity,
    color: item.color ?? null,
    nozzleSizeId: item.nozzleSizeId ?? null,
    nozzleSizeMm: item.nozzleSizeMm ?? null,
    supportEnabled: item.supportEnabled !== false,
    printSettingId:
      item.printSettingId && item.printSettingId !== 'custom'
        ? item.printSettingId
        : null,
    printSettingName: item.printSettingName ?? null,
    isPreorder: item.isPreorder ?? false,
    preorderDiscountPercent: item.preorderDiscountPercent ?? null,
    estimatedRestockDays: item.estimatedRestockDays ?? null,
    customLayerHeight: item.customLayerHeight ?? null,
    customInfillPercentage: item.customInfillPercentage ?? null,
    customTimeMultiplier: item.customTimeMultiplier ?? null,
    customLayerThickness: item.customLayerThickness ?? null,
    customExposureTime: item.customExposureTime ?? null,
  };
}

export function toStoreItemInput(item: StoreItem): StoreItemInput {
  return { productId: item.productId, quantity: item.quantity };
}

export interface OrderQuoteRequest {
  items: OrderItemInput[];
  storeItems: StoreItemInput[];
  couponCode?: string;
}

export interface OrderQuoteError {
  status: number;
  code?: string;
  message: string;
}

export interface OrderQuoteResult {
  quote: OrderQuote | null;
  error: OrderQuoteError | null;
}

/**
 * Son başarılı teklifin ayarları (KDV/kargo/adet indirimi kademeleri).
 *
 * Sepet sayfası kademeleri buradan okur: "10 adette %5 indirim" gibi bir
 * sonraki eşik, teklifin kendi ayarlarıyla gösterilir; istemcide ikinci bir
 * varsayılan kademe listesi tutulmaz.
 */
let lastQuoteSettings: OrderQuote['settings'] | null = null;

export function getLastQuoteSettings(): OrderQuote['settings'] | null {
  return lastQuoteSettings;
}

/**
 * Sunucudan sepet teklifini ister. Ağ/oturum hatalarında `error` döner;
 * çağıran taraf siparişi engellemek yerine mevcut (yerel) fiyatlarla devam
 * edebilir — nihai fiyat yine sunucuda hesaplanır.
 */
export async function requestOrderQuote(
  input: OrderQuoteRequest
): Promise<OrderQuoteResult> {
  try {
    const response = await fetch('/api/v1/orders/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success || !data?.quote) {
      return {
        quote: null,
        error: {
          status: response.status,
          code: typeof data?.code === 'string' ? data.code : undefined,
          message:
            typeof data?.error === 'string'
              ? data.error
              : 'Fiyat doğrulanamadı',
        },
      };
    }

    const quote = data.quote as OrderQuote;
    lastQuoteSettings = quote.settings;
    return { quote, error: null };
  } catch {
    return {
      quote: null,
      error: { status: 0, message: 'Fiyat doğrulanamadı' },
    };
  }
}
