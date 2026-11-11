'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Plus, Pencil, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface PrintSetting {
  id: string; name: string; code: string; technology: 'FDM' | 'SLA';
  layer_height: number | null; infill_percentage: number | null; print_speed: number | null;
  layer_thickness: number | null; exposure_time: number | null; time_multiplier: number;
  quality_premium: number; price_multiplier: number; description: string | null;
  is_active: boolean; sort_order: number; requires_nozzle_size_id: string | null;
}

const defaultSetting: Partial<PrintSetting> = {
  name: '', code: '', technology: 'FDM', layer_height: 0.2, infill_percentage: 20,
  print_speed: 60, layer_thickness: null, exposure_time: null, time_multiplier: 1.0,
  quality_premium: 0, price_multiplier: 1.0, description: '', is_active: true, sort_order: 0,
  requires_nozzle_size_id: null,
};

export function PrintSettingsTab() {
  const [settings, setSettings] = useState<PrintSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PrintSetting>>({});
  const [creating, setCreating] = useState(false);
  const supabase = createClient();

  async function loadSettings() {
    try {
      setLoading(true);
      const { data } = await supabase.from('print_settings').select('*').order('sort_order');
      setSettings((data as unknown as PrintSetting[]) || []);
    } catch { toast.error('Ayarlar yüklenemedi'); } finally { setLoading(false); }
  }

  useEffect(() => { loadSettings(); }, []);

  function startEdit(setting: PrintSetting) { setEditingId(setting.id); setEditForm({ ...setting }); setCreating(false); }
  function startCreate() { setCreating(true); setEditingId(null); setEditForm({ ...defaultSetting }); }
  function cancelEdit() { setEditingId(null); setCreating(false); setEditForm({}); }

  async function saveSetting() {
    if (!editForm.name || !editForm.code) { toast.error('İsim ve kod zorunludur'); return; }
    setSaving(true);
    try {
      const data = { ...defaultSetting, ...editForm, name: editForm.name || '', code: editForm.code || '', technology: editForm.technology || 'FDM' as const, is_active: editForm.is_active ?? true, sort_order: editForm.sort_order ?? 0, time_multiplier: editForm.time_multiplier ?? 1.0, quality_premium: editForm.quality_premium ?? 0, price_multiplier: editForm.price_multiplier ?? 1.0 };
      if (creating) {
        const { error } = await (supabase.from('print_settings') as any).insert(data);
        if (error) throw error;
        toast.success('Baskı kalitesi eklendi');
      } else if (editingId) {
        const { error } = await (supabase.from('print_settings') as any).update(data).eq('id', editingId);
        if (error) throw error;
        toast.success('Baskı kalitesi güncellendi');
      }
      await loadSettings();
      cancelEdit();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Kaydedilemedi'); } finally { setSaving(false); }
  }

  async function toggleActive(setting: PrintSetting) {
    try { await (supabase.from('print_settings') as any).update({ is_active: !setting.is_active }).eq('id', setting.id); await loadSettings(); } catch { toast.error('Güncellenemedi'); }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-lg font-semibold truncate">Baskı Kalitesi Ayarları</h3>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">Kalite seviyelerini, fiyat çarpanlarını ve parametreleri yönetin</p>
        </div>
        <Button onClick={startCreate} size="sm" className="shrink-0 w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />Yeni Kalite Ekle
        </Button>
      </div>

      {creating && (
        <Card className="border-border/50 shadow-sm overflow-hidden border-primary/30">
          <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
            <CardTitle className="text-sm sm:text-base">Yeni Baskı Kalitesi</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <PrintSettingForm form={editForm} onChange={setEditForm} />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={cancelEdit}>İptal</Button>
              <Button onClick={saveSetting} disabled={saving} size="sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}Kaydet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3 sm:space-y-4">
        {settings.map((setting) => (
          <Card key={setting.id} className={`border-border/50 shadow-sm overflow-hidden ${!setting.is_active ? 'opacity-60' : ''}`}>
            <CardHeader className="px-4 sm:px-6 py-3 sm:py-4 pb-2 sm:pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <CardTitle className="text-sm sm:text-base truncate max-w-[120px] sm:max-w-[200px]">{setting.name}</CardTitle>
                      <Badge variant={setting.technology === 'FDM' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1 shrink-0">{setting.technology}</Badge>
                      <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">{setting.code}</Badge>
                      {!setting.is_active && <Badge variant="destructive" className="text-[10px] h-4 px-1 shrink-0">Pasif</Badge>}
                    </div>
                    {setting.description && <CardDescription className="text-xs truncate">{setting.description}</CardDescription>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={setting.is_active} onCheckedChange={() => toggleActive(setting)} className="scale-75 sm:scale-100" />
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(setting)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            {editingId === setting.id ? (
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <PrintSettingForm form={editForm} onChange={setEditForm} />
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={cancelEdit}>İptal</Button>
                  <Button onClick={saveSetting} disabled={saving} size="sm">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Kaydet
                  </Button>
                </div>
              </CardContent>
            ) : (
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div><span className="text-muted-foreground">Zaman Çarpanı</span><p className="font-semibold">{setting.time_multiplier}x</p></div>
                  <div><span className="text-muted-foreground">Fiyat Çarpanı</span><p className="font-semibold">{setting.price_multiplier}x</p></div>
                  <div><span className="text-muted-foreground">Kalite Primi</span><p className="font-semibold">%{(setting.quality_premium * 100).toFixed(0)}</p></div>
                  {setting.technology === 'FDM' ? (
                    <>
                      {setting.layer_height != null && <div><span className="text-muted-foreground">Katman Yük.</span><p className="font-semibold">{setting.layer_height.toFixed(3)}mm</p></div>}
                      {setting.infill_percentage != null && <div><span className="text-muted-foreground">Doluluk</span><p className="font-semibold">%{setting.infill_percentage}</p></div>}
                    </>
                  ) : (
                    <>
                      {setting.layer_thickness != null && <div><span className="text-muted-foreground">Katman Kalın.</span><p className="font-semibold">{setting.layer_thickness.toFixed(3)}mm</p></div>}
                      {setting.exposure_time != null && <div><span className="text-muted-foreground">Pozlama</span><p className="font-semibold">{setting.exposure_time.toFixed(1)}s</p></div>}
                    </>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function PrintSettingForm({ form, onChange }: { form: Partial<PrintSetting>; onChange: (f: Partial<PrintSetting>) => void }) {
  const isFdm = form.technology === 'FDM';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      <div className="space-y-1.5"><Label className="text-xs">İsim</Label><Input value={form.name || ''} onChange={e => onChange({ ...form, name: e.target.value })} placeholder="Standart" className="h-9 text-sm" /></div>
      <div className="space-y-1.5"><Label className="text-xs">Kod</Label><Input value={form.code || ''} onChange={e => onChange({ ...form, code: e.target.value })} placeholder="standard" className="h-9 text-sm" /></div>
      <div className="space-y-1.5"><Label className="text-xs">Teknoloji</Label>
        <select className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.technology || 'FDM'} onChange={e => onChange({ ...form, technology: e.target.value as 'FDM' | 'SLA' })}>
          <option value="FDM">FDM</option>
          <option value="SLA">SLA</option>
        </select>
      </div>
      {isFdm ? (
        <>
          <div className="space-y-1.5"><Label className="text-xs">Katman Yüksekliği (mm)</Label><Input type="number" step="0.001" value={form.layer_height ?? 0.2} onChange={e => onChange({ ...form, layer_height: parseFloat(e.target.value) })} className="h-9" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Doluluk (%)</Label><Input type="number" value={form.infill_percentage ?? 20} onChange={e => onChange({ ...form, infill_percentage: parseInt(e.target.value) })} className="h-9" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Baskı Hızı (mm/s)</Label><Input type="number" value={form.print_speed ?? 60} onChange={e => onChange({ ...form, print_speed: parseInt(e.target.value) })} className="h-9" /></div>
        </>
      ) : (
        <>
          <div className="space-y-1.5"><Label className="text-xs">Katman Kalınlığı (mm)</Label><Input type="number" step="0.001" value={form.layer_thickness ?? 0.05} onChange={e => onChange({ ...form, layer_thickness: parseFloat(e.target.value) })} className="h-9" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Pozlama Süresi (s)</Label><Input type="number" step="0.1" value={form.exposure_time ?? 8} onChange={e => onChange({ ...form, exposure_time: parseFloat(e.target.value) })} className="h-9" /></div>
        </>
      )}
      <div className="space-y-1.5"><Label className="text-xs">Zaman Çarpanı</Label><Input type="number" step="0.1" value={form.time_multiplier ?? 1.0} onChange={e => onChange({ ...form, time_multiplier: parseFloat(e.target.value) })} className="h-9" /></div>
      <div className="space-y-1.5"><Label className="text-xs">Fiyat Çarpanı</Label><Input type="number" step="0.01" value={form.price_multiplier ?? 1.0} onChange={e => onChange({ ...form, price_multiplier: parseFloat(e.target.value) })} className="h-9" /></div>
      <div className="space-y-1.5"><Label className="text-xs">Kalite Primi (ondalık)</Label><Input type="number" step="0.01" value={form.quality_premium ?? 0} onChange={e => onChange({ ...form, quality_premium: parseFloat(e.target.value) })} placeholder="0.20 = %20" className="h-9" /></div>
      <div className="space-y-1.5"><Label className="text-xs">Sıralama</Label><Input type="number" value={form.sort_order ?? 0} onChange={e => onChange({ ...form, sort_order: parseInt(e.target.value) })} className="h-9" /></div>
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-3"><Label className="text-xs">Açıklama</Label><Input value={form.description || ''} onChange={e => onChange({ ...form, description: e.target.value })} placeholder="Bu kalite seviyesinin açıklaması" className="h-9 text-sm" /></div>
    </div>
  );
}
