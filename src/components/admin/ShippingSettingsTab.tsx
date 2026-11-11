'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, Gift, Save, Loader2, CalendarDays } from 'lucide-react';
import { resetShippingSettingsCache } from '@/lib/services/settings-service';
import { toast } from 'sonner';

interface ShippingSettings { shippingFee: number; freeShippingMinAmount: number; defaultDeliveryDays: number; }

export function ShippingSettingsTab() {
  const [settings, setSettings] = useState<ShippingSettings>({ shippingFee: 0, freeShippingMinAmount: 0, defaultDeliveryDays: 3 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/shipping-settings');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
    } catch { toast.error('Kargo ayarları yüklenemedi'); } finally { setLoading(false); }
  }

  async function handleSave() {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/shipping-settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed');
      resetShippingSettingsCache();
      toast.success('Kargo ayarları güncellendi');
      await loadSettings();
    } catch { toast.error('Ayarlar kaydedilirken hata oluştu'); } finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary shrink-0" />
            Kargo Ayarları
          </CardTitle>
          <CardDescription className="text-xs">Kargo ücreti ve ücretsiz kargo sınırını belirleyin</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-muted-foreground" />Kargo Ücreti (₺)</Label>
              <Input type="number" min="0" step="0.01" value={settings.shippingFee} onChange={(e) => setSettings({ ...settings, shippingFee: parseFloat(e.target.value) || 0 })} className="h-9" />
              <p className="text-[10px] text-muted-foreground">Siparişlerde uygulanacak sabit kargo ücreti</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Gift className="h-3.5 w-3.5 text-muted-foreground" />Ücretsiz Kargo Sınırı (₺)</Label>
              <Input type="number" min="0" step="0.01" value={settings.freeShippingMinAmount} onChange={(e) => setSettings({ ...settings, freeShippingMinAmount: parseFloat(e.target.value) || 0 })} className="h-9" />
              <p className="text-[10px] text-muted-foreground">Bu tutar üzerindeki siparişlerde kargo ücretsiz (0 = her zaman ücretli)</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />Varsayılan Teslimat Süresi (gün)</Label>
              <Input type="number" min="1" step="1" value={settings.defaultDeliveryDays} onChange={(e) => setSettings({ ...settings, defaultDeliveryDays: parseInt(e.target.value) || 3 })} className="h-9" />
              <p className="text-[10px] text-muted-foreground">Mağaza ürünleri için varsayılan teslimat süresi (3D baskı ürünleri üretim kapasitesine göre hesaplanır)</p>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Kaydediliyor...</> : <><Save className="mr-2 h-4 w-4" />Kaydet</>}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/50 shadow-sm overflow-hidden border-blue-500/20">
        <CardContent className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Bilgi:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Kargo ücreti, ödeme sayfasında sipariş toplamına eklenir</li>
              <li>Ücretsiz kargo sınırına sepetteki ürün toplamı baz alınır</li>
              <li>0 TL girilirse ücretsiz kargo devre dışı kalır</li>
              <li>Değişiklikler anında geçerlilik kazanır</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
