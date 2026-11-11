/**
 * iyzico Client Configuration
 * Axis3 - Payment Gateway Integration
 * 
 * This module provides a configured iyzico client instance
 * and exports commonly used constants for payment operations.
 */

import Iyzipay from 'iyzipay';

// Validate environment variables
if (!process.env.IYZICO_API_KEY) {
  throw new Error('IYZICO_API_KEY is not defined in environment variables');
}

if (!process.env.IYZICO_SECRET_KEY) {
  throw new Error('IYZICO_SECRET_KEY is not defined in environment variables');
}

if (!process.env.IYZICO_BASE_URL) {
  throw new Error('IYZICO_BASE_URL is not defined in environment variables');
}

/**
 * Configured iyzico client instance
 */
export const iyzipayClient = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY,
  secretKey: process.env.IYZICO_SECRET_KEY,
  uri: process.env.IYZICO_BASE_URL
});

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
