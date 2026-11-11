'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, Search, Plus, Loader2, AlertCircle, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { StoreProduct } from '@/lib/services/store-service';
import Image from 'next/image';

type AdminProduct = StoreProduct;

export default function AdminStoreProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const loadProducts = useCallback(async (p: number = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/store/products?page=${p}&per_page=50`);
      if (res.status === 401) { router.push('/login'); return; }
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setProducts(data.data || []);
      setPage(data.page || 1);
      setTotalPages(data.total_pages || 1);
      setTotalItems(data.total || 0);
    } catch {
      toast.error('Ürünler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadProducts(page); }, [loadProducts, page]);

  const filteredProducts = searchQuery
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())))
    : products;

  const handleDelete = async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/store/products/${deleteDialog.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Ürün silindi');
      setDeleteDialog(null);
      await loadProducts(page);
    } catch {
      toast.error('Silme başarısız');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold gradient-text flex items-center gap-3">
          <Package className="h-6 w-6 text-primary" /> Ürün Yönetimi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Mağaza ürünlerini yönetin</p>
      </div>

      <Card className="border-border/50 mb-4">
        <CardContent className="p-3 lg:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 max-w-xs w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Ürün adı veya SKU ile ara..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm w-full" />
            </div>
            <Button asChild size="sm" className="h-8 gap-1.5 shrink-0">
              <Link href="/admin/store/products/yeni"><Plus className="h-3.5 w-3.5" /> Yeni Ürün</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tüm Ürünler ({totalItems})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Ürün bulunamadı</p>
              <Button asChild className="mt-3" variant="outline" size="sm">
                <Link href="/admin/store/products/yeni">İlk ürünü ekleyin</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {filteredProducts.map(product => (
                  <div key={product.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0 relative">
                      {product.main_image_url ? (
                        <Image src={product.main_image_url} alt={product.name} fill className="object-cover !relative" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">{product.name}</p>
                        {product.is_active ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-600">Aktif</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-red-600">Pasif</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        {product.sku && <span>SKU: {product.sku}</span>}
                        {(product as any).category?.name && <span>{(product as any).category.name}</span>}
                        <span>Stok: {product.stock_quantity}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-primary whitespace-nowrap">{product.price.toFixed(2)} TL</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild><Link href={`/store/${product.slug}`} target="_blank"><Eye className="h-3.5 w-3.5" /></Link></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild><Link href={`/admin/store/products/${product.id}`}><svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></Link></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteDialog(product)}>
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-xs text-muted-foreground">Sayfa {page} / {totalPages} (toplam {totalItems} ürün)</p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                      <ChevronLeft className="h-3 w-3 mr-1" />Önceki
                    </Button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                      const p = start + i;
                      if (p > totalPages) return null;
                      return (
                        <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" className="h-7 min-w-[28px] text-xs" onClick={() => setPage(p)}>
                          {p}
                        </Button>
                      );
                    })}
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                      Sonraki<ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ürünü Sil</DialogTitle>
            <DialogDescription><strong>{deleteDialog?.name}</strong> ürününü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteDialog(null)} className="h-9">İptal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="h-9">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Sil
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
