'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Eye, Upload, X, Image as ImageIcon, FileText, FolderOpen, Loader2 } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { adminServiceClient, type BlogPost, type BlogCategory } from '@/lib/services/admin-service-client';

const TiptapEditor = dynamic(() => import('@/components/blog/TiptapEditor').then(m => m.TiptapEditor), { ssr: false });
import { toast } from 'sonner';
import Image from 'next/image';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  published: { label: 'Yayında', variant: 'default' },
  draft: { label: 'Taslak', variant: 'secondary' },
  archived: { label: 'Arşiv', variant: 'destructive' },
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('posts');
  const [postContent, setPostContent] = useState('');
  const [featuredImageUploading, setFeaturedImageUploading] = useState(false);
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string | null>(null);
  const featuredInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);

  const handleFeaturedImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Lütfen geçerli bir görsel dosyası seçin.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Görsel boyutu 5MB\'dan küçük olmalıdır.'); return; }
    setFeaturedImageUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload/image', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      setFeaturedImagePreview(url);
    } catch {
      toast.error('Görsel yüklenemedi');
    } finally {
      setFeaturedImageUploading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadPosts(), loadCategories()]).finally(() => setLoading(false));
  }, []);

  async function loadPosts() {
    try { setPosts(await adminServiceClient.getBlogPosts()); }
    catch { toast.error('Blog yazıları yüklenemedi'); }
  }

  async function loadCategories() {
    try { setCategories(await adminServiceClient.getBlogCategories(true)); }
    catch { toast.error('Kategoriler yüklenemedi'); }
  }

  function openCreatePostDialog() {
    setEditingPost(null);
    setPostContent('');
    setFeaturedImagePreview(null);
    setIsPostDialogOpen(true);
  }

  function openEditPostDialog(post: BlogPost) {
    setEditingPost(post);
    setPostContent(post.content);
    setFeaturedImagePreview(post.featured_image);
    setIsPostDialogOpen(true);
  }

  async function handleSavePost(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const postData = {
          title: formData.get('title') as string,
          slug: formData.get('slug') as string,
          excerpt: formData.get('excerpt') as string || null,
          content: postContent,
          category_id: formData.get('category_id') as string || null,
          featured_image: featuredImagePreview || null,
          meta_title: formData.get('meta_title') as string || null,
          meta_description: formData.get('meta_description') as string || null,
          meta_keywords: formData.get('meta_keywords') as string || null,
          status: formData.get('status') as 'draft' | 'published' | 'archived',
          published_at: formData.get('status') === 'published' ? new Date().toISOString() : null,
        };
        if (editingPost) {
          await adminServiceClient.updateBlogPost(editingPost.id, postData);
          toast.success('Güncellendi');
        } else {
          await adminServiceClient.createBlogPost(postData as any);
          toast.success('Eklendi');
        }
        setIsPostDialogOpen(false);
        setEditingPost(null);
        setPostContent('');
        await loadPosts();
      } catch (err) {
        toast.error('Hata: ' + (err as Error).message);
      }
    });
  }

  async function handleSaveCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const catData = {
          name: formData.get('name') as string,
          slug: formData.get('slug') as string,
          description: formData.get('description') as string || null,
          sort_order: parseInt(formData.get('sort_order') as string) || 0,
          is_active: formData.get('is_active') === 'true',
        };
        if (editingCategory) {
          await adminServiceClient.updateBlogCategory(editingCategory.id, catData);
          toast.success('Güncellendi');
        } else {
          await adminServiceClient.createBlogCategory(catData as any);
          toast.success('Eklendi');
        }
        setIsCategoryDialogOpen(false);
        setEditingCategory(null);
        await loadCategories();
      } catch (err) {
        toast.error('Hata: ' + (err as Error).message);
      }
    });
  }

  async function handleDeletePost(id: string) {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    startTransition(async () => {
      try { await adminServiceClient.deleteBlogPost(id); await loadPosts(); toast.success('Silindi'); }
      catch (err) { toast.error('Hata: ' + (err as Error).message); }
    });
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    startTransition(async () => {
      try { await adminServiceClient.deleteBlogCategory(id); await loadCategories(); toast.success('Silindi'); }
      catch (err) { toast.error('Hata: ' + (err as Error).message); }
    });
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="flex items-center justify-center h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold gradient-text flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" /> Blog Yönetimi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Blog yazılarını ve kategorileri yönetin</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="bg-muted/50 p-0.5">
          <TabsTrigger value="posts" className="rounded-md gap-1.5"><FileText className="h-4 w-4" /> Blog Yazıları</TabsTrigger>
          <TabsTrigger value="categories" className="rounded-md gap-1.5"><FolderOpen className="h-4 w-4" /> Kategoriler</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4 mt-0">
          <div className="flex justify-end">
            <Button onClick={openCreatePostDialog} size="sm" className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Yeni Yazı
            </Button>
          </div>

          {posts.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-sm text-muted-foreground mb-4">Henüz blog yazısı yok</p>
                <Button size="sm" onClick={openCreatePostDialog}>
                  <Plus className="mr-2 h-4 w-4" /> İlk Yazıyı Oluştur
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {posts.map(post => {
                const sc = STATUS_CONFIG[post.status];
                return (
                  <Card key={post.id} className="border-border/50 overflow-hidden">
                    <div className="p-3 lg:p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/5 shrink-0">
                          <FileText className="h-4 w-4 text-primary/70" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{post.title}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                                <Badge variant={sc.variant} className="text-[10px]">{sc.label}</Badge>
                                <span>{new Date(post.created_at).toLocaleDateString('tr-TR')}</span>
                                {post.view_count > 0 && (
                                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.view_count}</span>
                                )}
                                {post.category_id && (() => {
                                  const cat = categories.find(c => c.id === post.category_id);
                                  return cat ? <Badge variant="outline" className="text-[10px]">{cat.name}</Badge> : null;
                                })()}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {post.status === 'published' && (
                                <Link href={`/blog/${post.slug}`} target="_blank">
                                  <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                                </Link>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditPostDialog(post)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeletePost(post.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          {post.excerpt && (
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{post.excerpt}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4 mt-0">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingCategory(null); setIsCategoryDialogOpen(true); }} size="sm" className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Yeni Kategori
            </Button>
          </div>

          {categories.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-sm text-muted-foreground mb-4">Henüz kategori yok</p>
                <Button size="sm" onClick={() => { setEditingCategory(null); setIsCategoryDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> İlk Kategoriyi Oluştur
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {categories.map(category => (
                <Card key={category.id} className="border-border/50 overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base truncate">{category.name}</CardTitle>
                        {category.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{category.description}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={category.is_active ? 'default' : 'secondary'} className="text-[10px]">
                            {category.is_active ? 'Aktif' : 'Pasif'}
                          </Badge>
                          {category.sort_order > 0 && <span className="text-[10px] text-muted-foreground">Sıra: {category.sort_order}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingCategory(category); setIsCategoryDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCategory(category.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <BlogPostDialog
        open={isPostDialogOpen}
        onOpenChange={setIsPostDialogOpen}
        editingPost={editingPost}
        postContent={postContent}
        setPostContent={setPostContent}
        featuredImagePreview={featuredImagePreview}
        setFeaturedImagePreview={setFeaturedImagePreview}
        featuredImageUploading={featuredImageUploading}
        featuredInputRef={featuredInputRef}
        handleFeaturedImageUpload={handleFeaturedImageUpload}
        handleSavePost={handleSavePost}
        categories={categories}
        isPending={isPending}
      />

      <CategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        editingCategory={editingCategory}
        handleSaveCategory={handleSaveCategory}
        isPending={isPending}
      />
    </div>
  );
}

function BlogPostDialog({
  open, onOpenChange, editingPost, postContent, setPostContent,
  featuredImagePreview, setFeaturedImagePreview, featuredImageUploading,
  featuredInputRef, handleFeaturedImageUpload, handleSavePost, categories, isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPost: BlogPost | null;
  postContent: string;
  setPostContent: (v: string) => void;
  featuredImagePreview: string | null;
  setFeaturedImagePreview: (v: string | null) => void;
  featuredImageUploading: boolean;
  featuredInputRef: React.RefObject<HTMLInputElement | null>;
  handleFeaturedImageUpload: (file: File) => Promise<void>;
  handleSavePost: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  categories: BlogCategory[];
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editingPost ? 'Blog Yazısını Düzenle' : 'Yeni Blog Yazısı'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSavePost} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Başlık *</Label>
              <Input name="title" defaultValue={editingPost?.title} required className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Slug *</Label>
              <Input name="slug" defaultValue={editingPost?.slug} placeholder="blog-yazisi-basligi" required className="h-9 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Kategori</Label>
              <Select name="category_id" defaultValue={editingPost?.category_id || undefined}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Kategori seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kategori Seçin</SelectItem>
                  {categories.filter(c => c.is_active).map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Durum *</Label>
              <Select name="status" defaultValue={editingPost?.status || 'draft'}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Taslak</SelectItem>
                  <SelectItem value="published">Yayında</SelectItem>
                  <SelectItem value="archived">Arşiv</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Özet</Label>
            <textarea name="excerpt" defaultValue={editingPost?.excerpt || ''} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Kısa özet..." />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">İçerik *</Label>
            <TiptapEditor key={editingPost?.id || 'new'} content={postContent} onChange={setPostContent} placeholder="Blog içeriğinizi buraya yazın..." />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Öne Çıkan Görsel</Label>
            <input type="hidden" name="featured_image" value={featuredImagePreview || ''} />
            <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => featuredInputRef.current?.click()}>
              {featuredImagePreview ? (
                <div className="relative inline-block max-w-full">
                  <Image src={featuredImagePreview} alt="Featured" width={400} height={200} className="object-cover max-h-48 rounded-lg" />
                  <button type="button" className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1" onClick={(e) => { e.stopPropagation(); setFeaturedImagePreview(null); }}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-xs">Öne çıkan görsel eklemek için tıklayın</p>
                  <p className="text-[10px] mt-1">PNG, JPG, WEBP - Max 5MB</p>
                </div>
              )}
            </div>
            <input ref={featuredInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFeaturedImageUpload(file); e.target.value = ''; }} />
            {featuredImageUploading && <p className="text-xs text-muted-foreground">Yükleniyor...</p>}
          </div>

          <details className="border rounded-lg p-3">
            <summary className="cursor-pointer text-sm font-medium">SEO Ayarları</summary>
            <div className="space-y-3 mt-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Meta Başlık</Label>
                <Input name="meta_title" defaultValue={editingPost?.meta_title || ''} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Meta Açıklama</Label>
                <textarea name="meta_description" defaultValue={editingPost?.meta_description || ''} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Meta Anahtar Kelimeler</Label>
                <Input name="meta_keywords" defaultValue={editingPost?.meta_keywords || ''} placeholder="anahtar, kelime, liste" className="h-9 text-sm" />
              </div>
            </div>
          </details>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1 h-9">{isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Kaydet</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">İptal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialog({ open, onOpenChange, editingCategory, handleSaveCategory, isPending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCategory: BlogCategory | null;
  handleSaveCategory: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editingCategory ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Kategori Adı *</Label>
            <Input name="name" defaultValue={editingCategory?.name} required className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Slug *</Label>
            <Input name="slug" defaultValue={editingCategory?.slug} placeholder="kategori-adi" required className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Açıklama</Label>
            <textarea name="description" defaultValue={editingCategory?.description || ''} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Sıralama</Label>
              <Input name="sort_order" type="number" defaultValue={editingCategory?.sort_order || 0} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Durum</Label>
              <Select name="is_active" defaultValue={editingCategory?.is_active ? 'true' : 'false'}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Aktif</SelectItem>
                  <SelectItem value="false">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1 h-9">{isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Kaydet</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">İptal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
