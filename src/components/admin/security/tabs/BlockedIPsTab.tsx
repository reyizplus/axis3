'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Search, Shield, ShieldOff, Ban, RefreshCw, AlertTriangle, Clock, User, Trash2, Plus, Globe,
} from 'lucide-react';
import { type BlockedIP } from '../types';
import { fmtDT, getTimeRemaining } from '../utils';
import { IPActivityDialog } from '../dialogs/IPActivityDialog';

export function BlockedIPsTab() {
  const [data, setData] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newDuration, setNewDuration] = useState('permanent');
  const [saving, setSaving] = useState(false);
  const [alreadyBlocked, setAlreadyBlocked] = useState<{ reason: string | null; blocked_at: string; expires_at: string | null } | null>(null);
  const [ipHistoryIP, setIpHistoryIP] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/security/blocked-ips');
      if (!res.ok) throw new Error('Veri alınamadı');
      setData((await res.json()).data || []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Bir hata oluştu'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  useEffect(() => { if (!dialogOpen) { setAlreadyBlocked(null); setError(null); } }, [dialogOpen]);

  const handleAdd = async () => {
    if (!newIp) return; setSaving(true); setAlreadyBlocked(null);
    try {
      const expiresAt = newDuration !== 'permanent' ? new Date(Date.now() + parseInt(newDuration)).toISOString() : null;
      const res = await fetch('/api/admin/security/blocked-ips', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip_address: newIp, reason: newReason, expires_at: expiresAt }),
      });
      if (!res.ok) {
        const d = await res.json();
        if (d.code === 'ALREADY_BLOCKED') { setAlreadyBlocked(d.existing); return; }
        throw new Error(d.error || 'Eklenemedi');
      }
      setDialogOpen(false); setNewIp(''); setNewReason(''); setNewDuration('permanent'); fetchData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Bir hata oluştu'); }
    finally { setSaving(false); }
  };

  const handleUnblock = async (id: string) => {
    try { await fetch(`/api/admin/security/blocked-ips?id=${id}`, { method: 'DELETE' }); fetchData(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Bir hata oluştu'); }
  };

  const filtered = data.filter(i => !search || i.ip_address.includes(search.toLowerCase()) || (i.reason || '').toLowerCase().includes(search.toLowerCase()));
  const activeIPs = filtered.filter(i => i.is_active);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-xs w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="IP veya sebep ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-8 gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Yenile
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="h-8 gap-1.5"><Ban className="h-3.5 w-3.5" /> IP Engelle</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>IP Engelle</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                {error && <p className="text-sm text-red-600">{error}</p>}
                {alreadyBlocked && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium text-sm">
                      <AlertTriangle className="h-4 w-4" />Bu IP zaten engellenmiş
                    </div>
                    <div className="text-xs text-amber-600/80 space-y-1">
                      {alreadyBlocked.reason && <p>Sebep: {alreadyBlocked.reason}</p>}
                      <p>Engellenme: {new Date(alreadyBlocked.blocked_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      {alreadyBlocked.expires_at && <p>Bitiş: {new Date(alreadyBlocked.expires_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
                    </div>
                  </div>
                )}
                {!alreadyBlocked && (<>
                  <div className="space-y-2"><Label>IP Adresi</Label><Input placeholder="192.168.1.100" value={newIp} onChange={e => setNewIp(e.target.value)} className="font-mono" /></div>
                  <div className="space-y-2"><Label>Sebep</Label><Input placeholder="Çok fazla başarısız giriş denemesi" value={newReason} onChange={e => setNewReason(e.target.value)} /></div>
                  <div className="space-y-2">
                    <Label>Süre</Label>
                    <Select value={newDuration} onValueChange={setNewDuration}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3600000">1 Saat</SelectItem>
                        <SelectItem value="86400000">1 Gün</SelectItem>
                        <SelectItem value="604800000">7 Gün</SelectItem>
                        <SelectItem value="2592000000">30 Gün</SelectItem>
                        <SelectItem value="permanent">Kalıcı</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAdd} disabled={saving || !newIp} className="w-full gap-1.5">{saving ? 'Engelleniyor...' : <><Ban className="h-4 w-4" /> Engelle</>}</Button>
                </>)}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-center gap-3 p-4"><AlertTriangle className="h-5 w-5 text-red-500 shrink-0" /><p className="text-sm text-red-600">{error}</p></CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Shield, label: 'Aktif Engellenen', value: activeIPs.length, color: 'text-red-500' },
          { icon: ShieldOff, label: 'Geçmiş', value: filtered.filter(i => !i.is_active).length, color: 'text-gray-400' },
          { icon: Ban, label: 'Toplam', value: filtered.length, color: 'text-orange-500' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="flex items-center gap-3 p-3 lg:p-4"><Icon className={`h-5 w-5 ${color}/60`} /><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl lg:text-2xl font-bold">{value}</p></div></CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          {loading ? <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-muted/50 rounded animate-pulse" />)}</div> :
           filtered.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">{search ? 'Aramanızla eşleşen kayıt bulunamadı' : 'Henüz engellenmiş IP yok'}</div> :
           <div className="divide-y">
            {filtered.map(item => (
              <div key={item.id} className={`flex items-center gap-3 p-3 ${item.is_active ? 'hover:bg-red-500/5' : 'hover:bg-muted/30'} transition-colors`}>
                <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${item.is_active ? 'bg-red-500/10' : 'bg-muted'}`}>
                  {item.is_active ? <Ban className="h-4 w-4 text-red-500" /> : <ShieldOff className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setIpHistoryIP(item.ip_address)} className="text-sm font-mono font-medium hover:text-primary hover:underline cursor-pointer">{item.ip_address}</button>
                    {item.is_active && getTimeRemaining(item.expires_at) && <Badge variant="outline" className="text-[10px] gap-1"><Clock className="h-3 w-3" />{getTimeRemaining(item.expires_at)}</Badge>}
                    {!item.is_active && <Badge variant="secondary" className="text-[10px]">Çözüldü</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    {item.reason && <span>{item.reason}</span>}
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDT(item.blocked_at)}</span>
                    {item.blocked_by_user && <span className="flex items-center gap-1"><User className="h-3 w-3" />{item.blocked_by_user.full_name}</span>}
                  </div>
                </div>
                {item.is_active && (
                  <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground hover:text-red-500" onClick={() => handleUnblock(item.id)}><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
            ))}
          </div>}
        </CardContent>
      </Card>
      <IPActivityDialog ip={ipHistoryIP || ''} open={!!ipHistoryIP} onOpenChange={o => { if (!o) setIpHistoryIP(null); }} />
    </div>
  );
}
