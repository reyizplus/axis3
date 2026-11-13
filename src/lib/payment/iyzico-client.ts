/**
 * iyzico Client Configuration
 * Axis3 - Payment Gateway Integration
 * 
 * This module provides a configured iyzico client instance
 * and exports commonly used constants for payment operations.
 */

import Iyzipay from 'iyzipay';

/**
 * iyzico configuration is resolved lazily.
 *
 * The previous version threw at module import time when any env var was
 * missing. Because payment-service imports this module, a missing key crashed
 * the whole route on import instead of returning a readable error — and a
 * placeholder value silently looked "configured".
 */
function readConfig() {
  return {
    apiKey: process.env.IYZICO_API_KEY?.trim(),
    secretKey: process.env.IYZICO_SECRET_KEY?.trim(),
    uri: process.env.IYZICO_BASE_URL?.trim(),
  };
}

export function isIyzicoConfigured(): boolean {
  const { apiKey, secretKey, uri } = readConfig();
  return Boolean(apiKey && secretKey && uri);
}

let cachedClient: Iyzipay | null = null;

/**
 * Returns a configured iyzico client.
 * Throws a descriptive error only when actually called.
 */
export function getIyzipayClient(): Iyzipay {
  const { apiKey, secretKey, uri } = readConfig();

  if (!apiKey || !secretKey || !uri) {
    throw new Error(
      'iyzico yapılandırılmamış: IYZICO_API_KEY, IYZICO_SECRET_KEY ve IYZICO_BASE_URL tanımlanmalıdır.'
    );
  }

  if (!cachedClient) {
    cachedClient = new Iyzipay({ apiKey, secretKey, uri });
  }

  return cachedClient;
}

/**
 * iyzico Constants
 */
export const LOCALE = Iyzipay.LOCALE;
export const CURRENCY = Iyzipay.CURRENCY;
export const PAYMENT_GROUP = Iyzipay.PAYMENT_GROUP;
export const BASKET_ITEM_TYPE = Iyzipay.BASKET_ITEM_TYPE;
export const PAYMENT_CHANNEL = Iyzipay.PAYMENT_CHANNEL;

/**
 * Payment configuration
 */
export const PAYMENT_CONFIG = {
  locale: LOCALE.TR,
  currency: CURRENCY.TRY,
  paymentGroup: PAYMENT_GROUP.PRODUCT,
  paymentChannel: PAYMENT_CHANNEL.WEB,
  enabledInstallments: [1, 2, 3, 6, 9, 12] as number[],
  // FIXED: Callback URL must point to API endpoint, not page
  callbackUrl: `${process.env.NEXT_PUBLIC_URL}/api/v1/payments/callback`,
};
