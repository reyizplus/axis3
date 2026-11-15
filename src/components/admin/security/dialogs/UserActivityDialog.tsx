'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, List, RefreshCw, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { type UserActivityEntry, DEVICE_ICONS } from '../types';
import { fmtDT } from '../utils';

export function UserActivityDialog({ userId, userName, email, open, onOpenChange }: {
  userId: string; userName: string; email: string; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const [entries, setEntries] = useState<UserActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const limit = 50;

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/security/user-activity?user_id=${encodeURIComponent(userId)}&page=${page}&limit=${limit}`);
      if (res.ok) {
        const json = await res.json();
        setEntries(json.data || []);
        setTotal(json.pagination?.total || 0);
        setTotalPages(json.pagination?.totalPages || 0);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [userId, page]);

  useEffect(() => { if (open) { setPage(1); fetchData(); } }, [open, userId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) fetchData(); }, [fetchData, open]);

  // Liste yeniden eskiye sıralı: en yeni kayıt en üstte. Açılışta/sayfa
  // değişiminde en yeni kayda (üste) kaydır.
  useEffect(() => {
    if (loading) return;
    const el = scrollRef.current;
    if (!el) return;
    const frame = requestAnimationFrame(() => { el.scrollTop = 0; });
    return () => cancelAnimationFrame(frame);
  }, [entries, loading]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Kullanıcı Aktivite Geçmişi: <span className="text-sm font-mono">{email || userName}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs gap-1"><List className="h-3 w-3" />{total} kayıt</Badge>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-7 gap-1 text-xs">
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Yenile
            </Button>
          </div>
          <Card className="border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[660px]">
                <div className="grid grid-cols-[140px_minmax(0,1.6fr)_120px_90px] gap-2 px-3 py-2 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span>Zaman</span><span>Sayfa</span><span>IP</span><span>Cihaz</span>
                </div>
                <div ref={scrollRef} className="divide-y max-h-[400px] overflow-y-auto">
                  {loading ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-[140px_minmax(0,1.6fr)_120px_90px] gap-2 px-3 py-2">
                      {[1,2,3].map(j => <div key={j} className="h-4 bg-muted/50 rounded animate-pulse" />)}
                    </div>
                  )) : entries.length === 0 ? (
                    <div className="px-3 py-8 text-center text-muted-foreground text-sm">Bu kullanıcı için aktivite kaydı bulunamadı.</div>
                  ) : entries.map(entry => {
                    const DeviceIcon = entry.device_type ? DEVICE_ICONS[entry.device_type] || Globe : Globe;
                    return (
                      <div key={entry.id} className="grid grid-cols-[140px_minmax(0,1.6fr)_120px_90px] gap-2 px-3 py-2 hover:bg-accent/30 transition-colors items-center text-xs">
                        <span className="text-muted-foreground whitespace-nowrap">{fmtDT(entry.created_at)}</span>
                        <span className="truncate font-mono">{entry.page_url}</span>
                        <span className="font-mono truncate text-muted-foreground">{entry.ip_address}</span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <DeviceIcon className="h-3 w-3" /><span className="capitalize">{entry.device_type}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Sayfa {page} / {totalPages}</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7 w-7 p-0"><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-7 w-7 p-0"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
