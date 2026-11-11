'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, ExternalLink, Truck, RefreshCw, Search, Globe, Clock, User, DollarSign, Ban, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { getCargoCompanies, getTrackingUrl } from '@/lib/services/cargo-service';

interface CargoOrder {
  id: string; order_number: string; cargo_company: string | null;
  cargo_status: string | null; cargo_price: number | null; tracking_number: string | null;
  share_tracking_link: boolean | null; shipped_at: string | null; delivered_at: string | null;
  estimated_delivery: string | null; total_amount: number;
  user: { id: string; email: string; full_name: string } | null;
}

const CARGO_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'İşlem Bekliyor', className: 'bg-yellow-500/10 text-yellow-600' },
  accepted: { label: 'Kargoya Verildi', className: 'bg-blue-500/10 text-blue-600' },
  in_transit: { label: 'Taşımada', className: 'bg-indigo-500/10 text-indigo-600' },
  out_for_delivery: { label: 'Dağıtımda', className: 'bg-purple-500/10 text-purple-600' },
  delivered: { label: 'Teslim Edildi', className: 'bg-emerald-500/10 text-emerald-600' },
  failed: { label: 'Teslimat Başarısız', className: 'bg-red-500/10 text-red-600' },
};

const CARGO_STATUS_OPTIONS = Object.entries(CARGO_STATUS_CONFIG).map(([value, c]) => ({ value, label: c.label }));

function fmtDT(iso: string | null) {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

const STAT_ITEMS = [
  { key: 'total', label: 'Toplam Kargo', color: 'text-primary' },
  { key: 'inTransit', label: 'Taşımada', color: 'text-indigo-500' },
  { key: 'delivered', label: 'Teslim Edildi', color: 'text-emerald-500' },
  { key: 'failed', label: 'Başarısız', color: 'text-red-500' },
] as const;

export default function AdminCargoPage() {
  const [tab, setTab] = useState('companies');
  const [orders, setOrders] = useState<CargoOrder[]>([]);
  const [companies] = useState(() => getCargoCompanies());
  const [companyStats, setCompanyStats] = useState<Record<string, { total: number; active: number }>>({});
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ company: '', tracking: '', status: 'pending', price: '', deliveryDate: '' });
  const [saving, setSaving] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCompany !== 'all') params.set('cargo_company', filterCompany);
      if (filterStatus !== 'all') params.set('cargo_status', filterStatus);
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/cargo?${params}`);
      if (res.ok) setOrders((await res.json()).data || []);
    } catch {} finally { setLoading(false); }
  }, [search, filterCompany, filterStatus]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/cargo/stats');
      if (res.ok) setCompanyStats((await res.json()).data || {});
    } catch {} finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { if (tab === 'companies') fetchStats(); }, [tab, fetchStats]);

  useEffect(() => { if (tab === 'orders') fetchOrders(); }, [tab, fetchOrders, filterCompany, filterStatus]);

  const startEdit = (order: CargoOrder) => {
    setEditing(order.id);
    setEditForm({
      company: order.cargo_company || '',
      tracking: order.tracking_number || '',
      status: order.cargo_status || 'pending',
      price: order.cargo_price !== null ? String(order.cargo_price) : '',
      deliveryDate: order.estimated_delivery || '',
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/cargo', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: editing,
          cargo_company: editForm.company || null,
          tracking_number: editForm.tracking || null,
          cargo_status: editForm.status,
          cargo_price: editForm.price ? parseFloat(editForm.price) : null,
          estimated_delivery: editForm.deliveryDate || null,
        }),
      });
      if (res.ok) { setEditing(null); fetchOrders(); }
    } catch {} finally { setSaving(false); }
  };

  const getStats = () => {
    const total = orders.length;
    const inTransit = orders.filter(o => o.cargo_status === 'in_transit' || o.cargo_status === 'out_for_delivery').length;
    const delivered = orders.filter(o => o.cargo_status === 'delivered').length;
    const failed = orders.filter(o => o.cargo_status === 'failed').length;
    return { total, inTransit, delivered, failed };
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold gradient-text flex items-center gap-3">
          <Truck className="h-6 w-6 text-primary" /> Kargo Yönetimi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Kargo firmaları ve sipariş takibi</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList className="bg-muted/50 p-0.5">
          <TabsTrigger value="companies" className="rounded-md gap-1.5"><Package className="h-4 w-4" /> Kargo Firmaları</TabsTrigger>
          <TabsTrigger value="orders" className="rounded-md gap-1.5">
            <Truck className="h-4 w-4" /> Kargodaki Siparişler
            {orders.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px]">{orders.length}</Badge>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'companies' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map(company => {
            const stats = companyStats[company.id];
            const activeCount = stats?.active ?? 0;
            return (
              <Card key={company.id} className="border-border/50 hover:border-primary/30 transition-all overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-32 flex items-center justify-center bg-muted/20 rounded-md p-2">
                      <img src={company.logoUrl} alt={company.name} className="max-h-full max-w-full object-contain" />
                    </div>
                    <Package className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                  <CardTitle className="text-base mt-1">{company.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {company.phone && <p className="text-muted-foreground text-xs">Telefon: {company.phone}</p>}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Takip URL</p>
                    <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono block truncate">{company.trackingUrlPattern.replace('{tracking_no}', 'XXX...')}</code>
                  </div>
                  <a href={company.trackingUrlPattern.replace('{tracking_no}', '')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary text-xs hover:underline">
                    <ExternalLink className="h-3 w-3" /> Kargo sitesine git
                  </a>
                  <button
                    onClick={() => { setTab('orders'); setFilterCompany(company.id); }}
                    className="w-full flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground hover:text-primary transition-colors group"
                  >
                    <span>Aktif Kargo</span>
                    <span className={`font-semibold text-sm tabular-nums ${statsLoading ? 'opacity-50' : ''} ${activeCount > 0 ? 'text-primary' : ''}`}>
                      {statsLoading ? '...' : activeCount}
                    </span>
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(() => { const s = getStats(); return STAT_ITEMS.map(({ key, label, color }) => (
              <Card key={key} className="border-border/50">
                <CardContent className="flex items-center gap-3 p-3 lg:p-4">
                  <div className={`p-2 rounded-lg bg-primary/5 ${color}/10`}>
                    {key === 'total' ? <Package className={`h-5 w-5 ${color}`} /> :
                     key === 'inTransit' ? <Truck className={`h-5 w-5 ${color}`} /> :
                     key === 'delivered' ? <Globe className={`h-5 w-5 ${color}`} /> :
                     <Ban className={`h-5 w-5 ${color}`} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{label}</p>
                    <p className="text-xl lg:text-2xl font-bold">{s[key as keyof typeof s]}</p>
                  </div>
                </CardContent>
              </Card>
            )); })()}
          </div>

          <Card className="border-border/50 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Truck className="h-4 w-4 text-primary" /> Kargodaki Siparişler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-xs w-full">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Sipariş no, takip no..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchOrders()} className="pl-8 h-8 text-sm w-full" />
                </div>
                <Select value={filterCompany} onValueChange={setFilterCompany}>
                  <SelectTrigger className="w-full sm:w-[150px] h-8 text-sm"><SelectValue placeholder="Firma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Firmalar</SelectItem>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-[150px] h-8 text-sm"><SelectValue placeholder="Durum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Durumlar</SelectItem>
                    {CARGO_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading} className="h-8 gap-1.5 shrink-0">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Yenile
                </Button>
              </div>

              {loading ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />)}</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">Kargoda sipariş bulunamadı</div>
              ) : (
                <div className="space-y-2">
                  {orders.map(order => {
                    const sc = CARGO_STATUS_CONFIG[order.cargo_status || 'pending'] || CARGO_STATUS_CONFIG.pending;
                    const company = order.cargo_company ? companies.find(c => c.id === order.cargo_company) : null;
                    const isEditing = editing === order.id;

                    return (
                      <Card key={order.id} className="border-border/50 overflow-hidden">
                        <div className="p-3 lg:p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/5 shrink-0"><Package className="h-4 w-4 text-primary/70" /></div>
                              <div className="min-w-0">
                                <Link href={`/admin/orders/${order.id}`} className="text-sm font-semibold hover:text-primary transition-colors">{order.order_number}</Link>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                  {order.user && <Link href={`/admin/users/${order.user.id}`} className="flex items-center gap-1 hover:text-primary"><User className="h-3 w-3" />{order.user.full_name}</Link>}
                                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDT(order.shipped_at)}</span>
                                  <span className="font-medium">₺{order.total_amount.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                            <Badge className={`${sc.className} border-0 text-[10px] shrink-0`}>{sc.label}</Badge>
                          </div>

                          {isEditing ? (
                            <div className="space-y-3 border-t mt-3 pt-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Kargo Firması</Label>
                                  <Select value={editForm.company} onValueChange={v => setEditForm(f => ({ ...f, company: v }))}>
                                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Takip Numarası</Label>
                                  <Input value={editForm.tracking} onChange={e => setEditForm(f => ({ ...f, tracking: e.target.value }))} className="h-8 text-sm font-mono" placeholder="Takip no..." />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Kargo Durumu</Label>
                                  <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {CARGO_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Kargo Ücreti (₺)</Label>
                                    <Input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} className="h-8 text-sm" placeholder="0.00" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Tahmini Teslimat</Label>
                                    <Input type="date" value={editForm.deliveryDate} onChange={e => setEditForm(f => ({ ...f, deliveryDate: e.target.value }))} className="h-8 text-sm" />
                                  </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" onClick={saveEdit} disabled={saving} className="h-8">{saving ? 'Kaydediliyor...' : 'Kaydet'}</Button>
                                <Button variant="ghost" size="sm" onClick={() => setEditing(null)} className="h-8">İptal</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground border-t mt-3 pt-3">
                              {company && (
                                <div className="flex items-center gap-1.5">
                                  <img src={company.logoUrl} alt={company.name} className="h-4 w-auto" />
                                  <span>{company.name}</span>
                                </div>
                              )}
                              {order.tracking_number && <span className="font-mono">Takip: {order.tracking_number}</span>}
                              {order.cargo_price !== null && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />₺{order.cargo_price.toFixed(2)}</span>}
                              <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />Teslimat: {order.estimated_delivery ? new Date(order.estimated_delivery).toLocaleDateString('tr-TR') : <span className="italic">Belirtilmemiş</span>}</span>
                              <div className="flex-1" />
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => startEdit(order)}>Düzenle</Button>
                              {company && order.tracking_number && (
                                <a href={getTrackingUrl(company.id, order.tracking_number)} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1"><ExternalLink className="h-3 w-3" />Takip Et</Button>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
