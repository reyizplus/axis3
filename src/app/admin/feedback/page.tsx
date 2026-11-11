'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, CheckCircle2, Clock, AlertCircle, XCircle, Search, RefreshCw } from 'lucide-react';
import { feedbackService, type Feedback, type FeedbackStatus, type FeedbackCategory, type FeedbackPriority } from '@/lib/services/feedback-service';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug_report: 'Hata Bildirimi', feature_request: 'Özellik İsteği',
  ui_ux: 'Arayüz/Deneyim', performance: 'Performans',
  pricing: 'Fiyatlandırma', support: 'Destek', other: 'Diğer',
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  new: { label: 'Yeni', className: 'bg-blue-500/10 text-blue-600', icon: Clock },
  in_review: { label: 'İnceleniyor', className: 'bg-yellow-500/10 text-yellow-600', icon: Clock },
  planned: { label: 'Planlandı', className: 'bg-purple-500/10 text-purple-600', icon: CheckCircle2 },
  in_progress: { label: 'Geliştiriliyor', className: 'bg-indigo-500/10 text-indigo-600', icon: Clock },
  completed: { label: 'Tamamlandı', className: 'bg-green-500/10 text-green-600', icon: CheckCircle2 },
  rejected: { label: 'Reddedildi', className: 'bg-red-500/10 text-red-600', icon: XCircle },
  duplicate: { label: 'Tekrar', className: 'bg-gray-500/10 text-gray-600', icon: AlertCircle },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: 'Düşük', className: 'bg-gray-500/10 text-gray-600' },
  medium: { label: 'Orta', className: 'bg-blue-500/10 text-blue-600' },
  high: { label: 'Yüksek', className: 'bg-orange-500/10 text-orange-600' },
  critical: { label: 'Kritik', className: 'bg-red-500/10 text-red-600' },
};

const STAT_CARDS = [
  { key: 'total', label: 'Toplam', icon: MessageSquare, color: 'text-primary' },
  { key: 'new', label: 'Yeni', icon: Clock, color: 'text-blue-500' },
  { key: 'inProgress', label: 'İşlemde', icon: Clock, color: 'text-yellow-500' },
  { key: 'completed', label: 'Tamamlanan', icon: CheckCircle2, color: 'text-emerald-500' },
] as const;

export default function AdminFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<FeedbackStatus>('new');
  const [newPriority, setNewPriority] = useState<FeedbackPriority>('medium');
  const [adminResponse, setAdminResponse] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => { loadFeedback(); }, []);

  async function loadFeedback() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const result = await feedbackService.getAllFeedback();
      if (result.success && result.feedback) setFeedbackList(result.feedback);
      else toast.error('Geri bildirimler yüklenemedi');
    } catch { toast.error('Geri bildirimler yüklenemedi'); }
    finally { setLoading(false); }
  }

  const filtered = feedbackList.filter(f => {
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
    if (priorityFilter !== 'all' && f.priority !== priorityFilter) return false;
    if (search && !f.title.toLowerCase().includes(search.toLowerCase()) && !f.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function openDetail(feedback: Feedback) {
    setSelectedFeedback(feedback);
    setNewStatus(feedback.status);
    setNewPriority(feedback.priority);
    setAdminResponse(feedback.admin_response || '');
    setDialogOpen(true);
  }

  async function handleUpdate() {
    if (!selectedFeedback) return;
    setUpdating(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const result = await feedbackService.updateFeedbackStatus(selectedFeedback.id, newStatus, newPriority, adminResponse || undefined, user?.id);
      if (result.success) { toast.success('Geri bildirim güncellendi'); setDialogOpen(false); await loadFeedback(); }
      else toast.error(result.error || 'Güncelleme başarısız');
    } catch { toast.error('Beklenmeyen bir hata oluştu'); }
    finally { setUpdating(false); }
  }

  const stats = {
    total: feedbackList.length,
    new: feedbackList.filter(f => f.status === 'new').length,
    inProgress: feedbackList.filter(f => ['in_review', 'planned', 'in_progress'].includes(f.status)).length,
    completed: feedbackList.filter(f => f.status === 'completed').length,
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold gradient-text flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-primary" /> Geri Bildirim Yönetimi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Kullanıcı geri bildirimlerini görüntüleyin ve yönetin</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
          <Card key={key} className="border-border/50">
            <CardContent className="flex items-center gap-3 p-3 lg:p-4">
              <div className="p-2 rounded-lg bg-primary/5"><Icon className={`h-5 w-5 ${color}`} /></div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{label}</p>
                <p className="text-xl lg:text-2xl font-bold">{stats[key as keyof typeof stats]}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 mb-4">
        <CardContent className="p-3 lg:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 h-8 text-sm rounded-lg border border-input bg-background px-3" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Durum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([value, c]) => <SelectItem key={value} value={value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Öncelik" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {Object.entries(PRIORITY_CONFIG).map(([value, c]) => <SelectItem key={value} value={value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center py-12"><MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-4" /><p className="text-sm text-muted-foreground">Geri bildirim bulunamadı</p></CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(feedback => {
            const sc = STATUS_CONFIG[feedback.status];
            const pc = PRIORITY_CONFIG[feedback.priority];
            const StatusIcon = sc.icon;
            return (
              <Card key={feedback.id} className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer overflow-hidden" onClick={() => openDetail(feedback)}>
                <div className="p-3 lg:p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/5 shrink-0"><MessageSquare className="h-4 w-4 text-primary/70" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{feedback.title}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[feedback.category]}</Badge>
                            <Badge className={`${sc.className} border-0 text-[10px] gap-1`}><StatusIcon className="h-3 w-3" />{sc.label}</Badge>
                            <Badge className={`${pc.className} border-0 text-[10px]`}>{pc.label}</Badge>
                            {feedback.user ? (
                              <Link href={`/admin/users/${feedback.user.id}`} onClick={e => e.stopPropagation()} className="text-[10px] text-primary hover:underline">{feedback.user.full_name || feedback.user.email}</Link>
                            ) : feedback.contact_name ? (
                              <span className="text-[10px] text-muted-foreground">{feedback.contact_name}</span>
                            ) : null}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{new Date(feedback.created_at).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{feedback.description}</p>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Geri Bildirim Detayı</DialogTitle></DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-base">{selectedFeedback.title}</h3>
                {selectedFeedback.contact_name && (
                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 space-y-1 text-sm">
                    <p className="font-medium text-blue-700 dark:text-blue-400 text-xs">İletişim Formu</p>
                    <p className="text-xs"><strong>Ad:</strong> {selectedFeedback.contact_name}</p>
                    <p className="text-xs"><strong>Email:</strong> <a href={`mailto:${selectedFeedback.contact_email}`} className="text-primary hover:underline">{selectedFeedback.contact_email}</a></p>
                    <p className="text-xs"><strong>Telefon:</strong> <a href={`tel:${selectedFeedback.contact_phone}`} className="text-primary hover:underline">{selectedFeedback.contact_phone}</a></p>
                  </div>
                )}
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedFeedback.description}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[selectedFeedback.category]}</Badge>
                  {selectedFeedback.user && <Badge variant="secondary" className="text-[10px]">{selectedFeedback.user.email}</Badge>}
                  <span className="text-[10px] text-muted-foreground">{new Date(selectedFeedback.created_at).toLocaleString('tr-TR')}</span>
                </div>
              </div>
              {selectedFeedback.admin_response && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Admin Yanıtı:</p>
                  <p className="text-sm">{selectedFeedback.admin_response}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Durum</Label>
                  <Select value={newStatus} onValueChange={v => setNewStatus(v as FeedbackStatus)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([value, c]) => <SelectItem key={value} value={value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Öncelik</Label>
                  <Select value={newPriority} onValueChange={v => setNewPriority(v as FeedbackPriority)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_CONFIG).map(([value, c]) => <SelectItem key={value} value={value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Yanıtınız</Label>
                <textarea value={adminResponse} onChange={e => setAdminResponse(e.target.value)} placeholder="Kullanıcıya yanıt yazın..." rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleUpdate} disabled={updating} className="flex-1 h-9">{updating ? 'Güncelleniyor...' : 'Güncelle'}</Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-9">İptal</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
