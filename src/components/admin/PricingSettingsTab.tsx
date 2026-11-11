'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DollarSign, Zap, Briefcase, TrendingUp, Printer, Save, Loader2, Percent, Plus, Trash2, Cpu, ShieldCheck, Clock, Settings2 } from 'lucide-react';
import { adminServiceClient, type GlobalSetting } from '@/lib/services/admin-service-client';
import { resetVatRateCache } from '@/lib/services/settings-service';
import { toast } from 'sonner';

export function PricingSettingsTab() {
  const [settings, setSettings] = useState<GlobalSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const [machineRates, setMachineRates] = useState<any[]>([]);
  const [riskPremiums, setRiskPremiums] = useState<any[]>([]);
  const [laborTimes, setLaborTimes] = useState<any[]>([]);
  const [coefficients, setCoefficients] = useState<any[]>([]);
  const [v2Loading, setV2Loading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminServiceClient.getGlobalSettings();
      setSettings(data);
      const initial: Record<string, any> = {};
      data.forEach(setting => { initial[setting.key] = setting.value; });
      setEditedValues(initial);
    } catch (error) {
      toast.error(`Ayarlar yüklenemedi: ${error instanceof Error ? error.message : 'Hata'}`);
    } finally { setLoading(false); }
  }, []);

  const loadV2Tables = useCallback(async () => {
    try {
      setV2Loading(true);
      const [machines, risks, labors, coeffs] = await Promise.all([
        adminServiceClient.getMachineAmortization(),
        adminServiceClient.getRiskPremiumSettings(),
        adminServiceClient.getLaborTimeSettings(),
        adminServiceClient.getPricingCoefficients(),
      ]);
      setMachineRates(machines); setRiskPremiums(risks); setLaborTimes(labors); setCoefficients(coeffs);
    } catch { /* v2 tables might not be available */ } finally { setV2Loading(false); }
  }, []);

  useEffect(() => { loadSettings(); loadV2Tables(); }, [loadSettings, loadV2Tables]);

  async function handleSave() {
    try {
      setSaving(true);
      const updates = Object.entries(editedValues).map(([key, value]) => {
        const original = settings.find(s => s.key === key);
        if (JSON.stringify(original?.value) !== JSON.stringify(value)) {
          return adminServiceClient.updateGlobalSetting(key, value);
        }
        return null;
      }).filter(Boolean);
      await Promise.all(updates);
      await loadSettings();
      resetVatRateCache();
      toast.success('Ayarlar başarıyla güncellendi!');
    } catch { toast.error('Ayarlar güncellenirken hata oluştu!'); } finally { setSaving(false); }
  }

  async function handleSaveMachine(id: string, field: string, value: string) {
    try {
      await adminServiceClient.updateMachineAmortization(id, { [field]: parseFloat(value) || 0 });
      setMachineRates(await adminServiceClient.getMachineAmortization());
    } catch { toast.error('Makine amortismanı güncellenemedi'); }
  }

  async function handleSaveRisk(id: string, value: string) {
    try {
      await adminServiceClient.updateRiskPremiumSetting(id, { premium_percentage: parseFloat(value) || 0 });
      setRiskPremiums(await adminServiceClient.getRiskPremiumSettings());
    } catch { toast.error('Risk primi güncellenemedi'); }
  }

  async function handleSaveLabor(id: string, field: string, value: string) {
    try {
      await adminServiceClient.updateLaborTimeSetting(id, { [field]: parseFloat(value) || 0 });
      setLaborTimes(await adminServiceClient.getLaborTimeSettings());
    } catch { toast.error('İşçilik süresi güncellenemedi'); }
  }

  async function handleSaveCoefficient(id: string, valueMinutes: string) {
    try {
      await adminServiceClient.updatePricingCoefficient(id, parseFloat(valueMinutes) || 0);
      setCoefficients(await adminServiceClient.getPricingCoefficients());
    } catch { toast.error('ECF katsayısı güncellenemedi'); }
  }

  function updateValue(key: string, field: string, value: any) {
    setEditedValues(prev => ({ ...prev, [key]: { ...prev[key], [field]: parseFloat(value) || 0 } }));
  }

  function updatePrinterDimension(axis: 'x' | 'y' | 'z', value: string) {
    setEditedValues(prev => ({ ...prev, printer_max_build_volume: { ...prev.printer_max_build_volume, [axis]: parseFloat(value) || 0 } }));
  }

  function updateDiscountTier(index: number, field: 'minQty' | 'discountPercent', value: string) {
    setEditedValues(prev => {
      const tiers = [...((prev.quantity_discounts?.tiers) || [])];
      tiers[index] = { ...tiers[index], [field]: parseFloat(value) || 0 };
      return { ...prev, quantity_discounts: { ...prev.quantity_discounts, tiers } };
    });
  }

  function addDiscountTier() {
    setEditedValues(prev => {
      const tiers = [...((prev.quantity_discounts?.tiers) || [])];
      tiers.push({ minQty: 1, discountPercent: 0 });
      return { ...prev, quantity_discounts: { ...prev.quantity_discounts, tiers } };
    });
  }

  function removeDiscountTier(index: number) {
    setEditedValues(prev => {
      const tiers = (prev.quantity_discounts?.tiers || []).filter((_: any, i: number) => i !== index);
      return { ...prev, quantity_discounts: { ...prev.quantity_discounts, tiers } };
    });
  }

  const settingIcons: Record<string, any> = {
    electricity_rate_per_hour: Zap, labor_rate_per_hour: Briefcase,
    profit_margin_multiplier: TrendingUp, fixed_service_fee: DollarSign,
    vat_rate: DollarSign, printer_max_build_volume: Printer, quantity_discounts: Percent,
  };

  const settingColors: Record<string, string> = {
    electricity_rate_per_hour: 'text-yellow-500 bg-yellow-500/10',
    labor_rate_per_hour: 'text-blue-500 bg-blue-500/10',
    profit_margin_multiplier: 'text-green-500 bg-green-500/10',
    fixed_service_fee: 'text-purple-500 bg-purple-500/10',
    vat_rate: 'text-orange-500 bg-orange-500/10',
    printer_max_build_volume: 'text-cyan-500 bg-cyan-500/10',
    quantity_discounts: 'text-pink-500 bg-pink-500/10',
  };

  const machineTypeLabels: Record<string, string> = {
    FDM_STANDARD: 'Standart FDM', FDM_INDUSTRIAL: 'Endüstriyel FDM',
    SLA_STANDARD: 'Standart SLA', SLA_INDUSTRIAL: 'Endüstriyel SLA',
  };

  const riskTechLabels: Record<string, string> = { FDM: 'FDM Baskı', SLA: 'SLA Baskı' };
  const laborTaskLabels: Record<string, string> = { file_prep: 'Dosya Hazırlık', support_removal: 'Destek Ayıklama', post_processing: 'Son İşlem' };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const pricingSettings = settings.filter(s => s.category === 'pricing' && s.key !== 'quantity_discounts');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-lg font-semibold truncate">Fiyatlandırma Ayarları</h3>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">Global fiyatlandırma parametrelerini yönetin</p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="shrink-0 w-full sm:w-auto">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Kaydediliyor...</> : <><Save className="mr-2 h-4 w-4" />Kaydet</>}
        </Button>
      </div>

      {/* Pricing Settings Cards */}
      <div className="space-y-3 sm:space-y-4">
        {pricingSettings.map((setting) => {
          const Icon = settingIcons[setting.key] || DollarSign;
          const colorClass = settingColors[setting.key] || 'text-gray-500 bg-gray-500/10';
          const value = editedValues[setting.key] || setting.value;
          return (
            <Card key={setting.key} className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg shrink-0 ${colorClass}`}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm sm:text-base truncate">
                      {setting.key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </CardTitle>
                    <CardDescription className="text-xs truncate">{setting.description}</CardDescription>
                    <Badge variant="secondary" className="mt-1 text-[10px] h-4 px-1">{setting.category}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                {setting.key === 'printer_max_build_volume' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      {(['x', 'y', 'z'] as const).map((axis) => (
                        <div key={axis} className="space-y-1.5">
                          <Label className="text-[11px] sm:text-xs">
                            {axis === 'x' ? 'X (Genişlik)' : axis === 'y' ? 'Y (Derinlik)' : 'Z (Yükseklik)'}
                          </Label>
                          <Input type="number" step="1" value={value[axis] || 0} onChange={(e) => updatePrinterDimension(axis, e.target.value)} className="text-sm sm:text-base font-semibold" />
                          <span className="text-[10px] text-muted-foreground">cm</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-xs sm:text-sm">
                      <span className="text-muted-foreground">Maksimum Baskı Hacmi: </span>
                      <span className="font-bold">{value.x || 0} × {value.y || 0} × {value.z || 0} cm</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-[11px] sm:text-xs">
                          Değer
                          {value.currency && <span className="ml-2 text-muted-foreground">({value.currency})</span>}
                        </Label>
                        <Input
                          type="number" step="0.01"
                          value={value.value || 0}
                          onChange={(e) => updateValue(setting.key, 'value', e.target.value)}
                          disabled={value.enabled === false}
                          className={`text-sm sm:text-base font-semibold ${value.enabled === false ? 'opacity-50' : ''}`}
                        />
                      </div>
                      <div className="pt-5">
                        <button
                          type="button"
                          onClick={() => {
                            const newEnabled = value.enabled !== false ? false : true;
                            setEditedValues(prev => ({
                              ...prev,
                              [setting.key]: { ...prev[setting.key], enabled: newEnabled }
                            }));
                          }}
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                            value.enabled !== false
                              ? 'bg-primary'
                              : 'bg-muted-foreground/30'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                              value.enabled !== false
                                ? 'translate-x-6'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-xs sm:text-sm">
                      <span className="text-muted-foreground">Mevcut Değer: </span>
                      <span className="font-bold">
                        {setting.key === 'profit_margin_multiplier' || setting.key === 'vat_rate'
                          ? `${((value.value || 0) * 100).toFixed(0)}%`
                          : `${value.value || 0} ${value.currency || ''}`}
                      </span>
                      {setting.key !== 'vat_rate' && (
                        <span className={`ml-2 text-[10px] ${value.enabled !== false ? 'text-green-600' : 'text-red-500'}`}>
                          ({value.enabled !== false ? 'Aktif' : 'Devre Dışı'})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quantity Discount Tiers */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg shrink-0 text-pink-500 bg-pink-500/10">
              <Percent className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm sm:text-base truncate">Adet İndirim Kademeleri</CardTitle>
                  <CardDescription className="text-xs">Belirli adetlerde otomatik uygulanan indirim yüzdeleri</CardDescription>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newEnabled = editedValues.quantity_discounts?.enabled !== false ? false : true;
                    setEditedValues(prev => ({
                      ...prev,
                      quantity_discounts: { ...prev.quantity_discounts, enabled: newEnabled }
                    }));
                  }}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${
                    editedValues.quantity_discounts?.enabled !== false
                      ? 'bg-primary'
                      : 'bg-muted-foreground/30'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      editedValues.quantity_discounts?.enabled !== false
                        ? 'translate-x-6'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <Badge variant="secondary" className="mt-1 text-[10px] h-4 px-1">pricing</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="space-y-2">
            {(editedValues.quantity_discounts?.tiers || []).map((tier: any, index: number) => (
              <div key={index} className={`flex items-end gap-2 p-3 rounded-xl border ${editedValues.quantity_discounts?.enabled === false ? 'opacity-50' : ''} border-border/40 bg-muted/20`}>
                <div className="space-y-1 flex-1">
                  <Label className="text-[10px]">Min. Adet</Label>
                  <Input type="number" min="1" step="1" value={tier.minQty} onChange={(e) => updateDiscountTier(index, 'minQty', e.target.value)} disabled={editedValues.quantity_discounts?.enabled === false} className="text-sm font-semibold h-9" />
                </div>
                <div className="space-y-1 flex-1">
                  <Label className="text-[10px]">İndirim %</Label>
                  <Input type="number" min="0" max="100" step="1" value={tier.discountPercent} onChange={(e) => updateDiscountTier(index, 'discountPercent', e.target.value)} disabled={editedValues.quantity_discounts?.enabled === false} className="text-sm font-semibold h-9" />
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => removeDiscountTier(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addDiscountTier} disabled={editedValues.quantity_discounts?.enabled === false} className="w-full text-xs sm:text-sm">
              <Plus className="mr-2 h-4 w-4" />Kademe Ekle
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-2" />

      {/* Machine Amortization */}
      <Card className="border-border/50 shadow-sm overflow-hidden border-amber-500/20">
        <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg shrink-0 text-amber-500 bg-amber-500/10">
              <Cpu className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm sm:text-base truncate">Makine Amortisman Oranları</CardTitle>
              <CardDescription className="text-xs">Her makine tipi için saatlik amortisman ücreti</CardDescription>
              <Badge variant="secondary" className="mt-1 text-[10px] h-4 px-1">v2 pricing</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          {v2Loading ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
            <div className="space-y-2">
              {machineRates.map((m: any) => (
                <div key={m.id} className="flex items-center gap-2 sm:gap-4 p-3 rounded-xl border border-border/40 bg-muted/20">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-medium truncate">{machineTypeLabels[m.machine_type] || m.machine_type}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{m.machine_type}</div>
                  </div>
                  <div className="w-20 sm:w-32 shrink-0">
                    <Input type="number" step="0.5" value={m.hourly_rate} onChange={(e) => handleSaveMachine(m.id, 'hourly_rate', e.target.value)} className="text-xs sm:text-sm font-semibold text-right h-9" />
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 w-6">₺/s</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Premium */}
      <Card className="border-border/50 shadow-sm overflow-hidden border-red-500/20">
        <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg shrink-0 text-red-500 bg-red-500/10">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm sm:text-base truncate">Risk Primleri</CardTitle>
              <CardDescription className="text-xs">Baskı başarısızlığına karşı risk primi yüzdeleri</CardDescription>
              <Badge variant="secondary" className="mt-1 text-[10px] h-4 px-1">v2 pricing</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          {v2Loading ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
            <div className="space-y-2">
              {riskPremiums.map((r: any) => (
                <div key={r.id} className="flex items-center gap-2 sm:gap-4 p-3 rounded-xl border border-border/40 bg-muted/20">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-medium truncate">{riskTechLabels[r.technology] || r.technology}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{r.description}</div>
                  </div>
                  <div className="w-16 sm:w-24 shrink-0">
                    <Input type="number" step="0.5" value={r.premium_percentage} onChange={(e) => handleSaveRisk(r.id, e.target.value)} className="text-xs sm:text-sm font-semibold text-right h-9" />
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 w-4">%</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Labor Time */}
      <Card className="border-border/50 shadow-sm overflow-hidden border-blue-500/20">
        <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg shrink-0 text-blue-500 bg-blue-500/10">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm sm:text-base truncate">İşçilik Süreleri</CardTitle>
              <CardDescription className="text-xs">Her işlem tipi için baz süre (dakika)</CardDescription>
              <Badge variant="secondary" className="mt-1 text-[10px] h-4 px-1">v2 pricing</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          {v2Loading ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
            <div className="space-y-2">
              {laborTimes.map((l: any) => (
                <div key={l.id} className="flex items-center gap-2 sm:gap-4 p-3 rounded-xl border border-border/40 bg-muted/20">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-medium truncate">{laborTaskLabels[l.task_type] || l.task_type}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{l.description}</div>
                  </div>
                  <div className="w-16 sm:w-24 shrink-0">
                    <Input type="number" step="1" value={l.base_minutes} onChange={(e) => handleSaveLabor(l.id, 'base_minutes', e.target.value)} className="text-xs sm:text-sm font-semibold text-right h-9" />
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 w-6">dk</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ECF */}
      <Card className="border-border/50 shadow-sm overflow-hidden border-purple-500/20">
        <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg shrink-0 text-purple-500 bg-purple-500/10">
              <Settings2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm sm:text-base truncate">ECF — Deneyimsel Düzeltme Katsayıları</CardTitle>
              <CardDescription className="text-xs">Gerçekçi baskı süresi için ek süre katsayıları (dakika)</CardDescription>
              <Badge variant="secondary" className="mt-1 text-[10px] h-4 px-1">v2 pricing</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          {v2Loading ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
            <div className="space-y-2">
              {coefficients.map((c: any) => (
                <div key={c.id} className="flex items-center gap-2 sm:gap-4 p-3 rounded-xl border border-border/40 bg-muted/20">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-medium truncate">{c.label}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{c.description}</div>
                  </div>
                  <div className="w-16 sm:w-24 shrink-0">
                    <Input type="number" step="0.5" value={c.value_minutes} onChange={(e) => handleSaveCoefficient(c.id, e.target.value)} className="text-xs sm:text-sm font-semibold text-right h-9" />
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 w-6">dk</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-border/50 shadow-sm overflow-hidden border-blue-500/20">
        <CardContent className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Bilgi:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Bu ayarlar tüm fiyat hesaplamalarında kullanılır</li>
              <li>Değişiklikler yeni siparişleri etkiler</li>
              <li>Kar marjı çarpan olarak girilir (1.3 = %30 kar)</li>
              <li>Her ayarın yanındaki toggle ile açılıp kapatılabilir</li>
              <li>Kapalıyken eski değer görünür ancak fiyata yansımaz</li>
              <li>Yazıcı boyutları cm cinsinden girilmelidir</li>
              <li>ECF değerleri baskı öncesi hazırlık sürelerini kapsar</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
