'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, Globe, Search, RefreshCw, LogIn, Clock, Eye, User, Activity,
} from 'lucide-react';
import { type SecurityUser, type IpDetail } from '../types';
import { fmtRelative, fmtDT, getInitials } from '../utils';
import { UserActivityDialog } from '../dialogs/UserActivityDialog';
import { IPActivityDialog } from '../dialogs/IPActivityDialog';

type SortField = 'last_active_at' | 'last_sign_in_at' | 'email' | 'full_name' | 'created_at';
type SortOrder = 'asc' | 'desc';

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'last_active_at_desc', label: 'Son Erişim (Önce En Son)' },
  { value: 'last_active_at_asc', label: 'Son Erişim (Önce En Eski)' },
  { value: 'last_sign_in_at_desc', label: 'Son Giriş (Önce En Son)' },
  { value: 'last_sign_in_at_asc', label: 'Son Giriş (Önce En Eski)' },
  { value: 'email_asc', label: 'E-posta (A-Z)' },
  { value: 'email_desc', label: 'E-posta (Z-A)' },
  { value: 'full_name_asc', label: 'Ad (A-Z)' },
  { value: 'full_name_desc', label: 'Ad (Z-A)' },
  { value: 'created_at_desc', label: 'Kayıt (Önce En Yeni)' },
  { value: 'created_at_asc', label: 'Kayıt (Önce En Eski)' },
];

export function UsersTab() {
  const [innerTab, setInnerTab] = useState('users');
  const [users, setUsers] = useState<SecurityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activityUser, setActivityUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [ipHistoryIP, setIpHistoryIP] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<{ ipDetails: IpDetail[] } | null>(null);
  const [sortKey, setSortKey] = useState('last_active_at_desc');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const lastSep = sortKey.lastIndexOf('_');
      const sortField = sortKey.substring(0, lastSep) as SortField;
      const sortOrder = sortKey.substring(lastSep + 1) as SortOrder;
      const params = new URLSearchParams({ sort_by: sortField, sort_order: sortOrder });
      const res = await fetch(`/api/admin/security/users?${params}`);
      if (res.ok) setUsers((await res.json()).data || []);
    } catch {} finally { setLoading(false); }
  }, [sortKey]);

  const fetchIPs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/security/active-users');
      if (res.ok) setActiveData(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    if (innerTab === 'users') fetchUsers();
    else fetchIPs();
  }, [innerTab, fetchUsers]);

  const filtered = users.filter(u => {
    if (search) {
      const q = search.toLowerCase();
      if (!u.email.toLowerCase().includes(q) && !(u.full_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const ipList = (activeData?.ipDetails || [])
    .filter(ip => {
      if (!search) return true;
      const q = search.toLowerCase();
      return ip.ip.toLowerCase().includes(q)
        || (ip.user?.email || '').toLowerCase().includes(q)
        || (ip.user?.full_name || '').toLowerCase().includes(q);
    })
    .sort((a, b) => Date.parse(b.lastSeen) - Date.parse(a.lastSeen));

  const sortedLabel = SORT_OPTIONS.find(option => option.value === sortKey)?.label || '';

  const refresh = () => {
    if (innerTab === 'users') fetchUsers();
    else fetchIPs();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-xs w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder={innerTab === 'users' ? 'E-posta veya ad ile ara...' : 'IP veya kullanıcı ara...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm w-full" />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {innerTab === 'users' && (
            <>
              <span className="text-xs text-muted-foreground hidden sm:inline">Sırala:</span>
              <Select value={sortKey} onValueChange={setSortKey}>
                <SelectTrigger className="h-8 text-xs w-[190px]" title={sortedLabel}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          <Badge variant="secondary" className="text-xs h-8 shrink-0">
            {innerTab === 'users' ? filtered.length : ipList.length} kayıt
          </Badge>
          <Tabs value={innerTab} onValueChange={v => { setInnerTab(v as 'users' | 'ips'); setSearch(''); }}>
            <TabsList className="bg-muted/50 p-0.5 h-8">
              <TabsTrigger value="users" className="text-xs rounded px-2.5 gap-1.5"><Users className="h-3.5 w-3.5" /> Kullanıcılar</TabsTrigger>
              <TabsTrigger value="ips" className="text-xs rounded px-2.5 gap-1.5"><Globe className="h-3.5 w-3.5" /> IP&apos;ler</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="h-8 gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Yenile
          </Button>
        </div>
      </div>

      <Card className="border-border/50">
        <div className="p-3 lg:p-4">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-muted/50 rounded animate-pulse" />)}</div>
          ) : innerTab === 'users' ? (
            filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Kullanıcı bulunamadı</div>
            ) : (
              <div className="space-y-1">
                {filtered.map(u => {
                  const displayName = u.full_name && u.full_name !== u.email ? u.full_name : u.email;
                  const showEmail = displayName !== u.email;
                  return (
                    <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors group">
                      <Avatar className="h-8 w-8 border border-border shrink-0">
                        <AvatarFallback className="text-xs">{u.full_name ? getInitials(u.full_name) : u.email[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setActivityUser({ id: u.id, name: u.full_name || u.email, email: u.email })}
                            className="text-sm font-medium hover:text-primary hover:underline cursor-pointer truncate max-w-[200px]"
                          >
                            {displayName}
                          </button>
                          {u.is_admin && <Badge variant="default" className="text-[10px]">Admin</Badge>}
                          {u.status !== 'active' && <Badge variant="destructive" className="text-[10px]">{u.status}</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {showEmail && <span className="truncate max-w-[180px]">{u.email}</span>}
                          {u.last_active_at ? (
                            <span className="flex items-center gap-1" title={fmtDT(u.last_active_at)}>
                              <LogIn className="h-3 w-3" />Son aktivite: {fmtDT(u.last_active_at)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">Hiç erişmemiş</span>
                          )}
                          <span className="text-muted-foreground/50">Kayıt: {new Date(u.created_at).toLocaleDateString('tr-TR')}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => setActivityUser({ id: u.id, name: u.full_name || u.email, email: u.email })} title="Aktivite Geçmişi">
                        <Activity className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            ipList.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">IP kaydı bulunamadı</div>
            ) : (
              <div className="space-y-1">
                {ipList.map((ip, i) => (
                  <div key={`${ip.ip}-${i}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors group">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 shrink-0"><Globe className="h-4 w-4 text-blue-500" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => setIpHistoryIP(ip.ip)} className="text-sm font-mono font-medium hover:text-primary hover:underline cursor-pointer">{ip.ip}</button>
                        <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{ip.count} istek</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1" title={fmtDT(ip.lastSeen)}><Clock className="h-3 w-3" />{fmtRelative(ip.lastSeen)}</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{ip.lastPage}</span>
                        {ip.userId && ip.user ? (
                          <Link href={`/admin/users/${ip.userId}`} className="flex items-center gap-1 text-primary hover:underline truncate max-w-[180px]">
                            <User className="h-3 w-3" />{ip.user.email}
                          </Link>
                        ) : (
                          <span className="flex items-center gap-1"><User className="h-3 w-3" />Misafir</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </Card>
      <UserActivityDialog
        userId={activityUser?.id || ''}
        userName={activityUser?.name || ''}
        email={activityUser?.email || ''}
        open={!!activityUser}
        onOpenChange={o => { if (!o) setActivityUser(null); }}
      />
      <IPActivityDialog ip={ipHistoryIP || ''} open={!!ipHistoryIP} onOpenChange={o => { if (!o) setIpHistoryIP(null); }} />
    </div>
  );
}
