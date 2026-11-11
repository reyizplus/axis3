'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

export function BlockIPDialog({ ip, open, onOpenChange, onDone }: {
  ip: string; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void;
}) {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('permanent');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyBlocked, setAlreadyBlocked] = useState<{ reason: string | null; blocked_at: string; expires_at: string | null } | null>(null);

  useEffect(() => { if (!open) { setReason(''); setDuration('permanent'); setError(null); setAlreadyBlocked(null); } }, [open]);

  const handleBlock = async () => {
    setSaving(true); setError(null);
    try {
      const expiresAt = duration !== 'permanent' ? new Date(Date.now() + parseInt(duration)).toISOString() : null;
      const res = await fetch('/api/admin/security/blocked-ips', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip_address: ip, reason, expires_at: expiresAt }),
      });
      if (!res.ok) {
        const d = await res.json();
        if (d.code === 'ALREADY_BLOCKED') { setAlreadyBlocked(d.existing); return; }
        throw new Error(d.error || 'Engellenemedi');
      }
      onOpenChange(false); onDone();
    } catch (err) { setError(err instanceof Error ? err.message : 'Bir hata oluştu'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <div className="space-y-2">
              <Label>IP Adresi</Label>
              <Input value={ip} readOnly className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Sebep</Label>
              <Input placeholder="Çok fazla başarısız giriş denemesi" value={reason} onChange={e => setReason(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Süre</Label>
              <Select value={duration} onValueChange={setDuration}>
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
            <Button onClick={handleBlock} disabled={saving} className="w-full">{saving ? 'Engelleniyor...' : 'Engelle'}</Button>
          </>)}
        </div>
      </DialogContent>
    </Dialog>
  );
}
