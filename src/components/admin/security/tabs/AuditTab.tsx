'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search, RefreshCw, AlertTriangle, Eye, LogIn, LogOut, XCircle, Shield, Ban, List, ChevronLeft, ChevronRight, UserPlus, KeyRound,
} from 'lucide-react';
import { type AuditEntry, type Pagination, ACTION_LABELS, ACTION_OPTIONS } from '../types';
import { fmtDT, getActionColor } from '../utils';
import { BlockIPDialog } from '../dialogs/BlockIPDialog';
import { IPActivityDialog } from '../dialogs/IPActivityDialog';

function actionIcon(action: string) {
  if (action === 'page_view') return <Eye className="h-4 w-4" />;
  if (action === 'auth:LOGIN_SUCCESS') return <LogIn className="h-4 w-4" />;
  if (action === 'auth:LOGIN_FAILURE') return <XCircle className="h-4 w-4" />;
  if (action === 'auth:LOGOUT') return <LogOut className="h-4 w-4" />;
  if (action === 'auth:REGISTER_SUCCESS') return <UserPlus className="h-4 w-4" />;
  if (action.startsWith('auth:PASSWORD')) return <KeyRound className="h-4 w-4" />;
  if (action.startsWith('rate_limit:')) return <Ban className="h-4 w-4" />;
  return <Shield className="h-4 w-4" />;
}

/** Kaydı tek satırda anlaşılır bir cümleye çevirir. */
function describeEntry(entry: AuditEntry): string | null {
  const { action, entity_id } = entry;
  if (action === 'auth:LOGIN_FAILURE') return entity_id ? `Denenen hesap: ${entity_id}` : 'Hatalı giriş denemesi';
  if (action === 'auth:LOGIN_SUCCESS') return 'Oturum açıldı';
  if (action === 'auth:LOGOUT') return 'Oturum kapatıldı';
  if (action === 'auth:REGISTER_SUCCESS') return 'Yeni hesap oluşturuldu';
  if (action === 'page_view') return entity_id ? `Sayfa: ${entity_id}` : null;
  if (action.startsWith('rate_limit:')) {
    const [kind, target] = entity_id.split(':');
    const label = kind === 'login' ? 'giriş' : kind === 'register' ? 'kayıt' : 'şifre sıfırlama';
    return `Çok fazla ${label} denemesi${target ? ` · ${target}` : ''}`;
  }
  return entity_id || null;
}

export function AuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [includePageViews, setIncludePageViews] = useState(false);
  const [page, setPage] = useState(1);
  const [blockIP, setBlockIP] = useState<string | null>(null);
  const [ipHistoryIP, setIpHistoryIP] = useState<string | null>(null);
  const limit = 50;

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (actionFilter && actionFilter !== 'all') params.set('action', actionFilter);
      if (includePageViews) params.set('includePageViews', 'true');
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/logs/audit?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Veri alınamadı');
      const json = await res.json();
      setEntries(json.data || []); setPagination(json.pagination || null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Bir hata oluştu'); }
    finally { setLoading(false); }
  }, [page, actionFilter, search, includePageViews]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const pageViewsHidden = !includePageViews && actionFilter === 'all';

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="IP, e-posta veya işlem ara..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && (setPage(1), fetchData())} className="pl-8 h-8 text-sm w-full" />
        </div>
        <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[200px] h-8 text-sm"><SelectValue placeholder="İşlem" /></SelectTrigger>
          <SelectContent>{ACTION_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground select-none cursor-pointer">
          <Switch checked={includePageViews} onCheckedChange={v => { setIncludePageViews(v); setPage(1); }} />
          Sayfa görüntülemelerini göster
        </label>
        <Badge variant="secondary" className="text-xs gap-1 h-8 shrink-0"><List className="h-3 w-3" />{pagination?.total || 0} kayıt</Badge>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-8 gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Yenile
        </Button>
      </div>

      {pageViewsHidden && (
        <p className="text-xs text-muted-foreground">
          Sayfa görüntüleme kayıtları varsayılan olarak gizlenir. Tümünü görmek için &quot;Sayfa görüntülemelerini göster&quot; anahtarını açın.
        </p>
      )}

      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-center gap-3 p-4"><AlertTriangle className="h-5 w-5 text-red-500 shrink-0" /><p className="text-sm text-red-600">{error}</p></CardContent>
        </Card>
      )}

      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          {loading ? <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />)}</div> :
           entries.length === 0 ? (
             <div className="text-center py-12 text-muted-foreground text-sm">
               Kayıt bulunamadı{pageViewsHidden ? ' (sayfa görüntülemeleri gizli)' : ''}
             </div>
           ) :
           <div className="divide-y">
            {entries.map(entry => {
              const actionLabel = ACTION_LABELS[entry.action] || (entry.action.startsWith('auth:') ? entry.action.replace('auth:', '') : entry.action);
              const description = describeEntry(entry);
              const isRateLimit = entry.action.startsWith('rate_limit:');
              return (
                <div key={entry.id} title={entry.user_agent || undefined} className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors group">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${getActionColor(entry.action)}`}>
                    {actionIcon(entry.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{actionLabel}</span>
                      {isRateLimit && <Badge variant="destructive" className="text-[10px]">Hız sınırı</Badge>}
                      <span className="text-xs text-muted-foreground">{fmtDT(entry.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {entry.user_id && entry.user ? (
                        <Link href={`/admin/users/${entry.user_id}`} className="text-primary hover:underline font-medium truncate max-w-[200px]">
                          {entry.user.email || entry.user.full_name}
                        </Link>
                      ) : entry.user_id ? <span className="font-mono text-[11px]">{entry.user_id.substring(0, 8)}</span> : <span className="text-muted-foreground/70">Sistem</span>}
                      {description && <span className="truncate max-w-[320px]" title={description}>{description}</span>}
                      {entry.ip_address && <span>IP: <button onClick={() => setIpHistoryIP(entry.ip_address!)} className="text-primary hover:underline cursor-pointer font-mono">{entry.ip_address}</button></span>}
                    </div>
                  </div>
                  {entry.ip_address && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity shrink-0" onClick={() => setBlockIP(entry.ip_address!)} title="IP Engelle"><Ban className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
              );
            })}
          </div>}
        </CardContent>
        {pagination && pagination.totalPages > 1 && (
          <div className="border-t px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Sayfa {pagination.page} / {pagination.totalPages} ({pagination.total} kayıt)</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7 w-7 p-0"><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="h-7 w-7 p-0"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        )}
      </Card>
      <BlockIPDialog ip={blockIP || ''} open={!!blockIP} onOpenChange={o => { if (!o) setBlockIP(null); }} onDone={fetchData} />
      <IPActivityDialog ip={ipHistoryIP || ''} open={!!ipHistoryIP} onOpenChange={o => { if (!o) setIpHistoryIP(null); }} />
    </div>
  );
}
