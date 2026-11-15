'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Copy,
  Pencil,
  Power,
  Trash2,
  Ticket,
  Users,
} from 'lucide-react';
import type {
  AdminCoupon,
  AdminCouponStatus,
  CouponDiscountType,
} from '@/lib/services/admin-coupon-client-service';

interface CouponsTableProps {
  coupons: AdminCoupon[];
  loading: boolean;
  busyId: string | null;
  onEdit: (coupon: AdminCoupon) => void;
  onToggle: (coupon: AdminCoupon) => void;
  onDelete: (coupon: AdminCoupon) => void;
  onCopy: (coupon: AdminCoupon) => void;
}

const STATUS_META: Record<AdminCouponStatus, { label: string; className: string }> = {
  active: { label: 'Aktif', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  scheduled: { label: 'Planlandı', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  exhausted: { label: 'Tükendi', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  expired: { label: 'Süresi geçti', className: 'bg-muted text-muted-foreground border-border' },
  inactive: { label: 'Pasif', className: 'bg-muted text-muted-foreground border-border' },
};

const DISCOUNT_LABELS: Record<CouponDiscountType, string> = {
  percentage: 'Yüzde',
  fixed_amount: 'Sabit tutar',
  free_shipping: 'Ücretsiz kargo',
};

const APPLIES_LABELS: Record<string, string> = {
  all: 'Tümü',
  service: '3D baskı',
  store: 'Mağaza',
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function discountSummary(coupon: AdminCoupon): string {
  if (coupon.discount_type === 'percentage') {
    const cap = coupon.max_discount_amount
      ? ` (maks. ${coupon.max_discount_amount.toFixed(2)} TL)`
      : '';
    return `%${coupon.discount_value}${cap}`;
  }
  if (coupon.discount_type === 'fixed_amount') {
    return `${coupon.discount_value.toFixed(2)} TL`;
  }
  return 'Kargo bedava';
}

function quotaSummary(coupon: AdminCoupon): string {
  if (coupon.quota_limit == null) return 'Sınırsız';
  const used =
    coupon.quota_basis === 'redemptions' ? coupon.usage.redemptions : coupon.usage.users;
  const unit = coupon.quota_basis === 'redemptions' ? 'kullanım' : 'kişi';
  return `${used} / ${coupon.quota_limit} ${unit}`;
}

function perUserSummary(coupon: AdminCoupon): string {
  if (coupon.per_user_mode === 'unlimited') return 'Sınırsız';
  if (coupon.per_user_mode === 'limited') return `${coupon.per_user_limit ?? 1} kez`;
  return 'Tek kullanım';
}

function validitySummary(coupon: AdminCoupon): string {
  const start = formatDate(coupon.starts_at);
  const end = formatDate(coupon.ends_at);
  if (start && end) return `${start} - ${end}`;
  if (end) return `${end}’e kadar`;
  if (start) return `${start}’dan itibaren`;
  return 'Süresiz';
}

export function CouponsTable({
  coupons,
  loading,
  busyId,
  onEdit,
  onToggle,
  onDelete,
  onCopy,
}: CouponsTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (coupons.length === 0) {
    return (
      <Card className="border-border/50">
        <div className="flex flex-col items-center justify-center py-14">
          <Ticket className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-base font-medium mb-1">Kupon bulunamadı</p>
          <p className="text-sm text-muted-foreground">
            Filtreleri değiştirin veya yeni bir kupon oluşturun.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <Card className="border-border/50 hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Kod</th>
                <th className="px-4 py-3 font-medium">Tür</th>
                <th className="px-4 py-3 font-medium">Kapsam</th>
                <th className="px-4 py-3 font-medium">Kota</th>
                <th className="px-4 py-3 font-medium">Kullanıcı kuralı</th>
                <th className="px-4 py-3 font-medium">Geçerlilik</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => {
                const meta = STATUS_META[coupon.status];
                const busy = busyId === coupon.id;
                return (
                  <tr
                    key={coupon.id}
                    className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono font-semibold">{coupon.code}</span>
                        <div className="flex flex-wrap gap-1">
                          {coupon.is_personal && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 gap-1">
                              <Users className="h-2.5 w-2.5" />
                              {coupon.batch_id ? 'Toplu kod' : 'Kişiye özel'}
                            </Badge>
                          )}
                          {coupon.batch_label && (
                            <Badge variant="secondary" className="text-[9px] h-4 px-1">
                              {coupon.batch_label}
                            </Badge>
                          )}
                        </div>
                        {coupon.owner_email && (
                          <span className="text-[11px] text-muted-foreground">
                            {coupon.owner_email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          {DISCOUNT_LABELS[coupon.discount_type]}
                        </span>
                        <span className="font-medium">{discountSummary(coupon)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[10px]">
                        {APPLIES_LABELS[coupon.applies_to] ?? coupon.applies_to}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{quotaSummary(coupon)}</td>
                    <td className="px-4 py-3">{perUserSummary(coupon)}</td>
                    <td className="px-4 py-3 text-xs">{validitySummary(coupon)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-[10px] ${meta.className}`}>
                        {meta.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => onCopy(coupon)}
                          title="Kodu kopyala"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => onEdit(coupon)}
                          disabled={busy}
                          title="Düzenle"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => onToggle(coupon)}
                          disabled={busy}
                          title={coupon.is_active ? 'Pasife al' : 'Aktif et'}
                        >
                          <Power
                            className={`h-3.5 w-3.5 ${
                              coupon.is_active ? 'text-emerald-600' : 'text-muted-foreground'
                            }`}
                          />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => onDelete(coupon)}
                          disabled={busy}
                          title="Sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {coupons.map((coupon) => {
          const meta = STATUS_META[coupon.status];
          const busy = busyId === coupon.id;
          return (
            <Card key={coupon.id} className="border-border/50 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono font-semibold truncate">{coupon.code}</p>
                  {coupon.owner_email && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {coupon.owner_email}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className={`text-[10px] shrink-0 ${meta.className}`}>
                  {meta.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">İndirim</p>
                  <p className="font-medium">{discountSummary(coupon)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kapsam</p>
                  <p className="font-medium">
                    {APPLIES_LABELS[coupon.applies_to] ?? coupon.applies_to}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kota</p>
                  <p className="font-medium">{quotaSummary(coupon)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kullanıcı</p>
                  <p className="font-medium">{perUserSummary(coupon)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Geçerlilik</p>
                  <p className="font-medium">{validitySummary(coupon)}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1 border-t border-border/40 pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => onCopy(coupon)}
                  title="Kodu kopyala"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => onEdit(coupon)}
                  disabled={busy}
                  title="Düzenle"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => onToggle(coupon)}
                  disabled={busy}
                  title={coupon.is_active ? 'Pasife al' : 'Aktif et'}
                >
                  <Power
                    className={`h-4 w-4 ${
                      coupon.is_active ? 'text-emerald-600' : 'text-muted-foreground'
                    }`}
                  />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive"
                  onClick={() => onDelete(coupon)}
                  disabled={busy}
                  title="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

export { STATUS_META, discountSummary, quotaSummary, perUserSummary, validitySummary };
