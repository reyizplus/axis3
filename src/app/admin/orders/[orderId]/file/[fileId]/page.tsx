'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Box,
  Ruler,
  Package,
  Loader2,
  Layers,
  Download,
  Maximize2,
  Ruler as RulerIcon,
  Cuboid,
  Triangle,
  Weight,
} from 'lucide-react';

const ModelViewer = dynamic(
  () => import('@/components/upload/ModelViewer').then(m => m.ModelViewer),
  {
    ssr: false,
      loading: () => (
        <div className="h-[250px] sm:h-[600px] flex items-center justify-center bg-muted/30 rounded-xl">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ),
  }
);

interface FileDetails {
  id: string; filename: string; original_filename: string; storage_path: string;
  volume_cm3: number; surface_area_cm2: number;
  bounding_box_x: number; bounding_box_y: number; bounding_box_z: number;
  triangle_count: number;
}

interface OrderItem {
  id: string; filename: string; material_name: string;
  print_setting_name: string; quantity: number; unit_price: number;
  subtotal: number; color?: string;
}

export default function AdminOrderFileDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const fileId = params.fileId as string;

  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<FileDetails | null>(null);
  const [item, setItem] = useState<OrderItem | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [modelUrl, setModelUrl] = useState('');
  const [downloading, setDownloading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: isAdmin } = await supabase.rpc('is_admin');
        if (!mountedRef.current) return;
        if (!isAdmin) { toast.error('Yetkisiz'); router.push('/dashboard'); return; }

        const { data: order } = await (supabase.from('orders').select('order_number') as any).eq('id', orderId).maybeSingle();
        if (!mountedRef.current) return;
        if (!order) { toast.error('Sipariş bulunamadı'); router.push('/admin/orders'); return; }
        if (!mountedRef.current) return;
        setOrderNumber(order.order_number);

        const { data: itemData } = await (supabase.from('order_items').select('*') as any)
          .eq('order_id', orderId).eq('file_id', fileId).maybeSingle();
        if (!mountedRef.current) return;
        if (!itemData) { toast.error('Kalem bulunamadı'); router.push('/admin/orders'); return; }
        if (!mountedRef.current) return;
        setItem(itemData);

        const { data: fileData } = await (supabase.from('files').select('*') as any).eq('id', fileId).maybeSingle();
        if (!mountedRef.current) return;
        if (!fileData) { toast.error('Dosya bulunamadı'); router.push('/admin/orders'); return; }
        if (!mountedRef.current) return;
        setFile(fileData);

        const { data: urlData } = await supabase.storage.from('stl-files').createSignedUrl(fileData.storage_path, 3600);
        if (mountedRef.current && urlData?.signedUrl) setModelUrl(urlData.signedUrl);
      } catch { if (mountedRef.current) toast.error('Yükleme hatası'); } finally { if (mountedRef.current) setLoading(false); }
    };
    load();
    return () => { mountedRef.current = false; };
  }, [orderId, fileId]);

  const handleDownload = async () => {
    if (!file || !modelUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(modelUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename || file.filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('İndiriliyor...');
    } catch { toast.error('İndirme başarısız'); } finally { setDownloading(false); }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2"><Skeleton className="h-[250px] sm:h-[600px]" /></div>
          <div className="space-y-6"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
        </div>
      </div>
    );
  }

  if (!file || !item) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-1">Dosya Bulunamadı</p>
            <p className="text-sm text-muted-foreground mb-6">İstenen dosya detayları yüklenemedi</p>
            <Button asChild><Link href="/admin/orders">Siparişlere Dön</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href={`/admin/orders/${orderId}`}><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Dosya Detayı</h1>
            <p className="text-sm text-muted-foreground truncate">Sipariş #{orderNumber} • {file.original_filename}</p>
          </div>
        </div>
        <Button onClick={handleDownload} disabled={downloading} variant="outline" className="gap-2 shrink-0">
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          STL İndir
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 3D Viewer */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                3D Model
              </CardTitle>
              <CardDescription className="text-xs">{file.original_filename}</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              {modelUrl ? (
                <div className="h-[250px] sm:h-[600px]">
                  <ModelViewer url={modelUrl} color={item.color || 'Natural'} />
                </div>
              ) : (
                <div className="h-[250px] sm:h-[600px] flex items-center justify-center bg-muted/20 rounded-xl">
                  <p className="text-sm text-muted-foreground">Model yüklenemedi</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Model Specs */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <RulerIcon className="h-4 w-4 text-primary" />
                Model Özellikleri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Boyutlar (mm)</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'X', value: file.bounding_box_x },
                    { label: 'Y', value: file.bounding_box_y },
                    { label: 'Z', value: file.bounding_box_z },
                  ].map(d => (
                    <div key={d.label} className="text-center p-2.5 rounded-xl bg-muted/20">
                      <p className="text-xs text-muted-foreground">{d.label}</p>
                      <p className="text-sm font-semibold font-mono">{d.value.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-xl bg-muted/20">
                  <Cuboid className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Hacim</p>
                  <p className="text-base font-bold text-primary">{file.volume_cm3.toFixed(2)} <span className="text-xs font-normal">cm³</span></p>
                </div>
                <div className="text-center p-3 rounded-xl bg-muted/20">
                  <Maximize2 className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Yüzey</p>
                  <p className="text-base font-bold text-primary">{file.surface_area_cm2.toFixed(2)} <span className="text-xs font-normal">cm²</span></p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                <div className="flex items-center gap-2">
                  <Triangle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Üçgen Sayısı</span>
                </div>
                <span className="text-sm font-semibold">{file.triangle_count.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Print Settings */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Baskı Ayarları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                <span className="text-xs text-muted-foreground">Malzeme</span>
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs font-normal">
                  {item.material_name}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                <span className="text-xs text-muted-foreground">Kalite</span>
                <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs font-normal">
                  {item.print_setting_name}
                </Badge>
              </div>
              {item.color && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                  <span className="text-xs text-muted-foreground">Renk</span>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs font-normal">
                    {item.color}
                  </Badge>
                </div>
              )}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                <span className="text-xs text-muted-foreground">Adet</span>
                <span className="text-sm font-semibold">{item.quantity}</span>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card className="border-border/50 shadow-sm overflow-hidden border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Maximize2 className="h-4 w-4 text-primary" />
                Fiyatlandırma
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                <span className="text-xs text-muted-foreground">Birim Fiyat</span>
                <span className="text-sm font-semibold">₺{item.unit_price.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                <span className="text-xs text-muted-foreground">Adet</span>
                <span className="text-sm font-semibold">×{item.quantity}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between font-bold">
                <span className="text-sm">Toplam</span>
                <span className="text-lg text-primary">₺{item.subtotal.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
