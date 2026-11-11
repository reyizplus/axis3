'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw, AlertTriangle, Globe, Users, Activity, Wifi, Clock, Eye, Ban, List,
} from 'lucide-react';
import { type ActiveUsersData, type ActiveUser, type IpDetail } from '../types';
import { fmtRelative, fmtDT, getInitials } from '../utils';
import { BlockIPDialog } from '../dialogs/BlockIPDialog';
import { IPActivityDialog } from '../dialogs/IPActivityDialog';

type InnerTab = 'users' | 'ips' | 'all';

const TAB_TITLES: Record<InnerTab, string> = {
  users: 'Aktif Kullanıcılar',
  ips: 'Aktif IP Adresleri',
  all: 'Son 24 Saat (IP Bazında)',
};

const EMPTY_STATES: Record<InnerTab, string> = {
  users: 'Son 5 dakikada aktif olan kayıtlı kullanıcı yok',
  ips: 'Son 5 dakikada aktif olan IP adresi yok',
  all: 'Son 24 saatte erişim kaydı yok',
};

export function ActiveUsersTab() {
  const [innerTab, setInnerTab] = useState<InnerTab>('users');
  const [data, setData] = useState<ActiveUsersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockIP, setBlockIP] = useState<string | null>(null);
  const [ipHistoryIP, setIpHistoryIP] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/security/active-users', { cache: 'no-store' });
      if (!res.ok) throw new Error('Veri alınamadı');
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary;
  const summaryCards = summary
    ? [
        { icon: Users, label: 'Anlık Aktif Kullanıcı', value: summary.activeUsers, color: 'text-emerald-500' },
        { icon: Globe, label: 'Anlık Aktif IP', value: summary.activeIPs, color: 'text-blue-500' },
        { icon: Wifi, label: '24s Benzersiz IP', value: summary.uniqueIPs, color: 'text-purple-500' },
        { icon: Activity, label: '24s İstek', value: summary.totalRequests.toLocaleString('tr-TR'), color: 'text-orange-500' },
      ]
    : [];

  const renderUser = (user: ActiveUser) => {
    const displayName = user.fullName || user.email || 'Kullanıcı';
    const emailDiffers = !!user.email && user.email !== displayName;

    return (
      <div key={user.userId} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
        <Avatar className="h-8 w-8 border border-border shrink-0">
          <AvatarFallback className="text-xs">{user.fullName ? getInitials(user.fullName) : (user.email?.[0] || '?').toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/admin/users/${user.userId}`} className="text-sm font-medium text-primary hover:underline truncate max-w-[220px]">
              {displayName}
            </Link>
            <Badge variant="secondary" className="text-[10px]">{user.requestCount} istek</Badge>
          </div>
          {emailDiffers && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
            <span className="flex items-center gap-1" title={fmtDT(user.lastSeen)}>
              <Clock className="h-3 w-3" />{fmtRelative(user.lastSeen)}
            </span>
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{user.lastPage}</span>
            {user.ips.length > 0 && (
              <span className="flex items-center gap-1 flex-wrap">
                <Globe className="h-3 w-3" />
                {user.ips.slice(0, 3).map((ip) => (
                  <button
                    key={ip}
                    onClick={() => setIpHistoryIP(ip)}
                    className="font-mono hover:text-primary hover:underline cursor-pointer"
                  >
                    {ip}
                  </button>
                ))}
                {user.ips.length > 3 && <span>+{user.ips.length - 3}</span>}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderIp = (item: IpDetail) => (
    <div key={item.ip} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors group">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${item.isGuest ? 'bg-blue-500/10' : 'bg-emerald-500/10'}`}>
        <Globe className={`h-4 w-4 ${item.isGuest ? 'text-blue-500' : 'text-emerald-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIpHistoryIP(item.ip)}
            className="text-sm font-mono font-medium hover:text-primary hover:underline cursor-pointer"
          >
            {item.ip}
          </button>
          {item.user ? (
            <Link href={`/admin/users/${item.userId}`} className="text-xs text-primary hover:underline truncate max-w-[180px]">
              {item.user.email}
            </Link>
          ) : (
            <Badge variant="secondary" className="text-[10px]">Misafir</Badge>
          )}
          <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{item.count} istek</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
          <span className="flex items-center gap-1" title={fmtDT(item.lastSeen)}>
            <Clock className="h-3 w-3" />{fmtRelative(item.lastSeen)}
          </span>
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{item.lastPage}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity shrink-0"
        onClick={() => setBlockIP(item.ip)}
        title="IP Engelle"
      >
        <Ban className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  const currentList =
    innerTab === 'users' ? data?.activeUsers || [] : innerTab === 'ips' ? data?.activeIPs || [] : data?.ipDetails || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-8 gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Yenile
        </Button>
        <span className="text-xs text-muted-foreground">Son 5 dakika canlı · son 24 saat özet</span>
      </div>

      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {summaryCards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summaryCards.map(({ icon: Icon, label, value, color }) => (
            <Card key={label} className="border-border/50">
              <CardContent className="flex items-center gap-3 p-3 lg:p-4">
                <div className="p-2 rounded-lg bg-muted/30"><Icon className={`h-5 w-5 ${color}/60`} /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl lg:text-2xl font-bold">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {innerTab === 'users' ? <Users className="h-4 w-4 text-primary" /> : <Globe className="h-4 w-4 text-primary" />}
                  {TAB_TITLES[innerTab]}
                  <Badge variant="secondary" className="text-[10px]">{currentList.length}</Badge>
                </CardTitle>
                <Tabs value={innerTab} onValueChange={(value) => setInnerTab(value as InnerTab)}>
                  <TabsList className="bg-muted/50 p-0.5 h-8 overflow-x-auto">
                    <TabsTrigger value="users" className="text-xs rounded px-2.5 whitespace-nowrap">Kullanıcılar</TabsTrigger>
                    <TabsTrigger value="ips" className="text-xs rounded px-2.5 whitespace-nowrap">IP&apos;ler</TabsTrigger>
                    <TabsTrigger value="all" className="text-xs rounded px-2.5 whitespace-nowrap">24 Saat</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />)}
                </div>
              ) : currentList.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">{EMPTY_STATES[innerTab]}</div>
              ) : (
                <div className="space-y-0.5">
                  {innerTab === 'users'
                    ? (data?.activeUsers || []).map(renderUser)
                    : innerTab === 'ips'
                      ? (data?.activeIPs || []).map(renderIp)
                      : (data?.ipDetails || []).map(renderIp)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><List className="h-4 w-4 text-primary" /> En Çok Ziyaret</CardTitle>
              <CardDescription>Son 24 saat</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 bg-muted/50 rounded animate-pulse" />)}
                </div>
              ) : (data?.summary.topPages || []).length === 0 ? (
                <p className="text-center py-6 text-sm text-muted-foreground">Veri yok</p>
              ) : (
                <div className="space-y-1">
                  {(data?.summary.topPages || []).map((p) => (
                    <div key={p.page} className="flex items-center justify-between p-2 rounded hover:bg-muted/30">
                      <span className="text-xs font-mono truncate flex-1" title={p.page}>{p.page}</span>
                      <Badge variant="secondary" className="text-[10px] ml-2 shrink-0">{p.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <BlockIPDialog ip={blockIP || ''} open={!!blockIP} onOpenChange={(open) => { if (!open) setBlockIP(null); }} onDone={fetchData} />
      <IPActivityDialog ip={ipHistoryIP || ''} open={!!ipHistoryIP} onOpenChange={(open) => { if (!open) setIpHistoryIP(null); }} />
    </div>
  );
}
