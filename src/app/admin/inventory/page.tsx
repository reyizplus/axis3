'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Search, Loader2, AlertCircle, Plus, Edit2, Trash2, X, Save, Boxes, GitFork,
  Package, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { inventoryService, type InventoryItem, type NozzleSize } from '@/lib/services/inventory-service';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<string, string> = {
  filament: 'Filament',
  nozzle: 'Nozul',
  resin: 'Reçine',
  other: 'Diğer',
};

const TYPE_COLORS: Record<string, string> = {
  filament: 'bg-blue-500/10 text-blue-600',
  nozzle: 'bg-purple-500/10 text-purple-600',
  resin: 'bg-amber-500/10 text-amber-600',
  other: 'bg-gray-500/10 text-gray-600',
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));

const STAT_CARDS = [
  { key: 'total', label: 'Toplam', icon: Package, color: 'text-primary' },
  { key: 'inStock', label: 'Stokta', icon: CheckCircle2, color: 'text-emerald-500' },
  { key: 'lowStock', label: 'Düşük Stok', icon: AlertTriangle, color: 'text-orange-500' },
  { key: 'outOfStock', label: 'Tükenen', icon: AlertCircle, color: 'text-red-500' },
] as const;

export default function AdminInventoryPage() {
  const [tab, setTab] = useState('inventory');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = items;
    if (typeFilter !== 'all') result = result.filter(i => i.type === typeFilter);
    if (search) result = result.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [items, search, typeFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getInventoryItems();
      setItems(data);
    } catch {
      toast.error('Envanter yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEdit = useCallback((item: InventoryItem) => { setEditItem(item); setDialogOpen(true); }, []);
  const handleAdd = useCallback(() => { setEditItem(null); setDialogOpen(true); }, []);
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try {
      await inventoryService.deleteInventoryItem(id);
      toast.success('Silindi');
      load();
    } catch { toast.error('Silme başarısız'); }
  }, [load]);

  const stats = useMemo(() => {
    const active = items.filter(i => i.is_active);
    return {
      total: items.length,
      inStock: active.filter(i => i.quantity_on_hand > i.minimum_stock).length,
      lowStock: active.filter(i => i.quantity_on_hand > 0 && i.quantity_on_hand <= i.minimum_stock).length,
      outOfStock: active.filter(i => i.quantity_on_hand === 0).length,
    };
  }, [items]);

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold gradient-text flex items-center gap-3">
          <Boxes className="h-6 w-6 text-primary" /> Envanter Yönetimi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Tüm stok kalemlerini ve nozul boyutlarını yönetin</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList className="bg-muted/50 p-0.5">
          <TabsTrigger value="inventory" className="rounded-md gap-1.5"><Boxes className="h-4 w-4" /> Stok Kalemleri</TabsTrigger>
          <TabsTrigger value="nozzles" className="rounded-md gap-1.5"><GitFork className="h-4 w-4" /> Nozul Boyutları</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'inventory' ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
              <Card key={key} className="border-border/50">
                <CardContent className="flex items-center gap-3 p-3 lg:p-4">
                  <div className="p-2 rounded-lg bg-primary/5"><Icon className={`h-5 w-5 ${color}`} /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{label}</p>
                    <p className="text-xl lg:text-2xl font-bold">{stats[key as keyof typeof stats]}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border/50 mb-4">
            <CardContent className="p-3 lg:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 max-w-xs w-full">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Envanterde ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm w-full" />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[150px] h-8 text-sm"><SelectValue placeholder="Tip" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={handleAdd} size="sm" className="h-8 gap-1.5 shrink-0">
                  <Plus className="h-3.5 w-3.5" /> Yeni Ekle
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center py-12"><Package className="h-12 w-12 text-muted-foreground/40 mb-4" /><p className="text-sm text-muted-foreground">Envanter kalemi bulunamadı</p></CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(item => (
                <Card key={item.id} className="border-border/50 overflow-hidden">
                  <div className="p-3 lg:p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/5 shrink-0"><Boxes className="h-4 w-4 text-primary/70" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{item.name}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <Badge className={`${TYPE_COLORS[item.type]} border-0 text-[10px]`}>{TYPE_LABELS[item.type] || item.type}</Badge>
                              {item.color && <span className="text-[10px] text-muted-foreground">{item.color}</span>}
                              {item.material && <span className="text-[10px] text-muted-foreground">{item.material.name}</span>}
                              {item.sku && <span className="text-[10px] text-muted-foreground font-mono">SKU: {item.sku}</span>}
                              {item.allow_preorder && (
                                <Badge variant="outline" className="text-[10px] bg-amber-500/5 border-amber-500/20 gap-1">
                                  <AlertTriangle className="h-3 w-3" />ÖS{item.preorder_discount_percent ? ` %${item.preorder_discount_percent}` : ''}
                                </Badge>
                              )}
                              {!item.is_active && <Badge variant="secondary" className="text-[10px]">Pasif</Badge>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={cn(
                              "text-lg font-bold",
                              item.quantity_on_hand === 0 ? "text-red-500" :
                              item.quantity_on_hand <= item.minimum_stock ? "text-orange-500" : "text-emerald-500"
                            )}>
                              {item.quantity_on_hand}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.unit_cost && <span className="text-xs text-muted-foreground">₺{item.unit_cost.toFixed(2)}</span>}
                            {item.minimum_stock > 0 && <span className="text-xs text-muted-foreground">Min: {item.minimum_stock}</span>}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <InventoryDialog
            item={editItem}
            open={dialogOpen}
            onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditItem(null); }}
            onSaved={load}
          />
        </>
      ) : (
        <NozzleSizesSection />
      )}
    </div>
  );
}

const EmptyArray: unknown[] = [];

function InventoryDialog({ item, open, onOpenChange, onSaved }: {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [type, setType] = useState<"filament" | "nozzle" | "resin" | "other">(item?.type as any || 'filament');
  const [sku, setSku] = useState(item?.sku || '');
  const [qty, setQty] = useState(item?.quantity_on_hand ?? 0);
  const [minStock, setMinStock] = useState(item?.minimum_stock ?? 5);
  const [unitCost, setUnitCost] = useState(item?.unit_cost?.toString() || '');
  const [materialId, setMaterialId] = useState(item?.material_id || '');
  const [color, setColor] = useState(item?.color || '');
  const [hexColor, setHexColor] = useState(item?.hex_color || '');
  const [spoolWeight, setSpoolWeight] = useState(item?.spool_weight_grams?.toString() || '');
  const [nozzleSizeId, setNozzleSizeId] = useState(item?.nozzle_size_id || '');
  const [allowPreorder, setAllowPreorder] = useState(item?.allow_preorder ?? true);
  const [preorderDiscount, setPreorderDiscount] = useState(item?.preorder_discount_percent?.toString() || '');
  const [restockDays, setRestockDays] = useState(item?.estimated_restock_days ?? 14);
  const [active, setActive] = useState(item?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const [materials, setMaterials] = useState<{ id: string; name: string; colors: string[]; technology: string }[]>(EmptyArray as any[]);
  const [nozzleSizes, setNozzleSizes] = useState<{ id: string; size_mm: number; display_name: string; is_active: boolean }[]>(EmptyArray as any[]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [nameTouched, setNameTouched] = useState(!!item);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    setSaving(false);
    setName(item?.name || '');
    setType(item?.type || 'filament');
    setSku(item?.sku || '');
    setQty(item?.quantity_on_hand ?? 0);
    setMinStock(item?.minimum_stock ?? 5);
    setUnitCost(item?.unit_cost?.toString() || '');
    setMaterialId(item?.material_id || '');
    setColor(item?.color || '');
    setHexColor(item?.hex_color || '');
    setSpoolWeight(item?.spool_weight_grams?.toString() || '');
    setNozzleSizeId(item?.nozzle_size_id || '');
    setAllowPreorder(item?.allow_preorder ?? true);
    setPreorderDiscount(item?.preorder_discount_percent?.toString() || '');
    setRestockDays(item?.estimated_restock_days ?? 14);
    setActive(item?.is_active ?? true);
    setNameTouched(!!item);
  }, [item, open]);

  useEffect(() => {
    if (!open) return;
    const loadRefs = async () => {
      const supabase = createClient();
      const { data: mats } = await (supabase.from('materials') as any).select('id, name, colors, technology').eq('is_active', true).order('name');
      const parsed = (mats || []).map((m: any) => ({
        ...m,
        colors: typeof m.colors === 'string' ? (() => { try { return JSON.parse(m.colors); } catch { return []; } })() : (Array.isArray(m.colors) ? m.colors : []),
      }));
      if (mountedRef.current) setMaterials(parsed);
      const nozzles = await inventoryService.getAllNozzleSizes();
      if (mountedRef.current) setNozzleSizes(nozzles);
    };
    loadRefs();
  }, [open]);

  const computedName = useMemo(() => {
    if (nameTouched) return null;
    const mat = materials.find(m => m.id === materialId);
    const matName = mat?.name || '';
    if (type === 'filament') {
      const parts = [matName];
      if (color) parts.push(color);
      if (spoolWeight) parts.push(`${spoolWeight}g`);
      return parts.filter(Boolean).join(' ') || null;
    }
    if (type === 'resin') {
      const parts = [matName];
      if (color) parts.push(color);
      return parts.filter(Boolean).join(' ') || null;
    }
    if (type === 'nozzle' && nozzleSizeId) {
      const n = nozzleSizes.find(nz => nz.id === nozzleSizeId);
      if (n) return `${n.size_mm.toFixed(2)}mm ${n.display_name}`;
    }
    return null;
  }, [type, materialId, color, spoolWeight, nozzleSizeId, materials, nozzleSizes, nameTouched]);

  useEffect(() => {
    if (computedName && computedName !== name) setName(computedName);
  }, [computedName]);

  useEffect(() => {
    const mat = materials.find(m => m.id === materialId);
    if (mat && mat.colors.length > 0) {
      setAvailableColors(mat.colors);
      if (!mat.colors.includes(color)) { setColor(''); setHexColor(''); }
    } else {
      setAvailableColors([]);
    }
  }, [materialId, materials]);

  const allColors = useMemo(() => [...new Set([
    ...availableColors,
    'Beyaz', 'Siyah', 'Kırmızı', 'Mavi', 'Yeşil', 'Sarı', 'Turuncu', 'Mor', 'Gri', 'Şeffaf', 'Doğal',
  ])], [availableColors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        name, type, sku: sku || null,
        quantity_on_hand: qty, minimum_stock: minStock,
        unit_cost: unitCost ? parseFloat(unitCost) : null,
        material_id: materialId || null,
        color: color || null, hex_color: hexColor || null,
        spool_weight_grams: spoolWeight ? parseFloat(spoolWeight) : null,
        nozzle_size_id: nozzleSizeId || null,
        allow_preorder: allowPreorder,
        preorder_discount_percent: preorderDiscount ? parseFloat(preorderDiscount) : null,
        estimated_restock_days: restockDays,
        is_active: active,
      };
      if (item) {
        await inventoryService.updateInventoryItem(item.id, payload);
        toast.success('Güncellendi');
      } else {
        await inventoryService.createInventoryItem(payload);
        toast.success('Eklendi');
      }
      setSaving(false);
      onSaved();
      onOpenChange(false);
    } catch {
      setSaving(false);
      toast.error('Kaydetme başarısız');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? 'Envanter Düzenle' : 'Yeni Envanter'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Envanter Tipi</Label>
            <Select value={type} onValueChange={v => { setType(v as "filament" | "nozzle" | "resin" | "other"); setNameTouched(false); }}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ad *</Label>
            <Input value={name} onChange={e => { setName(e.target.value); setNameTouched(true); }} required placeholder="PLA Kırmızı 1kg" className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">SKU</Label>
              <Input value={sku} onChange={e => setSku(e.target.value)} placeholder="PLA-RED-1KG" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Birim Maliyet (TL)</Label>
              <Input type="number" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Stok Adedi *</Label>
              <Input type="number" min="0" value={qty} onChange={e => setQty(parseInt(e.target.value) || 0)} required className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Minimum Stok</Label>
              <Input type="number" min="0" value={minStock} onChange={e => setMinStock(parseInt(e.target.value) || 0)} className="h-9 text-sm" />
            </div>
          </div>

          {type !== 'nozzle' && type !== 'other' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Malzeme</Label>
              <Select value={materialId} onValueChange={setMaterialId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Malzeme seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Malzeme seçin</SelectItem>
                  {materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name} ({m.technology})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === 'nozzle' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Nozul Boyutu</Label>
              <Select value={nozzleSizeId} onValueChange={setNozzleSizeId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Nozul seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Nozul seçin</SelectItem>
                  {nozzleSizes.map(n => <SelectItem key={n.id} value={n.id}>{n.size_mm.toFixed(2)}mm - {n.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {(type === 'filament' || type === 'resin') && (
            <div className="space-y-1.5">
              <Label className="text-xs">Renk</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Renk seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Renk seçin</SelectItem>
                  {allColors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {(type === 'filament' || type === 'resin') && color && (
            <div className="space-y-1.5">
              <Label className="text-xs">Renk Kodu (Hex)</Label>
              <Input value={hexColor} onChange={e => setHexColor(e.target.value)} placeholder="#FF0000" className="h-9 text-sm" />
            </div>
          )}

          {type === 'filament' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Makara Ağırlığı (g)</Label>
              <Input type="number" min="0" step="100" value={spoolWeight} onChange={e => setSpoolWeight(e.target.value)} placeholder="1000" className="h-9 text-sm" />
            </div>
          )}

          <Separator />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="rounded" />
              Aktif
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={allowPreorder} onChange={e => setAllowPreorder(e.target.checked)} className="rounded" />
              Ön Siparişe İzin Ver
            </label>
          </div>

          {allowPreorder && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Ön Sipariş İskonto (%)</Label>
                <Input type="number" min="0" max="100" value={preorderDiscount} onChange={e => setPreorderDiscount(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tahmini Stok Günü</Label>
                <Input type="number" min="1" value={restockDays} onChange={e => setRestockDays(parseInt(e.target.value) || 14)} className="h-9 text-sm" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} className="h-9">İptal</Button>
            <Button type="submit" disabled={saving} className="h-9">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Kaydet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NozzleSizesSection() {
  const [nozzles, setNozzles] = useState<NozzleSize[]>(EmptyArray as NozzleSize[]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<NozzleSize | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getAllNozzleSizes();
      setNozzles(data);
    } catch {
      toast.error('Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEdit = useCallback((n: NozzleSize) => { setEditItem(n); setDialogOpen(true); }, []);
  const handleAdd = useCallback(() => { setEditItem(null); setDialogOpen(true); }, []);
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try {
      await inventoryService.deleteNozzleSize(id);
      toast.success('Silindi');
      load();
    } catch { toast.error('Silme başarısız'); }
  }, [load]);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <GitFork className="h-5 w-5 text-primary" /> Nozul Boyutları
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Yazıcı nozul çaplarını yönetin</p>
        </div>
        <Button onClick={handleAdd} size="sm" className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Yeni Nozul
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />)}</div>
      ) : nozzles.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center py-12"><GitFork className="h-12 w-12 text-muted-foreground/40 mb-4" /><p className="text-sm text-muted-foreground">Nozul bulunamadı</p></CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {nozzles.map(n => (
            <Card key={n.id} className="border-border/50 overflow-hidden">
              <div className="p-3 lg:p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5 shrink-0">
                    <span className="text-sm font-bold text-primary">{n.size_mm.toFixed(2)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{n.display_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px]">{n.compatible_technology}</Badge>
                      {!n.is_active && <Badge variant="outline" className="text-[10px]">Pasif</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(n)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(n.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NozzleDialog
        item={editItem}
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditItem(null); }}
        onSaved={load}
      />
    </>
  );
}

function NozzleDialog({ item, open, onOpenChange, onSaved }: {
  item: NozzleSize | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [sizeMm, setSizeMm] = useState(item?.size_mm?.toString() || '');
  const [displayName, setDisplayName] = useState(item?.display_name || '');
  const [tech, setTech] = useState(item?.compatible_technology || 'FDM');
  const [sortOrder, setSortOrder] = useState(item?.sort_order ?? 0);
  const [active, setActive] = useState(item?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSaving(false);
    setSizeMm(item?.size_mm?.toString() || '');
    setDisplayName(item?.display_name || '');
    setTech(item?.compatible_technology || 'FDM');
    setSortOrder(item?.sort_order ?? 0);
    setActive(item?.is_active ?? true);
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        size_mm: parseFloat(sizeMm),
        display_name: displayName,
        compatible_technology: tech,
        sort_order: sortOrder,
        is_active: active,
      };
      if (item) {
        await inventoryService.updateNozzleSize(item.id, payload);
        toast.success('Güncellendi');
      } else {
        await inventoryService.createNozzleSize(payload);
        toast.success('Eklendi');
      }
      setSaving(false);
      onSaved();
      onOpenChange(false);
    } catch {
      setSaving(false);
      toast.error('Kaydetme başarısız');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{item ? 'Nozul Düzenle' : 'Yeni Nozul'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Çap (mm) *</Label>
              <Input type="number" step="0.01" min="0.1" max="2.0" value={sizeMm} onChange={e => setSizeMm(e.target.value)} required placeholder="0.40" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sıralama</Label>
              <Input type="number" value={sortOrder} onChange={e => setSortOrder(parseInt(e.target.value) || 0)} className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Görünen Ad *</Label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} required placeholder="0.4mm Standart Nozul" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Teknoloji</Label>
            <Select value={tech} onValueChange={v => setTech(v as 'FDM' | 'SLA')}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FDM">FDM</SelectItem>
                <SelectItem value="SLA">SLA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="rounded" />
            Aktif
          </label>
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} className="h-9">İptal</Button>
            <Button type="submit" disabled={saving} className="h-9">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Kaydet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
