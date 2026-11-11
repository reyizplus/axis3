'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Layers, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { StoreCategory } from '@/lib/services/store-service';

export default function AdminStoreCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState<{ open: boolean; category?: StoreCategory }>({ open: false });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StoreCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [productCount, setProductCount] = useState<number | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/store/categories');
      if (res.status === 401) { router.push('/login'); return; }
      if (!res.ok) throw new Error('Failed to load');
      setCategories(await res.json());
    } catch {
      toast.error('Kategoriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  useEffect(() => {
    if (deleteTarget) {
      fetch(`/api/admin/store/products?category_id=${deleteTarget.id}&per_page=1`)
        .then(r => r.json()).then(d => setProductCount(d.total || 0)).catch(() => setProductCount(null));
    } else {
      setProductCount(null);
    }
  }, [deleteTarget]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const payload: Record<string, any> = {
      name: formData.get('name'), slug: formData.get('slug'),
      description: formData.get('description'), sort_order: Number(formData.get('sort_order')) || 0,
      parent_id: formData.get('parent_id') || null, is_active: formData.get('is_active') === 'true',
    };
    try {
      const isEdit = !!editDialog.category;
      if (isEdit) payload.id = editDialog.category!.id;
      const res = await fetch('/api/admin/store/categories', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Save failed'); }
      toast.success(isEdit ? 'Kategori güncellendi' : 'Kategori oluşturuldu');
      setEditDialog({ open: false });
      await loadCategories();
    } catch (err: any) { toast.error(err.message || 'Kaydetme başarısız'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/store/categories?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Kategori silindi');
      setDeleteTarget(null);
      await loadCategories();
    } catch { toast.error('Silme başarısız'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold gradient-text flex items-center gap-3">
          <Layers className="h-6 w-6 text-primary" /> Kategori Yönetimi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Mağaza kategorilerini yönetin</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{categories.length} kategori</p>
        <Button onClick={() => setEditDialog({ open: true })} size="sm" className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Yeni Kategori
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-3 lg:p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="text-sm">Henüz kategori eklenmemiş</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Layers className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{cat.name}</span>
                        {cat.is_active ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-600">Aktif</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-red-600">Pasif</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">/{cat.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-[10px]">Sıra: {cat.sort_order}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditDialog({ open: true, category: cat })}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(cat)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open })}>
        <DialogContent>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editDialog.category ? 'Kategori Düzenle' : 'Yeni Kategori'}</DialogTitle>
              <DialogDescription>{editDialog.category ? 'Kategori bilgilerini güncelleyin.' : 'Yeni bir kategori ekleyin.'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Kategori Adı</Label>
                <Input name="name" required defaultValue={editDialog.category?.name || ''} placeholder="3D Yazıcı Filamentleri" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Slug (URL)</Label>
                <Input name="slug" required defaultValue={editDialog.category?.slug || ''} placeholder="3d-yazici-filamentleri" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Açıklama</Label>
                <Input name="description" defaultValue={editDialog.category?.description || ''} placeholder="Kategori açıklaması (opsiyonel)" className="h-9 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Sıralama</Label>
                  <Input name="sort_order" type="number" defaultValue={editDialog.category?.sort_order || 0} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Durum</Label>
                  <Select name="is_active" defaultValue={editDialog.category?.is_active ? 'true' : 'false'}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Aktif</SelectItem>
                      <SelectItem value="false">Pasif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Üst Kategori (opsiyonel)</Label>
                <Select name="parent_id" defaultValue={editDialog.category?.parent_id || undefined}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="— Ana Kategori —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Ana Kategori —</SelectItem>
                    {categories.filter(c => c.id !== editDialog.category?.id).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialog({ open: false })} className="h-9">İptal</Button>
              <Button type="submit" disabled={saving} className="h-9">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editDialog.category ? 'Güncelle' : 'Oluştur'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategoriyi Sil</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name}</strong> kategorisini silmek istediğinize emin misiniz?
              {productCount !== null && productCount > 0 && (
                <p className="mt-2 text-destructive font-medium text-sm">
                  Bu kategoride {productCount} ürün bulunuyor. Kategori silinirse ürünler kategorisiz kalacak.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="h-9">İptal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="h-9">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
