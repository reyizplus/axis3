'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Factory, Clock, Calendar, Save, Loader2, Truck } from 'lucide-react';
import { toast } from 'sonner';

interface ProductionCapacitySettings {
  machineCount: number; workingHoursPerDay: number; workingDaysPerWeek: number;
  bufferTimePercentage: number; cargoDays: number;
}

export function ProductionCapacityTab() {
  const [settings, setSettings] = useState<ProductionCapacitySettings>({ machineCount: 1, workingHoursPerDay: 8, workingDaysPerWeek: 5, bufferTimePercentage: 20, cargoDays: 2 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/production-capacity');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
    } catch { toast.error('Üretim kapasitesi ayarları yüklenemedi'); } finally { setLoading(false); }
  }

  async function handleSave() {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/production-capacity', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Üretim kapasitesi ayarları güncellendi');
      await loadSettings();
    } catch { toast.error('Ayarlar kaydedilirken hata oluştu'); } finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Factory className="h-4 w-4 text-primary shrink-0" />
            Üretim Kapasitesi
          </CardTitle>
          <CardDescription className="text-xs">Teslimat süresi hesaplamaları için parametreler</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Factory className="h-3.5 w-3.5 text-muted-foreground" />Makine Sayısı</Label>
              <Input type="number" min="1" value={settings.machineCount} onChange={(e) => setSettings({ ...settings, machineCount: parseInt(e.target.value) || 1 })} className="h-9" />
              <p className="text-[10px] text-muted-foreground">Aynı anda çalışan 3D yazıcı sayısı</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-muted-foreground" />Buffer Süresi (%)</Label>
              <Input type="number" min="0" max="100" value={settings.bufferTimePercentage} onChange={(e) => setSettings({ ...settings, bufferTimePercentage: parseInt(e.target.value) || 0 })} className="h-9" />
              <p className="text-[10px] text-muted-foreground">Beklenmedik durumlar için ek süre yüzdesi</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-muted-foreground" />Günlük Çalışma Saati</Label>
              <Input type="number" min="1" max="24" value={settings.workingHoursPerDay} onChange={(e) => setSettings({ ...settings, workingHoursPerDay: parseInt(e.target.value) || 8 })} className="h-9" />
              <p className="text-[10px] text-muted-foreground">Günde kaç saat üretim yapılıyor</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />Haftalık Çalışma Günü</Label>
              <Input type="number" min="1" max="7" value={settings.workingDaysPerWeek} onChange={(e) => setSettings({ ...settings, workingDaysPerWeek: parseInt(e.target.value) || 5 })} className="h-9" />
              <p className="text-[10px] text-muted-foreground">Haftada kaç gün üretim yapılıyor</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-muted-foreground" />Kargo Süresi (Gün)</Label>
              <Input type="number" min="1" max="30" value={settings.cargoDays} onChange={(e) => setSettings({ ...settings, cargoDays: parseInt(e.target.value) || 2 })} className="h-9" />
              <p className="text-[10px] text-muted-foreground">Kargo/teslimat için gereken gün sayısı</p>
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
              <li>Bu ayarlar teslimat süresi hesaplamalarında kullanılır</li>
              <li>Makine sayısı arttıkça teslimat süreleri kısalır</li>
              <li>Buffer süresi, beklenmedik durumlar için ek süre ekler</li>
              <li>Değişiklikler yeni siparişleri etkiler</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
