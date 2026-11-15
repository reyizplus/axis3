'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  adminCouponClientService,
  type AdminCoupon,
} from '@/lib/services/admin-coupon-client-service';
import {
  CouponRulesFields,
  createEmptyRuleState,
  ruleStateFromCoupon,
  ruleStateToPayload,
  validateRuleState,
  type CouponRuleFormState,
} from './coupon-rules-fields';

interface CouponFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null creates a new code; a row switches the dialog to edit mode. */
  coupon: AdminCoupon | null;
  onSaved: () => void;
}

export function CouponFormDialog({ open, onOpenChange, coupon, onSaved }: CouponFormDialogProps) {
  const [rules, setRules] = useState<CouponRuleFormState>(createEmptyRuleState());
  const [code, setCode] = useState('');
  const [isPersonal, setIsPersonal] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRules(coupon ? ruleStateFromCoupon(coupon) : createEmptyRuleState());
    setCode('');
    setIsPersonal(coupon?.is_personal ?? false);
    setOwnerEmail(coupon?.owner_email ?? '');
    setError(null);
  }, [open, coupon]);

  const editing = !!coupon;

  async function handleSave() {
    const validation = validateRuleState(rules);
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = ruleStateToPayload(rules);

      if (editing && coupon) {
        await adminCouponClientService.update(coupon.id, payload);
        toast.success('Kupon güncellendi');
      } else {
        const created = await adminCouponClientService.create({
          ...payload,
          code: code.trim() || null,
          isPersonal,
          ownerEmail: isPersonal ? ownerEmail.trim() || null : null,
        });
        toast.success(`Kupon oluşturuldu: ${created.code}`);
      }

      onSaved();
      onOpenChange(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'İşlem başarısız oldu');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Kuponu Düzenle' : 'Yeni Kupon'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Kupon kodu</Label>
              {editing ? (
                <div className="flex h-9 items-center rounded-xl border-2 border-border/60 bg-muted/30 px-3 font-mono text-sm">
                  {coupon?.code}
                </div>
              ) : (
                <Input
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="Boş bırakılırsa üretilir"
                  maxLength={40}
                  autoComplete="off"
                  spellCheck={false}
                  className="h-9 font-mono text-sm uppercase"
                />
              )}
              <p className="text-[11px] text-muted-foreground">
                Harf, rakam, tire ve alt çizgi; 6-40 karakter.
              </p>
            </div>

            {!editing && (
              <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPersonal}
                    onChange={(event) => setIsPersonal(event.target.checked)}
                    className="rounded border-input"
                  />
                  <span className="text-sm font-medium">Kişiye özel kod</span>
                </label>
                {isPersonal && (
                  <Input
                    type="email"
                    value={ownerEmail}
                    onChange={(event) => setOwnerEmail(event.target.value)}
                    placeholder="kullanici@ornek.com (isteğe bağlı)"
                    className="h-9 text-sm"
                  />
                )}
                <p className="text-[11px] text-muted-foreground">
                  E-posta girilirse kod yalnızca o kullanıcıda geçerli olur.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-border/50" />

          <CouponRulesFields value={rules} onChange={setRules} disabled={saving} />

          {error && (
            <p className="flex items-start gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            İptal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor...
              </>
            ) : editing ? (
              'Güncelle'
            ) : (
              'Oluştur'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
