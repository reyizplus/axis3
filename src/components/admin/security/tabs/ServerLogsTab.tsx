'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Terminal, RefreshCw, Download, AlertTriangle, Server, Cpu, HardDrive,
  FileCode, Radio, Search, List, Users, Globe, Ban,
} from 'lucide-react';
import { type LogResponse, type ParsedAppEntry, type ParsedActivityEntry, DEVICE_ICONS } from '../types';
import { fmtDT, fmtUptime } from '../utils';
import { UserDisplay } from '../UserDisplay';
import { BlockIPDialog } from '../dialogs/BlockIPDialog';
import { IPActivityDialog } from '../dialogs/IPActivityDialog';

const LINE_OPTIONS = [50, 100, 200, 500, 1000, 5000];

// Sütun genişlikleri: "İstek" tek başına tüm boşluğu kaplayıp "Kullanıcı"
// sütununu sıkıştırıyordu. Artık istek ve kullanıcı alanı boşluğu paylaşır.
// Zaman sütunu tarih + saat gösterdiği için daha geniş tutulur.
const APP_GRID = 'grid-cols-[150px_minmax(0,1.4fr)_130px_minmax(0,1.5fr)_32px]';
const ACTIVITY_GRID = 'grid-cols-[145px_minmax(0,1.2fr)_minmax(0,1.2fr)_120px_90px_32px]';

export function ServerLogsTab() {
  const [activeTab, setActiveTab] = useState('app');
  const [logs, setLogs] = useState<LogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [blockIP, setBlockIP] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<'users' | 'ips'>('users');
  const [ipHistoryIP, setIpHistoryIP] = useState<string | null>(null);
  const [maxLines, setMaxLines] = useState(200);
  const appScrollRef = useRef<HTMLDivElement>(null);
  const activityScrollRef = useRef<HTMLDivElement>(null);
  const isFileSource = activeTab === 'app' || activeTab === 'activity';

  const fetchLogs = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ lines: String(maxLines), source: activeTab });
      params.set('parsed', 'true');
      const res = await fetch(`/api/admin/logs?${params}`);
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Loglar alınamadı'); }
      setLogs(await res.json());
    } catch (err) { setError(err instanceof Error ? err.message : 'Bir hata oluştu'); setLogs(null); }
    finally { setLoading(false); }
  }, [activeTab, maxLines]);

  useEffect(() => { if (isFileSource) fetchLogs(); }, [fetchLogs, isFileSource]);

  const matchesFilter = (entry: Record<string, unknown>) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return [entry.raw, entry.path, entry.ip, entry.email, entry.pageUrl, entry.ipAddress, entry.userEmail, entry.userName, entry.userId, entry.deviceType]
      .some(value => typeof value === 'string' && value.toLowerCase().includes(q));
  };
  const allEntries = (logs?.data || []) as Record<string, unknown>[];
  const filtered = allEntries.filter(matchesFilter);
  // Dosya logu eskiden yeniye okunur; panelde en yeni kayıt en üstte görünsün.
  const appEntries = (filtered as unknown as ParsedAppEntry[]).slice().reverse();

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Uygulama logunda kullanıcı sütunu: sadece e-posta; tam UUID varsa
  // kullanıcı detay sayfasına bağlantı verilir (eski 8 karakterlik id'lerde düz metin).
  const renderAppUser = (entry: ParsedAppEntry) => {
    if (entry._parseError) return <span className="text-green-400/40 italic">{entry.raw}</span>;
    if (entry.guest) return <span className="text-green-400/40">Misafir</span>;

    const targetId = entry.user?.id || (entry.userId && UUID_REGEX.test(entry.userId) ? entry.userId : null);
    const label =
      entry.email ||
      entry.user?.email ||
      entry.user?.full_name ||
      (entry.userId ? `${entry.userId.substring(0, 8)}…` : '-');

    if (!targetId) return <span className="text-green-400/90">{label}</span>;

    return (
      <Link
        href={`/admin/users/${targetId}`}
        className="text-green-400/90 hover:text-green-300 hover:underline"
        title="Kullanıcı detaylarını aç"
      >
        {label}
      </Link>
    );
  };
  const activityFiltered = (filtered as unknown as ParsedActivityEntry[]).filter(e => {
    if (activityFilter === 'users') return e.userId && e.userId !== '';
    return !e.userId || e.userId === '';
  });
  const system = logs?.system;

  // Sayfa açılışında ve her yenilemede en yeni kayda (en üste) kaydır.
  // Her iki liste de artık yeniden eskiye sıralı geliyor.
  useEffect(() => {
    if (loading) return;
    const el = activeTab === 'app' ? appScrollRef.current : activityScrollRef.current;
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      el.scrollTop = 0;
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTab, loading, logs, filter, activityFilter]);

  const SYS_METRICS = system ? [
    { icon: Server, label: 'Çalışma Süresi', value: fmtUptime(system.uptime) },
    { icon: HardDrive, label: 'Bellek (RSS)', value: system.memory.rss },
    { icon: Cpu, label: 'Heap Kullanımı', value: system.memory.heapUsed },
    { icon: Terminal, label: 'Node.js', value: system.node },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">{logs?.logPath || 'log dosyası'}</span>
          </div>

        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="h-8 gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Yükleniyor...' : 'Yenile'}
          </Button>
          {logs && logs.data.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => {
              const blob = new Blob([logs.data.map((d) => (d as Record<string, unknown>).raw || String(d)).join('\n')], { type: 'text/plain' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${activeTab}-logs-${new Date().toISOString().split('T')[0]}.log`; a.click();
            }} className="h-8 gap-1.5"><Download className="h-3.5 w-3.5" /> İndir</Button>
          )}
        </div>
      </div>

      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-center gap-3 p-4"><AlertTriangle className="h-5 w-5 text-red-500 shrink-0" /><p className="text-sm text-red-600">{error}</p></CardContent>
        </Card>
      )}

      {system && isFileSource && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SYS_METRICS.map(({ icon: Icon, label, value }) => (
            <Card key={label} className="border-border/50">
              <CardContent className="flex items-center gap-3 p-3 lg:p-4">
                <div className="p-2 rounded-lg bg-primary/5"><Icon className="h-5 w-5 text-primary/60" /></div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{label}</p>
                  <p className="text-sm lg:text-lg font-bold truncate">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setFilter(''); setError(null); }}>
        <TabsList className="bg-muted/50 p-0.5">
          <TabsTrigger value="app" className="rounded-md data-[state=active]:shadow-sm gap-1.5">
            <FileCode className="h-3.5 w-3.5" /> Uygulama
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-md data-[state=active]:shadow-sm gap-1.5">
            <Radio className="h-3.5 w-3.5" /> Aktivite
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'app' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-xs min-w-[140px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Loglarda ara..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
            <div className="flex items-center gap-1.5">
              <List className="h-3 w-3 text-muted-foreground" />
              <select
                value={maxLines}
                onChange={e => setMaxLines(Number(e.target.value))}
                className="h-8 text-xs rounded-lg border border-border/60 bg-background px-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {LINE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n} satır</option>
                ))}
              </select>
            </div>
            <Badge variant="secondary" className="text-xs gap-1"><List className="h-3 w-3" />{filtered.length} satır</Badge>
          </div>
          <div className="bg-black/95 text-green-400 font-mono text-xs rounded-xl overflow-x-auto border border-green-500/10 shadow-lg">
            <div className="min-w-[640px]">
              <div className={`grid ${APP_GRID} gap-2 px-3 py-2 border-b border-green-400/10 text-green-400/50 text-[10px] uppercase tracking-wider`}>
                <span>Zaman</span><span>İstek</span><span>IP</span><span>Kullanıcı</span><span></span>
              </div>
              <div ref={appScrollRef} className="h-[350px] lg:h-[450px] overflow-y-auto divide-y divide-green-400/5">
                {loading ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={`grid ${APP_GRID} gap-2 px-3 py-1.5`}>
                    {[1,2,3,4].map(j => <div key={j} className="h-3 bg-green-400/10 rounded animate-pulse" />)}
                  </div>
                )) : filtered.length === 0 ? (
                  <div className="px-3 py-8 text-center text-green-400/40">{filter ? 'Filtreye uygun log bulunamadı.' : 'Henüz log kaydı yok.'}</div>
                ) : appEntries.map((entry, i) => (
                  <div key={i} className={`grid ${APP_GRID} gap-2 px-3 py-1.5 hover:bg-green-400/5 transition-colors items-center`}>
                    <span className="text-green-400/70 truncate">{fmtDT(entry.timestamp || '')}</span>
                    <span className="truncate">{entry.path || entry.raw}</span>
                    <span className="text-green-400/70 truncate">
                      {entry.ip && entry.ip !== '-' ? (
                        <button onClick={() => setIpHistoryIP(entry.ip)} className="hover:text-green-300 hover:underline cursor-pointer">{entry.ip}</button>
                      ) : '-'}
                    </span>
                    <span className="truncate" title={entry.user?.full_name || entry.email || entry.userId}>
                      {renderAppUser(entry)}
                    </span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-400/40 hover:text-red-400" onClick={() => setBlockIP(entry.ip)} title="IP Engelle"><Ban className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 max-w-xs w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Loglarda ara..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-8 h-8 text-sm w-full" />
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={activityFilter} onValueChange={v => setActivityFilter(v as 'users' | 'ips')}>
                <TabsList className="bg-muted/50 p-0.5 h-8">
                  <TabsTrigger value="users" className="text-xs rounded px-2.5 gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Kullanıcılar
                  </TabsTrigger>
                  <TabsTrigger value="ips" className="text-xs rounded px-2.5 gap-1.5">
                    <Globe className="h-3.5 w-3.5" /> IP&apos;ler
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-1.5">
                <List className="h-3 w-3 text-muted-foreground" />
                <select
                  value={maxLines}
                  onChange={e => setMaxLines(Number(e.target.value))}
                  className="h-8 text-xs rounded-lg border border-border/60 bg-background px-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {LINE_OPTIONS.map(n => (
                    <option key={n} value={n}>{n} satır</option>
                  ))}
                </select>
              </div>
              <Badge variant="secondary" className="text-xs gap-1 h-8 shrink-0"><List className="h-3 w-3" />{activityFiltered.length} kayıt</Badge>
            </div>
          </div>
          <Card className="border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[780px]">
                <div className={`grid ${ACTIVITY_GRID} gap-2 px-4 py-2.5 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider`}>
                  <span>Zaman</span><span>{activityFilter === 'users' ? 'Kullanıcı' : 'IP'}</span><span>Sayfa</span><span>{activityFilter === 'users' ? 'IP' : 'Kullanıcı'}</span><span>Cihaz</span><span></span>
                </div>
                <div ref={activityScrollRef} className="divide-y max-h-[400px] overflow-y-auto">
                  {loading ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`grid ${ACTIVITY_GRID} gap-2 px-4 py-2.5`}>
                      {[1,2,3,4,5].map(j => <div key={j} className="h-4 bg-muted/50 rounded animate-pulse" />)}
                    </div>
                  )) : activityFiltered.length === 0 ? (
                    <div className="px-4 py-8 text-center text-muted-foreground text-sm">{filter ? 'Filtreye uygun kayıt bulunamadı.' : 'Henüz aktivite kaydı yok.'}</div>
                  ) : activityFiltered.map((entry, i) => {
                    const DeviceIcon = entry.deviceType ? DEVICE_ICONS[entry.deviceType] || Globe : Globe;
                    return (
                      <div key={i} className={`grid ${ACTIVITY_GRID} gap-2 px-4 py-2.5 hover:bg-accent/30 transition-colors items-center text-sm`}>
                        <span className="text-muted-foreground text-xs whitespace-nowrap">
                          {entry._parseError ? <span className="text-muted-foreground/40 italic">{entry.raw}</span> : fmtDT(entry.timestamp)}
                        </span>
                        <span className="min-w-0">
                          {entry._parseError ? null : activityFilter === 'users' ? (
                            <UserDisplay user={entry.user} userId={entry.userId} email={entry.userEmail} size="xs" />
                          ) : (
                            <button onClick={() => setIpHistoryIP(entry.ipAddress)} className="text-xs font-mono text-primary hover:underline cursor-pointer truncate max-w-[140px] block">
                              {entry.ipAddress}
                            </button>
                          )}
                        </span>
                        <span className="truncate text-xs">{entry._parseError ? null : entry.pageUrl}</span>
                        <span className="text-xs truncate font-mono">
                          {entry._parseError ? null : activityFilter === 'users' ? (
                            <button onClick={() => setIpHistoryIP(entry.ipAddress)} className="text-muted-foreground hover:text-primary hover:underline cursor-pointer">
                              {entry.ipAddress}
                            </button>
                          ) : (
                            <UserDisplay user={entry.user} userId={entry.userId} email={entry.userEmail} size="xs" />
                          )}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {entry._parseError ? null : <><DeviceIcon className="h-3 w-3" /><span className="capitalize">{entry.deviceType}</span></>}
                        </span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500" onClick={() => setBlockIP(entry.ipAddress)} title="IP Engelle"><Ban className="h-3 w-3" /></Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
      <BlockIPDialog ip={blockIP || ''} open={!!blockIP} onOpenChange={o => { if (!o) setBlockIP(null); }} onDone={fetchLogs} />
      <IPActivityDialog ip={ipHistoryIP || ''} open={!!ipHistoryIP} onOpenChange={o => { if (!o) setIpHistoryIP(null); }} />
    </div>
  );
}
