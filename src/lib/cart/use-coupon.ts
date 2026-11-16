'use client';

/**
 * React binding for `coupon-store`.
 *
 * Responsibilities:
 * - hydrate the applied code from localStorage and keep tabs/pages in sync
 * - apply/remove through the preview endpoint
 * - silently re-validate whenever the cart totals change, so a coupon that is
 *   no longer valid is removed here instead of surprising the user at checkout
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COUPON_STORAGE_PREFIX,
  COUPON_UPDATED_EVENT,
  clearAppliedCoupon,
  getAppliedCoupon,
  normalizeCouponCode,
  setAppliedCoupon,
  validateCouponCode,
  type AppliedCoupon,
  type CouponCartTotals,
} from './coupon-store';
import { toCents } from '@/lib/utils/money';

export interface UseCouponResult {
  coupon: AppliedCoupon | null;
  isChecking: boolean;
  /** Red, single-line error for the last apply attempt or re-validation. */
  error: string | null;
  /** Amber note shown when a coupon was dropped after the cart changed. */
  removedNotice: string | null;
  apply: (code: string) => Promise<boolean>;
  remove: () => void;
  clearError: () => void;
}

function totalsSignature(totals: CouponCartTotals): string {
  return [
    toCents(totals.itemsSubtotal),
    toCents(totals.serviceSubtotal),
    toCents(totals.storeSubtotal),
  ].join(':');
}

export function useCoupon(totals: CouponCartTotals): UseCouponResult {
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removedNotice, setRemovedNotice] = useState<string | null>(null);

  const totalsRef = useRef(totals);
  useEffect(() => {
    totalsRef.current = totals;
  }, [totals]);

  /** Cart signature the current coupon was last validated against. */
  const lastValidated = useRef<string | null>(null);
  const signature = totalsSignature(totals);

  useEffect(() => {
    const sync = () => setCoupon(getAppliedCoupon());
    sync();

    const handleStorage = (event: StorageEvent) => {
      if (event.key?.startsWith(COUPON_STORAGE_PREFIX)) sync();
    };

    window.addEventListener(COUPON_UPDATED_EVENT, sync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(COUPON_UPDATED_EVENT, sync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Silent re-validation on cart changes (quantity, removal, store cart).
  useEffect(() => {
    if (!coupon) {
      lastValidated.current = null;
      return;
    }

    if (signature === lastValidated.current) return;
    // Nothing to validate against yet (empty cart or still loading). Keep the
    // code so it comes back to life when the user adds items again.
    if (toCents(totalsRef.current.itemsSubtotal) <= 0) return;

    /**
     * İlk doğrulama (localStorage'dan gelen kupon) beklemesiz yapılır: kupon
     * geçersizse kullanıcı "Siparişi Tamamla"ya basmadan önce kaldırılmalı.
     * Aksi halde ilk tıklama sunucuda kupon hatasıyla döner, kupon sessizce
     * düşer ve ikinci tıklama daha yüksek tutarla sipariş oluşturur.
     */
    const isInitialHydration = lastValidated.current === null;

    lastValidated.current = signature;
    let active = true;

    // Butonu meşgul göster: doğrulanmamış kuponla sipariş gönderilmesin.
    setIsChecking(true);

    // Quantity buttons can be clicked several times in a row; wait until the
    // cart settles before spending a validate request (the endpoint is rate
    // limited per user). The very first check is not debounced.
    const timer = setTimeout(() => {

      void validateCouponCode(coupon.code, totalsRef.current).then((result) => {
        if (!active) return;
        setIsChecking(false);

        if (result.valid) {
          setError(null);
          const changed =
            toCents(result.coupon.discountAmount) !== toCents(coupon.discountAmount) ||
            result.coupon.freeShipping !== coupon.freeShipping;
          if (changed) {
            setAppliedCoupon(result.coupon);
            setCoupon(result.coupon);
          }
          return;
        }

        // `reason` yalnızca sunucu kuponu gerçekten reddettiğinde gelir
        // (ör. "yalnızca ilk sipariş"). Ağ/oturum/limit hatasında kuponu
        // düşürmek sepeti sessizce pahalılaştırır; kuponu koruyup uyarırız.
        if (!result.reason) {
          setError(result.error);
          lastValidated.current = null;
          return;
        }

        clearAppliedCoupon();
        setCoupon(null);
        setError(null);
        setRemovedNotice(
          `Sepetiniz değişti ve kupon artık geçerli değil. Kupon kaldırıldı: ${result.error}`
        );
        lastValidated.current = null;
      });
    }, isInitialHydration ? 0 : 500);

    return () => {
      active = false;
      clearTimeout(timer);
    };
    // `coupon?.code` identifies the applied coupon; the signature captures the
    // cart totals. Re-running on the discount amount would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupon?.code, signature]);

  const apply = useCallback(async (rawCode: string): Promise<boolean> => {
    const code = normalizeCouponCode(rawCode);
    setRemovedNotice(null);

    if (!code) {
      setError('Kupon kodu girin');
      return false;
    }

    setError(null);
    setIsChecking(true);
    const result = await validateCouponCode(code, totalsRef.current);
    setIsChecking(false);

    if (!result.valid) {
      setError(result.error);
      return false;
    }

    // The amount was validated against the current cart, so the re-validation
    // effect does not need to run again for this signature.
    lastValidated.current = totalsSignature(totalsRef.current);
    setAppliedCoupon(result.coupon);
    setCoupon(result.coupon);
    return true;
  }, []);

  const remove = useCallback(() => {
    clearAppliedCoupon();
    setCoupon(null);
    setError(null);
    setRemovedNotice(null);
    lastValidated.current = null;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { coupon, isChecking, error, removedNotice, apply, remove, clearError };
}
