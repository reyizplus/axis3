/**
 * Type definitions for iyzipay
 * iyzico Payment Gateway TypeScript Definitions
 */

declare module 'iyzipay' {
  export interface IyzipayConfig {
    apiKey: string;
    secretKey: string;
    uri: string;
  }

  export interface IyzipayRequest {
    locale?: string;
    conversationId?: string;
    price?: string;
    paidPrice?: string;
    currency?: string;
    basketId?: string;
    paymentGroup?: string;
    callbackUrl?: string;
    enabledInstallments?: number[];
    buyer?: Buyer;
    shippingAddress?: Address;
    billingAddress?: Address;
    basketItems?: BasketItem[];
    token?: string;
  }

  export interface Buyer {
    id: string;
    name: string;
    surname: string;
    gsmNumber?: string;
    email: string;
    identityNumber: string;
    registrationAddress?: string;
    city?: string;
    country?: string;
    zipCode?: string;
  }

  export interface Address {
    contactName: string;
    city: string;
    country: string;
    address: string;
    zipCode?: string;
  }

  export interface BasketItem {
    id: string;
    name: string;
    category1: string;
    category2?: string;
    itemType: string;
    price: string;
  }

  export interface IyzipayResponse {
    status: string;
    locale?: string;
    systemTime?: number;
    conversationId?: string;
    paymentPageUrl?: string;
    token?: string;
    tokenExpireTime?: number;
    paymentId?: string;
    paymentStatus?: string;
    fraudStatus?: number;
    merchantCommissionRate?: number;
    merchantCommissionRateAmount?: number;
    iyziCommissionRateAmount?: number;
    iyziCommissionFee?: number;
    cardType?: string;
    cardAssociation?: string;
    cardFamily?: string;
    binNumber?: string;
    lastFourDigits?: string;
    basketId?: string;
    currency?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itemTransactions?: any[];
    price?: number;
    paidPrice?: number;
    installment?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paymentItems?: any[];
    errorCode?: string;
    errorMessage?: string;
    errorGroup?: string;
  }

  export interface CheckoutFormInitialize {
    create(
      request: IyzipayRequest,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback: (err: any, result: IyzipayResponse) => void
    ): void;
  }

  export interface CheckoutForm {
    retrieve(
      request: { token: string },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback: (err: any, result: IyzipayResponse) => void
    ): void;
  }

  export class Iyzipay {
    constructor(config: IyzipayConfig);
    
    checkoutFormInitialize: CheckoutFormInitialize;
    checkoutForm: CheckoutForm;

    static LOCALE: {
      TR: string;
      EN: string;
    };

    static CURRENCY: {
      TRY: string;
      EUR: string;
      USD: string;
      GBP: string;
    };

    static PAYMENT_GROUP: {
      PRODUCT: string;
      LISTING: string;
      SUBSCRIPTION: string;
    };

    static BASKET_ITEM_TYPE: {
      PHYSICAL: string;
      VIRTUAL: string;
    };

    static PAYMENT_CHANNEL: {
      WEB: string;
      MOBILE: string;
      MOBILE_WEB: string;
      MOBILE_IOS: string;
      MOBILE_ANDROID: string;
      MOBILE_WINDOWS: string;
      MOBILE_TABLET: string;
      MOBILE_PHONE: string;
    };
  }

  export default Iyzipay;
}
