'use client';

/**
 * Coupon entry shared by the cart summary and the checkout summary.
 *
 * Display-only: every apply/re-validate goes through the server endpoint via
 * `useCoupon`. The component never computes a discount itself.
 */

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Ticket, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AppliedCoupon } from '@/lib/cart/coupon-store';

interface CouponInputProps {
  coupon: AppliedCoupon | null;
  isChecking?: boolean;
  error?: string | null;
  removedNotice?: string | null;
  onApply: (code: string) => Promise<boolean>;
  onRemove: () => void;
  disabled?: boolean;
  className?: string;
}

function discountLabel(coupon: AppliedCoupon): string {
  if (coupon.freeShipping) return 'Ücretsiz kargo';
  return `-${coupon.discountAmount.toFixed(2)} TL`;
}

export function CouponInput({
  coupon,
  isChecking = false,
  error,
  removedNotice,
  onApply,
  onRemove,
  disabled = false,
  className,
}: CouponInputProps) {
  const [code, setCode] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const applied = await onApply(code);
    if (applied) setCode('');
  };

  return (
    <div className={cn('space-y-2', className)}>
      {coupon ? (
        <div className="rounded-xl border-2 border-green-500/30 bg-green-500/[0.06] p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-sm font-semibold text-green-700 truncate">
                {coupon.code}
              </span>
              {isChecking && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-bold text-green-700">{discountLabel(coupon)}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemove}
                disabled={disabled}
                className="h-6 w-6 p-0 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                aria-label="Kuponu kaldır"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {coupon.description && (
            <p className="text-[11px] text-muted-foreground pl-6">{coupon.description}</p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <label
            htmlFor="coupon-code"
            className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"
          >
            <Ticket className="h-3.5 w-3.5" />
            Kupon kodunuz var mı?
          </label>
          <div className="flex gap-2">
            <Input
              id="coupon-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="KUPON KODU"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={40}
              disabled={disabled || isChecking}
              className="h-9 flex-1 rounded-xl border-2 border-border/60 bg-background/50 font-mono text-sm tracking-wide uppercase placeholder:font-sans placeholder:tracking-normal"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={disabled || isChecking || !code.trim()}
              className="h-9 rounded-xl px-4"
            >
              {isChecking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Uygula'}
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p className="flex items-start gap-1.5 text-[11px] text-destructive">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {removedNotice && !error && (
        <p className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 text-[11px] text-amber-700">
          {removedNotice}
        </p>
      )}
    </div>
  );
}
