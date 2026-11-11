'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Globe, List, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { type IpActivityEntry, DEVICE_ICONS } from '../types';
import { fmtDT } from '../utils';

export function IPActivityDialog({ ip, open, onOpenChange }: {
  ip: string; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const [entries, setEntries] = useState<IpActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const limit = 50;

  const fetchData = useCallback(async () => {
    if (!ip) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/security/ip-activity?ip=${encodeURIComponent(ip)}&page=${page}&limit=${limit}`);
      if (res.ok) {
        const json = await res.json();
        setEntries(json.data || []);
        setTotal(json.pagination?.total || 0);
        setTotalPages(json.pagination?.totalPages || 0);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [ip, page]);

  useEffect(() => { if (open) { setPage(1); fetchData(); } }, [open, ip]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) fetchData(); }, [fetchData, open]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [entries.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            IP Aktivite Geçmişi: <span className="font-mono text-sm">{ip}</span>
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
              <div className="min-w-[500px]">
                <div className="grid grid-cols-[90px_1fr_80px_60px] gap-2 px-3 py-2 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span>Zaman</span><span>Sayfa</span><span>Cihaz</span><span>Kullanıcı</span>
                </div>
                <div ref={scrollRef} className="divide-y max-h-[400px] overflow-y-auto">
                  {loading ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-[90px_1fr_80px_60px] gap-2 px-3 py-2">
                      {[1,2,3,4].map(j => <div key={j} className="h-4 bg-muted/50 rounded animate-pulse" />)}
                    </div>
                  )) : entries.length === 0 ? (
                    <div className="px-3 py-8 text-center text-muted-foreground text-sm">Bu IP için aktivite kaydı bulunamadı.</div>
                  ) : entries.map(entry => {
                    const DeviceIcon = entry.device_type ? DEVICE_ICONS[entry.device_type] || Globe : Globe;
                    return (
                      <div key={entry.id} className="grid grid-cols-[90px_1fr_80px_60px] gap-2 px-3 py-2 hover:bg-accent/30 transition-colors items-center text-xs">
                        <span className="text-muted-foreground whitespace-nowrap">{fmtDT(entry.created_at)}</span>
                        <span className="truncate font-mono">{entry.page_url}</span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <DeviceIcon className="h-3 w-3" /><span className="capitalize">{entry.device_type}</span>
                        </span>
                        <span className="truncate">
                          {entry.user ? (
                            <Link href={`/admin/users/${entry.user.id}`} className="text-primary hover:underline">{entry.user.email}</Link>
                          ) : <span className="text-muted-foreground">-</span>}
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
