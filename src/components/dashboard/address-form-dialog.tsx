'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AddressFormData } from '@/lib/services/address-service';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (data: AddressFormData, existingId?: string) => Promise<void>;
  initial?: AddressFormData;
  existingId?: string;
}

const TITLE_OPTIONS = ['Ev', 'Is', 'Diger'];

export function AddressFormDialog({ open, onOpenChange, onSave, initial, existingId }: Props) {
  const [title, setTitle] = useState(initial?.title || '');
  const [customTitle, setCustomTitle] = useState('');
  const [fullName, setFullName] = useState(initial?.full_name || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [city, setCity] = useState(initial?.city || '');
  const [district, setDistrict] = useState(initial?.district || '');
  const [neighborhood, setNeighborhood] = useState(initial?.neighborhood || '');
  const [street, setStreet] = useState(initial?.street || '');
  const [buildingNo, setBuildingNo] = useState(initial?.building_no || '');
  const [apartmentNo, setApartmentNo] = useState(initial?.apartment_no || '');
  const [zipCode, setZipCode] = useState(initial?.zip_code || '');
  const [isDefault, setIsDefault] = useState(initial?.is_default || false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const wasOpenRef = useRef(false);

  /**
   * Form alanları `initial` ile yalnızca ilk render'da dolduruluyordu; bileşen
   * diyalog kapalıyken de mount kaldığı için "Adresi Düzenle" her zaman boş
   * açılıyordu. Her açılışta formu gelen adresle (yeni adreste boş) yeniden doldur.
   */
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const presetTitle = initial?.title ?? '';
      const isPresetTitle = TITLE_OPTIONS.includes(presetTitle);

      setTitle(presetTitle ? (isPresetTitle ? presetTitle : 'Diger') : '');
      setCustomTitle(presetTitle && !isPresetTitle ? presetTitle : '');
      setFullName(initial?.full_name ?? '');
      setPhone(initial?.phone ?? '');
      setCity(initial?.city ?? '');
      setDistrict(initial?.district ?? '');
      setNeighborhood(initial?.neighborhood ?? '');
      setStreet(initial?.street ?? '');
      setBuildingNo(initial?.building_no ?? '');
      setApartmentNo(initial?.apartment_no ?? '');
      setZipCode(initial?.zip_code ?? '');
      setIsDefault(initial?.is_default ?? false);
      setErrors({});
    }

    wasOpenRef.current = open;
  }, [open, initial]);

  const reset = () => {
    setTitle('');
    setCustomTitle('');
    setFullName('');
    setPhone('');
    setCity('');
    setDistrict('');
    setNeighborhood('');
    setStreet('');
    setBuildingNo('');
    setApartmentNo('');
    setZipCode('');
    setIsDefault(false);
    setErrors({});
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const resolvedTitle = title === 'Diger' ? customTitle : title;
    if (!resolvedTitle) e.title = 'Zorunlu';
    if (!fullName) e.fullName = 'Zorunlu';
    if (!phone) e.phone = 'Zorunlu';
    if (!city) e.city = 'Zorunlu';
    if (!district) e.district = 'Zorunlu';
    if (!neighborhood) e.neighborhood = 'Zorunlu';
    if (!street) e.street = 'Zorunlu';
    if (!buildingNo) e.buildingNo = 'Zorunlu';
    if (!zipCode) e.zipCode = 'Zorunlu';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const resolvedTitle = title === 'Diger' ? customTitle : title;
      await onSave({
        title: resolvedTitle,
        full_name: fullName,
        phone,
        city,
        district,
        neighborhood,
        street,
        building_no: buildingNo,
        apartment_no: apartmentNo,
        zip_code: zipCode,
        is_default: isDefault,
      }, existingId);
      toast.success(existingId ? 'Adres guncellendi' : 'Adres kaydedildi');
      handleOpenChange(false);
    } catch {
      toast.error('Bir hata olustu');
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = (name: string) =>
    `h-9 text-sm ${errors[name] ? 'border-red-500' : ''}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingId ? 'Adresi Duzenle' : 'Yeni Adres Ekle'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-xs">Adres Basligi</Label>
            <div className="flex gap-2">
              {TITLE_OPTIONS.map(t => (
                <Button
                  key={t}
                  type="button"
                  variant={title === t ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTitle(t)}
                  className="h-8 text-xs flex-1"
                >
                  {t}
                </Button>
              ))}
            </div>
            {title === 'Diger' && (
              <Input
                placeholder="Baslik girin"
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                className={fieldClass('title')}
              />
            )}
            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Ad Soyad</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} className={fieldClass('fullName')} />
              {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Telefon</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} className={fieldClass('phone')} />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Il</Label>
              <Input value={city} onChange={e => setCity(e.target.value)} className={fieldClass('city')} />
              {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ilce</Label>
              <Input value={district} onChange={e => setDistrict(e.target.value)} className={fieldClass('district')} />
              {errors.district && <p className="text-xs text-red-500">{errors.district}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Mahalle</Label>
            <Input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className={fieldClass('neighborhood')} />
            {errors.neighborhood && <p className="text-xs text-red-500">{errors.neighborhood}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label className="text-xs">Cadde/Sokak</Label>
              <Input value={street} onChange={e => setStreet(e.target.value)} className={fieldClass('street')} />
              {errors.street && <p className="text-xs text-red-500">{errors.street}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bina No</Label>
              <Input value={buildingNo} onChange={e => setBuildingNo(e.target.value)} className={fieldClass('buildingNo')} />
              {errors.buildingNo && <p className="text-xs text-red-500">{errors.buildingNo}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Daire No</Label>
              <Input value={apartmentNo} onChange={e => setApartmentNo(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Posta Kodu</Label>
            <Input value={zipCode} onChange={e => setZipCode(e.target.value)} className={fieldClass('zipCode')} />
            {errors.zipCode && <p className="text-xs text-red-500">{errors.zipCode}</p>}
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={isDefault} onCheckedChange={setIsDefault} id="isDefault" />
            <Label htmlFor="isDefault" className="text-xs cursor-pointer">Varsayilan adresim olsun</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)} disabled={saving}>Iptal</Button>
            <Button size="sm" onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {existingId ? 'Guncelle' : 'Kaydet'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
