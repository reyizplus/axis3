'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export function PreorderSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [defaultDiscount, setDefaultDiscount] = useState('10');

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data } = await (supabase.from('global_settings') as any)
          .select('key, value').in('key', ['preorder_enabled', 'default_preorder_discount_percent']);
        if (data) {
          for (const row of data) {
            const r = row as { key: string; value: any };
            if (r.key === 'preorder_enabled') setEnabled(!!r.value?.value);
            if (r.key === 'default_preorder_discount_percent') setDefaultDiscount(String(r.value?.value ?? '10'));
          }
        }
      } catch { toast.error('Ayarlar yüklenemedi'); } finally { setLoading(false); }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      await (supabase as any).from('global_settings').upsert([
        { key: 'preorder_enabled', value: { value: enabled, unit: 'boolean' }, category: 'operations', description: 'Ön sipariş sistemi aktif/pasif' },
        { key: 'default_preorder_discount_percent', value: { value: parseFloat(defaultDiscount), unit: 'percentage' }, category: 'pricing', description: 'Varsayılan ön sipariş indirim yüzdesi' },
      ], { onConflict: 'key' });
      toast.success('Ön sipariş ayarları kaydedildi');
    } catch { toast.error('Kaydetme başarısız'); } finally { setSaving(false); }
  };

  if (loading) return <Card className="border-border/50 shadow-sm overflow-hidden"><CardContent className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></CardContent></Card>;

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary shrink-0" />
          Ön Sipariş Ayarları
        </CardTitle>
        <CardDescription className="text-xs">Stokta olmayan ürünler için ön sipariş seçeneği</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
        <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl border border-border/40">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-semibold">Ön Sipariş Sistemi</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Stokta olmayan ürünler ön sipariş olarak alınabilir</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} className="shrink-0 ml-2" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Varsayılan Ön Sipariş İndirimi (%)</Label>
          <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2">
            <Input type="number" min="0" max="100" value={defaultDiscount} onChange={e => setDefaultDiscount(e.target.value)} className="w-full xs:w-32 h-9" disabled={!enabled} />
            <span className="text-[10px] sm:text-xs text-muted-foreground">Envanterde belirtilmediğinde kullanılır</span>
          </div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs text-blue-600 dark:text-blue-400">Her envanter kalemi için ön sipariş indirimi ayrı ayarlanabilir. Bu oran, özel bir oran girilmediğinde kullanılır.</p>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Kaydet
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
