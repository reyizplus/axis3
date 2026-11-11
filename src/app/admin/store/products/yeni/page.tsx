'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, ArrowLeft, Package, Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { StoreCategory } from '@/lib/services/store-service';
import Image from 'next/image';

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [mainImageUploading, setMainImageUploading] = useState(false);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/admin/store/categories').then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

  const [boolFields, setBoolFields] = useState({ track_stock: true, allow_backorder: false, is_active: true, is_featured: false });

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData(); formData.append('file', file);
    const res = await fetch('/api/upload/image', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Upload failed');
    return (await res.json()).url;
  };

  const handleMainImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Geçersiz dosya türü'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setMainImageUploading(true);
    try { setMainImagePreview(await uploadImage(file)); }
    catch { toast.error('Yükleme başarısız'); }
    finally { setMainImageUploading(false); }
  };

  const handleGalleryUpload = async (files: FileList) => {
    setGalleryUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024) urls.push(await uploadImage(file));
      }
      setGalleryImages(prev => [...prev, ...urls]);
    } catch { toast.error('Galeri yüklemesi başarısız'); }
    finally { setGalleryUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    let slug = formData.get('slug') as string;
    if (!slug) slug = (formData.get('name') as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const payload: Record<string, any> = {
      name: formData.get('name'), slug, category_id: formData.get('category_id') || null,
      description: formData.get('description') || null, short_description: formData.get('short_description') || null,
      price: parseFloat(formData.get('price') as string) || 0,
      compare_at_price: formData.get('compare_at_price') ? parseFloat(formData.get('compare_at_price') as string) : null,
      cost_price: formData.get('cost_price') ? parseFloat(formData.get('cost_price') as string) : null,
      stock_quantity: parseInt(formData.get('stock_quantity') as string) || 0,
      track_stock: boolFields.track_stock, allow_backorder: boolFields.allow_backorder,
      sku: formData.get('sku') || null, unit: formData.get('unit') || 'adet',
      weight_grams: formData.get('weight_grams') ? parseFloat(formData.get('weight_grams') as string) : null,
      main_image_url: mainImagePreview, is_active: boolFields.is_active, is_featured: boolFields.is_featured,
      sort_order: parseInt(formData.get('sort_order') as string) || 0,
    };
    try {
      const res = await fetch('/api/admin/store/products', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to create'); }
      const product = await res.json();
      if (galleryImages.length > 0) {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient() as any;
        await supabase.from('store_product_images').insert(galleryImages.map((url, i) => ({
          product_id: product.id, image_url: url, alt_text: product.name, sort_order: i, is_main: false,
        })));
      }
      toast.success('Ürün oluşturuldu');
      router.push(`/admin/store/products/${product.id}`);
    } catch (err: any) { toast.error(err.message || 'Oluşturma başarısız'); }
    finally { setSaving(false); }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/admin/store/products"><ArrowLeft className="mr-2 h-4 w-4" /> Ürünlere Dön</Link>
      </Button>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Package className="h-5 w-5 text-primary" /> Yeni Ürün</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Ürün Adı *</Label>
                <Input name="name" required placeholder="Ürün adı" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Slug (URL) *</Label>
                <Input name="slug" required placeholder="urun-adi" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Kategori</Label>
                <Select name="category_id">
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Kategori Seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Kategori Seçin —</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">SKU</Label>
                <Input name="sku" placeholder="STK-001" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Birim</Label>
                <Input name="unit" placeholder="adet" defaultValue="adet" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ağırlık (gram)</Label>
                <Input name="weight_grams" type="number" step="0.1" min="0" placeholder="0" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fiyat (TL) *</Label>
                <Input name="price" type="number" step="0.01" min="0" required placeholder="0.00" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">İndirimli Fiyat (TL)</Label>
                <Input name="compare_at_price" type="number" step="0.01" min="0" placeholder="0.00" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Maliyet Fiyatı (TL)</Label>
                <Input name="cost_price" type="number" step="0.01" min="0" placeholder="0.00" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Stok Adedi</Label>
                <Input name="stock_quantity" type="number" min="0" defaultValue="0" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sıralama</Label>
                <Input name="sort_order" type="number" defaultValue="0" className="h-9 text-sm" />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs">Ana Görsel</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => mainImageInputRef.current?.click()}>
                  {mainImagePreview ? (
                    <div className="relative inline-block">
                      <Image src={mainImagePreview} alt="Main" width={300} height={200} className="object-cover max-h-40 rounded-lg" />
                      <button type="button" className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1" onClick={(e) => { e.stopPropagation(); setMainImagePreview(null); }}><X className="h-3 w-3" /></button>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-xs">Ana görsel eklemek için tıklayın</p>
                      <p className="text-[10px] mt-1">PNG, JPG, WEBP - Max 5MB</p>
                    </div>
                  )}
                </div>
                <input ref={mainImageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleMainImageUpload(file); e.target.value = ''; }} />
                {mainImageUploading && <p className="text-xs text-muted-foreground">Yükleniyor...</p>}
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs">Galeri Görselleri (Opsiyonel)</Label>
                <div className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => galleryInputRef.current?.click()}>
                  <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Birden fazla görsel eklemek için tıklayın</p>
                </div>
                <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) handleGalleryUpload(e.target.files); e.target.value = ''; }} />
                {galleryUploading && <p className="text-xs text-muted-foreground">Yükleniyor...</p>}
                {galleryImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {galleryImages.map((url, i) => (
                      <div key={i} className="relative">
                        <Image src={url} alt={`Gallery ${i + 1}`} width={80} height={80} className="object-cover w-16 h-16 rounded-lg border" />
                        <button type="button" className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5" onClick={() => setGalleryImages(prev => prev.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Kısa Açıklama</Label>
              <Input name="short_description" placeholder="Ürün listesinde görünen kısa açıklama" className="h-9 text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Detaylı Açıklama</Label>
              <Textarea name="description" rows={4} className="text-sm" placeholder="Ürün detay açıklaması" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['track_stock', 'allow_backorder', 'is_active', 'is_featured'] as const).map(key => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={boolFields[key]} onCheckedChange={v => setBoolFields(p => ({ ...p, [key]: v }))} />
                  {key === 'track_stock' ? 'Stok Takibi' : key === 'allow_backorder' ? 'Stok Dışı Sipariş' : key === 'is_active' ? 'Aktif' : 'Öne Çıkan'}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" asChild className="h-9"><Link href="/admin/store/products">İptal</Link></Button>
              <Button type="submit" disabled={saving} className="h-9">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Ürünü Oluştur
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
