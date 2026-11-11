'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare, Plus, Loader2, CheckCircle2, Clock, AlertCircle, XCircle, MessageCircle, Star, Send, ArrowUpRight,
} from 'lucide-react';
import { feedbackService, type Feedback, type FeedbackCategory, type FeedbackStatus } from '@/lib/services/feedback-service';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const categoryLabels: Record<FeedbackCategory, string> = {
  bug_report: 'Hata Bildirimi',
  feature_request: 'Özellik İsteği',
  ui_ux: 'Arayüz/Deneyim',
  performance: 'Performans',
  pricing: 'Fiyatlandırma',
  support: 'Destek',
  other: 'Diğer',
};

const categoryIcons: Record<FeedbackCategory, typeof MessageSquare> = {
  bug_report: AlertCircle,
  feature_request: Star,
  ui_ux: MessageSquare,
  performance: Clock,
  pricing: ArrowUpRight,
  support: MessageCircle,
  other: MessageSquare,
};

const statusConfig: Record<FeedbackStatus, { label: string; color: string; icon: typeof Clock }> = {
  new: { label: 'Yeni', color: 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400', icon: Clock },
  in_review: { label: 'İnceleniyor', color: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400', icon: Clock },
  planned: { label: 'Planlandı', color: 'border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400', icon: CheckCircle2 },
  in_progress: { label: 'Geliştiriliyor', color: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', icon: Clock },
  completed: { label: 'Tamamlandı', color: 'border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400', icon: CheckCircle2 },
  rejected: { label: 'Reddedildi', color: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400', icon: XCircle },
  duplicate: { label: 'Tekrar', color: 'border-gray-500/20 bg-gray-500/10 text-gray-600 dark:text-gray-400', icon: AlertCircle },
};

const container = { animate: { transition: { staggerChildren: 0.06 } } };
const itemAnim = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function FeedbackPage() {
  const pathname = usePathname();
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [category, setCategory] = useState<FeedbackCategory>('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => { loadFeedback(); }, []);

  async function loadFeedback() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const result = await feedbackService.getUserFeedback(user.id);
      if (result.success && result.feedback) setFeedbackList(result.feedback);
    } catch { toast.error('Geri bildirimler yüklenemedi'); }
    finally { setIsLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Oturum açmanız gerekiyor'); return; }
      const result = await feedbackService.createFeedback({ userId: user.id, category, title, description, pageUrl: pathname });
      if (result.success) {
        toast.success('Geri bildiriminiz gönderildi');
        setIsDialogOpen(false);
        setTitle(''); setDescription(''); setCategory('other');
        await loadFeedback();
      } else toast.error(result.error || 'Gönderim başarısız');
    } catch { toast.error('Beklenmeyen bir hata oluştu'); }
    finally { setIsSubmitting(false); }
  }

  const responded = feedbackList.filter(f => f.admin_response).length;
  const completed = feedbackList.filter(f => f.status === 'completed').length;

  const stats = [
    { icon: MessageSquare, label: 'Toplam Geri Bildirim', value: String(feedbackList.length), suffix: 'adet' },
    { icon: MessageCircle, label: 'Yanıtlanan', value: String(responded), suffix: 'adet' },
    { icon: CheckCircle2, label: 'Tamamlanan', value: String(completed), suffix: 'adet' },
  ];

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="space-y-8">
          <Skeleton className="h-36 rounded-2xl" />
          <div className="grid gap-4 grid-cols-3"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /></div>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <motion.div variants={container} initial="initial" animate="animate" className="space-y-8">

        {/* Hero */}
        <motion.div variants={itemAnim} className="relative overflow-hidden rounded-2xl border-2 border-border bg-gradient-to-br from-primary/5 via-background to-primary/5 p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="gap-1.5 border-primary/20 bg-primary/10 px-3 py-1">
                  <MessageSquare className="h-3 w-3 text-primary" />
                  Geri Bildirim
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Geri Bildirim</h1>
              <p className="mt-1 text-sm text-muted-foreground">Görüşlerinizi bizimle paylaşın, ürünü birlikte geliştirelim</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="h-12 gap-2 rounded-xl px-6 shadow-lg shadow-primary/25">
                  <Plus className="h-5 w-5" />Yeni Geri Bildirim
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Yeni Geri Bildirim
                  </DialogTitle>
                  <DialogDescription>
                    Hata bildirimi, özellik isteği veya görüşlerinizi paylaşın
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategori</Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as FeedbackCategory)}>
                      <SelectTrigger className="border-2 border-border/60 bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Başlık</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Kısa ve açıklayıcı bir başlık"
                      required
                      minLength={5}
                      className="border-2 border-border/60 bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Açıklama</Label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detaylı açıklama..."
                      required
                      minLength={20}
                      rows={6}
                      className="w-full rounded-xl border-2 border-border/60 bg-background/50 backdrop-blur-sm px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" className="h-11 rounded-xl px-6" onClick={() => setIsDialogOpen(false)}>
                      İptal
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="h-11 rounded-xl px-6 gap-2">
                      {isSubmitting ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Gönderiliyor...</>
                      ) : (
                        <><Send className="h-4 w-4" /> Gönder</>
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemAnim} className="grid gap-4 grid-cols-3">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="relative overflow-hidden rounded-2xl border-2 border-border/60 bg-card/50 backdrop-blur-sm p-5">
                <div className="absolute right-0 top-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-primary/5" />
                <div className="relative">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Icon className="h-3.5 w-3.5 text-primary" /> {s.label}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tracking-tight">{s.value}</span>
                    <span className="text-xs text-muted-foreground">{s.suffix}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Feedback List */}
        {feedbackList.length === 0 ? (
          <motion.div variants={itemAnim}>
            <Card className="relative overflow-hidden border-2 border-dashed border-border/60 bg-card/30 backdrop-blur-sm">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.03),transparent_70%)]" />
              <CardContent className="relative flex flex-col items-center justify-center py-16">
                <div className="relative mb-6">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 blur-2xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10">
                    <MessageSquare className="h-9 w-9 text-primary/60" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-1">Henüz Geri Bildiriminiz Yok</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">
                  Görüşleriniz bizim için değerli. Hata bildirimi, özellik isteği veya önerilerinizi paylaşın.
                </p>
                <Button asChild size="lg" className="gap-2 rounded-xl shadow-lg shadow-primary/20" onClick={() => setIsDialogOpen(true)}>
                  <span><Plus className="h-5 w-5" />İlk Geri Bildirimi Gönder</span>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={itemAnim} className="space-y-4">
            {feedbackList.map((feedback, idx) => {
              const StatusIcon = statusConfig[feedback.status].icon;
              const CatIcon = categoryIcons[feedback.category];
              return (
                <motion.div
                  key={feedback.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative overflow-hidden rounded-2xl border-2 border-border/60 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="p-5 sm:p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/10 mt-0.5">
                          <CatIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base truncate group-hover:text-primary transition-colors">
                            {feedback.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(feedback.created_at).toLocaleDateString('tr-TR', {
                              year: 'numeric', month: 'long', day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="border-border/60 text-xs font-medium">
                          {categoryLabels[feedback.category]}
                        </Badge>
                        <Badge variant="secondary" className={cn('gap-1.5 border text-xs px-3 py-1 font-medium', statusConfig[feedback.status].color)}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusConfig[feedback.status].label}
                        </Badge>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {feedback.description}
                    </p>

                    {/* Admin Response */}
                    {feedback.admin_response && (
                      <div className="relative overflow-hidden rounded-xl border-2 border-primary/15 bg-gradient-to-br from-primary/5 to-primary/[0.02] p-4">
                        <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-primary/[0.04]" />
                        <div className="relative">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/15">
                              <MessageCircle className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="text-sm font-semibold">Ekibimizden Yanıt</span>
                          </div>
                          <p className="text-sm text-muted-foreground pl-8">{feedback.admin_response}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <div className="h-4" />
      </motion.div>
    </DashboardShell>
  );
}
