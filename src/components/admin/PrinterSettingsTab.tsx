'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Printer, Cpu } from 'lucide-react';
import { toast } from 'sonner';

interface BuildVolume { max_x: number; max_y: number; max_z: number; }

export function PrinterSettingsTab() {
  const [buildVolume, setBuildVolume] = useState<BuildVolume>({ max_x: 200, max_y: 200, max_z: 200 });
  const [curaPath, setCuraPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const [bvRes, curaRes] = await Promise.all([
        fetch('/api/settings/build-volume'),
        fetch('/api/admin/settings?key=cura_engine_path'),
      ]);
      if (bvRes.ok) {
        const bvData = await bvRes.json();
        if (bvData.success && bvData.data) setBuildVolume(bvData.data);
      }
      if (curaRes.ok) {
        const curaData = await curaRes.json();
        if (curaData.value?.path) setCuraPath(curaData.value.path);
      }
    } catch { toast.error('Ayarlar yüklenemedi'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSaveBuildVolume = async () => {
    if (buildVolume.max_x <= 0 || buildVolume.max_y <= 0 || buildVolume.max_z <= 0) {
      toast.error('Boyutlar 0\'dan büyük olmalıdır'); return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/settings/build-volume', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildVolume),
      });
      const data = await res.json();
      if (data.success) toast.success('Yazıcı boyutları güncellendi');
      else throw new Error(data.error);
    } catch { toast.error('Yazıcı boyutları güncellenemedi'); } finally { setSaving(false); }
  };

  const handleSaveCuraPath = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'cura_engine_path', value: { path: curaPath } }),
      });
      if (res.ok) toast.success('CuraEngine yolu güncellendi');
      else throw new Error('Kaydedilemedi');
    } catch { toast.error('CuraEngine yolu güncellenemedi'); } finally { setSaving(false); }
  };

  if (loading) return <Card className="border-border/50 shadow-sm overflow-hidden"><CardContent className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></CardContent></Card>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Printer className="h-4 w-4 text-primary shrink-0" />
            Yazıcı Boyutları
          </CardTitle>
          <CardDescription className="text-xs">Maksimum baskı alanı boyutları (cm)</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {[
              { id: 'max_x', label: 'X (cm)', desc: 'Genişlik' },
              { id: 'max_y', label: 'Y (cm)', desc: 'Derinlik' },
              { id: 'max_z', label: 'Z (cm)', desc: 'Yükseklik' },
            ].map(({ id, label, desc }) => (
              <div key={id} className="space-y-1.5">
                <Label className="text-[11px] sm:text-xs">{label}</Label>
                <Input type="number" min="1" step="0.1" value={(buildVolume as any)[id]} onChange={(e) => setBuildVolume({ ...buildVolume, [id]: parseFloat(e.target.value) || 0 })} className="text-sm sm:text-base font-semibold h-9" />
                <p className="text-[10px] text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <div className="p-3 sm:p-4 rounded-xl bg-muted/20 border border-border/40">
            <p className="text-xs sm:text-sm font-medium mb-1">Baskı Alanı Önizleme</p>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span><span className="font-bold text-foreground">{buildVolume.max_x}</span> cm (X)</span>
              <span>×</span>
              <span><span className="font-bold text-foreground">{buildVolume.max_y}</span> cm (Y)</span>
              <span>×</span>
              <span><span className="font-bold text-foreground">{buildVolume.max_z}</span> cm (Z)</span>
              <span className="text-foreground font-semibold">= {(buildVolume.max_x * buildVolume.max_y * buildVolume.max_z).toFixed(2)} cm³</span>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveBuildVolume} disabled={saving} size="sm">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Kaydediliyor...</> : <><Save className="mr-2 h-4 w-4" />Kaydet</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CuraEngine Path */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary shrink-0" />
            CuraEngine Yolu
          </CardTitle>
          <CardDescription className="text-xs">Dilimleme motoru (CuraEngine) çalıştırılabilir dosya yolu</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] sm:text-xs">CuraEngine Yolu</Label>
            <Input
              value={curaPath}
              onChange={(e) => setCuraPath(e.target.value)}
              placeholder="/usr/local/bin/CuraEngine"
              className="text-sm sm:text-base font-mono h-9"
            />
            <p className="text-[10px] text-muted-foreground">
              Varsayılan: <code className="bg-muted px-1 rounded">CuraEngine</code> (PATH) veya <code className="bg-muted px-1 rounded">CURA_ENGINE_PATH</code> env değişkeni
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveCuraPath} disabled={saving} size="sm">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Kaydediliyor...</> : <><Save className="mr-2 h-4 w-4" />Kaydet</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
          <CardTitle className="text-sm sm:text-base">Bilgilendirme</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-1 text-xs sm:text-sm text-muted-foreground">
          <p>• Bu ayarlar, yüklenen STL dosyalarının boyut kontrolü için kullanılır.</p>
          <p>• Dosya boyutları bu değerleri aşarsa kullanıcıya uyarı gösterilir.</p>
          <p>• Değerler santimetre (cm) cinsinden girilmelidir.</p>
          <p>• Tipik FDM yazıcı boyutları: 20×20×20 cm veya 30×30×30 cm</p>
        </CardContent>
      </Card>
    </div>
  );
}
