'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Ticket,
  Tickets,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  adminCouponClientService,
  type AdminCoupon,
  type AdminCouponStatus,
} from '@/lib/services/admin-coupon-client-service';
import { CouponFormDialog } from './_components/coupon-form-dialog';
import { BulkGenerateDialog } from './_components/bulk-generate-dialog';
import { CouponsTable } from './_components/coupons-table';

type StatusFilter = 'all' | AdminCouponStatus | 'used';

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Tüm durumlar' },
  { value: 'active', label: 'Aktif' },
  { value: 'scheduled', label: 'Planlandı' },
  { value: 'exhausted', label: 'Tükendi' },
  { value: 'expired', label: 'Süresi geçti' },
  { value: 'inactive', label: 'Pasif' },
  { value: 'used', label: 'Kullanım gören' },
];

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<AdminCoupon | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const loadCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await adminCouponClientService.list({ limit: 500 });
      setCoupons(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kuponlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const stats = useMemo(() => {
    const count = (values: AdminCouponStatus[]) =>
      coupons.filter((coupon) => values.includes(coupon.status)).length;
    return {
      total: coupons.length,
      active: count(['active']),
      exhausted: count(['exhausted']),
      expired: count(['expired', 'inactive']),
    };
  }, [coupons]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return coupons.filter((coupon) => {
      if (status === 'used') {
        if (coupon.usage.redemptions <= 0) return false;
      } else if (status !== 'all' && coupon.status !== status) {
        return false;
      }

      if (!query) return true;

      return (
        coupon.code.toLowerCase().includes(query) ||
        (coupon.description ?? '').toLowerCase().includes(query) ||
        (coupon.batch_label ?? '').toLowerCase().includes(query) ||
        (coupon.owner_email ?? '').toLowerCase().includes(query)
      );
    });
  }, [coupons, search, status]);

  const handleCopy = (coupon: AdminCoupon) => {
    navigator.clipboard.writeText(coupon.code);
    toast.success('Kupon kodu kopyalandı');
  };

  const handleToggle = async (coupon: AdminCoupon) => {
    setBusyId(coupon.id);
    try {
      await adminCouponClientService.update(coupon.id, { isActive: !coupon.is_active });
      toast.success(coupon.is_active ? 'Kupon pasife alındı' : 'Kupon aktif edildi');
      await loadCoupons();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Durum güncellenemedi');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (coupon: AdminCoupon) => {
    const confirmed = confirm(
      coupon.is_personal && coupon.batch_id
        ? `"${coupon.code}" kodunu silmek istediğinize emin misiniz? Bu yalnızca tek kodu etkiler.`
        : `"${coupon.code}" kuponunu silmek istediğinize emin misiniz?`
    );
    if (!confirmed) return;

    setBusyId(coupon.id);
    try {
      const result = await adminCouponClientService.remove(coupon.id);
      toast.success(
        result.deleted
          ? 'Kupon silindi'
          : 'Kupon kullanıldığı için silinmedi, pasife alındı'
      );
      await loadCoupons();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kupon silinemedi');
    } finally {
      setBusyId(null);
    }
  };

  const openCreate = () => {
    setEditingCoupon(null);
    setFormOpen(true);
  };

  const openEdit = (coupon: AdminCoupon) => {
    setEditingCoupon(coupon);
    setFormOpen(true);
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold gradient-text flex items-center gap-3">
            <Ticket className="h-6 w-6 text-primary" /> Kuponlar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            İndirim kodlarını, kotalarını ve kullanım kurallarını yönetin
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="gap-1.5">
            <Tickets className="h-4 w-4" /> Toplu Üret
          </Button>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" /> Yeni Kupon
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Toplam', value: stats.total, icon: Ticket, color: 'text-primary' },
          { label: 'Aktif', value: stats.active, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Tükendi', value: stats.exhausted, icon: Clock, color: 'text-orange-500' },
          { label: 'Pasif / Süresi geçti', value: stats.expired, icon: XCircle, color: 'text-muted-foreground' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="flex items-center gap-3 p-3 lg:p-4">
              <div className="p-2 rounded-lg bg-primary/5">
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{label}</p>
                <p className="text-xl lg:text-2xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Kod, açıklama veya e-posta ara..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9 h-9 text-sm w-full"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as StatusFilter)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm sm:w-48"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="sm:ml-auto flex items-center">
          <Badge variant="secondary" className="text-[11px]">
            {filtered.length} kupon
          </Badge>
        </div>
      </div>

      <CouponsTable
        coupons={filtered}
        loading={loading}
        busyId={busyId}
        onEdit={openEdit}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onCopy={handleCopy}
      />

      <CouponFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        coupon={editingCoupon}
        onSaved={loadCoupons}
      />

      <BulkGenerateDialog open={bulkOpen} onOpenChange={setBulkOpen} onGenerated={loadCoupons} />
    </div>
  );
}
