'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, Package, CheckCircle, XCircle, AlertCircle, ShoppingBag, FlaskConical } from 'lucide-react';
import { adminServiceClient, type Material } from '@/lib/services/admin-service-client';
import { toast } from 'sonner';

const STOCK_CONFIG: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  in_stock: { label: 'Stokta', className: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle },
  low_stock: { label: 'Düşük Stok', className: 'bg-orange-500/10 text-orange-600', icon: AlertCircle },
  out_of_stock: { label: 'Stok Yok', className: 'bg-red-500/10 text-red-600', icon: XCircle },
};

export default function AdminMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Material | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => { loadMaterials(); }, []);

  async function loadMaterials() {
    try {
      setLoading(true);
      const data = await adminServiceClient.getMaterials(true);
      setMaterials(data);
    } catch {
      toast.error('Malzemeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveMaterial(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      const name = formData.get('name') as string;
      const technology = formData.get('technology') as 'FDM' | 'SLA';
      const code = editItem?.code ||
        name.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').substring(0, 50);
      const payload = {
        name, code, technology,
        cost_per_gram: parseFloat(formData.get('cost_per_gram') as string),
        density: parseFloat(formData.get('density') as string),
        print_speed_modifier: parseFloat(formData.get('print_speed_modifier') as string),
        colors: (formData.get('colors') as string).split(',').map(c => c.trim()),
        description: formData.get('description') as string || null,
        is_active: formData.get('is_active') === 'true',
        stock_status: formData.get('stock_status') as 'in_stock' | 'low_stock' | 'out_of_stock',
        lead_time_days: parseInt(formData.get('lead_time_days') as string),
        preorder_allowed: formData.get('preorder_allowed') === 'true',
        preorder_discount_percent: (() => {
          const val = formData.get('preorder_discount_percent') as string;
          return val ? parseFloat(val) : null;
        })(),
      };

      if (editItem) {
        await adminServiceClient.updateMaterial(editItem.id, payload);
        toast.success('Güncellendi');
      } else {
        await adminServiceClient.createMaterial(payload);
        toast.success('Eklendi');
      }
      setDialogOpen(false);
      setEditItem(null);
      await loadMaterials();
    } catch {
      toast.error('Kaydetme başarısız');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try {
      await adminServiceClient.deleteMaterial(id);
      await loadMaterials();
      toast.success('Silindi');
    } catch {
      toast.error('Silme başarısız');
    }
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold gradient-text flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-primary" /> Malzeme Yönetimi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Malzeme ekle, düzenle ve fiyatları güncelle</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{materials.length} malzeme</p>
        <Button onClick={() => { setEditItem(null); setDialogOpen(true); }} size="sm" className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Yeni Malzeme
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-56 bg-muted/50 rounded-xl animate-pulse" />)}
        </div>
      ) : materials.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">Henüz malzeme yok</p>
            <Button size="sm" onClick={() => { setEditItem(null); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Yeni Malzeme Ekle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {materials.map(material => {
            const sc = STOCK_CONFIG[material.stock_status];
            const StockIcon = sc.icon;
            return (
              <Card key={material.id} className="border-border/50 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{material.name}</CardTitle>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          <Badge variant="secondary" className="text-[10px]">{material.technology}</Badge>
                          {material.is_active ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px]">Aktif</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">Pasif</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">Maliyet</span>
                      <span className="font-semibold">₺{material.cost_per_gram.toFixed(3)}/g</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">Yoğunluk</span>
                      <span className="font-semibold">{material.density} g/cm³</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">Hız</span>
                      <span className="font-semibold">{material.print_speed_modifier}x</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">Tedarik</span>
                      <span className="font-semibold">{material.lead_time_days} gün</span>
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${sc.className.split(' ')[0]} border-current/20`}>
                    <StockIcon className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-medium">{sc.label}</span>
                  </div>

                  {material.preorder_allowed && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5">
                      <ShoppingBag className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="text-xs font-medium text-amber-700">Ön Siparişe Açık</span>
                      {material.preorder_discount_percent != null && (
                        <span className="ml-auto text-xs font-semibold text-amber-600">%{material.preorder_discount_percent}</span>
                      )}
                    </div>
                  )}

                  {material.colors && material.colors.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Renkler</span>
                      <div className="flex flex-wrap gap-1">
                        {material.colors.map((color, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{color}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1 h-8 gap-1 text-xs" onClick={() => { setEditItem(material); setDialogOpen(true); }}>
                      <Edit2 className="h-3 w-3" /> Düzenle
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 text-destructive" onClick={() => handleDelete(material.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Malzeme Düzenle' : 'Yeni Malzeme Ekle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveMaterial} className="space-y-4">
            <input type="hidden" name="is_active" value="false" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Malzeme Adı *</Label>
                <Input id="name" name="name" defaultValue={editItem?.name} required className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Teknoloji *</Label>
                <Select name="technology" defaultValue={editItem?.technology || 'FDM'}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FDM">FDM</SelectItem>
                    <SelectItem value="SLA">SLA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Maliyet (₺/g) *</Label>
                <Input name="cost_per_gram" type="number" step="0.001" defaultValue={editItem?.cost_per_gram} required className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Yoğunluk *</Label>
                <Input name="density" type="number" step="0.01" defaultValue={editItem?.density} required className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hız Çarpanı *</Label>
                <Input name="print_speed_modifier" type="number" step="0.1" defaultValue={editItem?.print_speed_modifier} required className="h-9 text-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Renkler (virgülle ayırın) *</Label>
              <Input name="colors" defaultValue={editItem?.colors?.join(', ') || ''} placeholder="Beyaz, Siyah, Kırmızı" required className="h-9 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Stok Durumu *</Label>
                <Select name="stock_status" defaultValue={editItem?.stock_status || 'in_stock'}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">Stokta</SelectItem>
                    <SelectItem value="low_stock">Düşük Stok</SelectItem>
                    <SelectItem value="out_of_stock">Stok Yok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tedarik Süresi (gün) *</Label>
                <Input name="lead_time_days" type="number" defaultValue={editItem?.lead_time_days} required className="h-9 text-sm" />
              </div>
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-amber-700">Ön Sipariş Ayarları</h4>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" name="preorder_allowed" value="true" defaultChecked={editItem?.preorder_allowed ?? false} className="rounded" />
                Ön siparişe izin ver
              </label>
              <div className="space-y-1.5">
                <Label className="text-xs">Ön Sipariş İndirimi (%)</Label>
                <Input name="preorder_discount_percent" type="number" step="0.1" min="0" max="100" defaultValue={editItem?.preorder_discount_percent ?? ''} placeholder="Varsayılan kullanılır" className="h-9 text-sm" />
                <p className="text-[10px] text-muted-foreground">Boş bırakılırsa genel ayarlardaki varsayılan indirim oranı kullanılır</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Açıklama</Label>
              <Input name="description" defaultValue={editItem?.description || ''} className="h-9 text-sm" />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="is_active" value="true" defaultChecked={editItem?.is_active ?? true} className="rounded" />
              Aktif malzeme
            </label>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1 h-9">Kaydet</Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="h-9">İptal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
