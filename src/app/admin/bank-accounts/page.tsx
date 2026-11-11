'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Plus, Edit, Trash2, ArrowUp, ArrowDown,
  Check, X, Copy, AlertTriangle, RefreshCw, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { bankAccountClientService, type BankAccount, type CreateBankAccountInput } from '@/lib/services/bank-account-client-service';

export default function AdminBankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateBankAccountInput>({
    bank_name: '', account_holder: '', iban: '',
    branch_name: null, branch_code: null, account_number: null,
    swift_code: null, currency: 'TRY', is_active: true, display_order: 0, notes: null,
  });

  useEffect(() => { loadAccounts(); }, []);

  async function loadAccounts() {
    try { setLoading(true); setAccounts(await bankAccountClientService.getAllBankAccounts()); }
    catch { toast.error('Banka hesapları yüklenemedi'); }
    finally { setLoading(false); }
  }

  function resetForm(editing?: BankAccount | null) {
    setEditingAccount(editing || null);
    setFormData(editing ? {
      bank_name: editing.bank_name, account_holder: editing.account_holder,
      iban: editing.iban, branch_name: editing.branch_name, branch_code: editing.branch_code,
      account_number: editing.account_number, swift_code: editing.swift_code,
      currency: editing.currency, is_active: editing.is_active,
      display_order: editing.display_order, notes: editing.notes,
    } : { bank_name: '', account_holder: '', iban: '', branch_name: null, branch_code: null, account_number: null, swift_code: null, currency: 'TRY', is_active: true, display_order: accounts.length + 1, notes: null });
    setIsDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = editingAccount
        ? await bankAccountClientService.updateBankAccount(editingAccount.id, formData)
        : await bankAccountClientService.createBankAccount(formData);
      if (!result.success) { toast.error(result.error || 'İşlem başarısız'); return; }
      toast.success(editingAccount ? 'Banka hesabı güncellendi' : 'Banka hesabı oluşturuldu');
      setIsDialogOpen(false); await loadAccounts();
    } catch { toast.error('Bir hata oluştu'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" hesabını silmek istediğinizden emin misiniz?`)) return;
    try {
      const result = await bankAccountClientService.deleteBankAccount(id);
      if (!result.success) { toast.error(result.error || 'Silinemedi'); return; }
      toast.success('Hesap silindi'); await loadAccounts();
    } catch { toast.error('Bir hata oluştu'); }
  }

  async function handleToggleStatus(id: string, current: boolean) {
    try {
      const result = await bankAccountClientService.toggleAccountStatus(id, !current);
      if (!result.success) { toast.error(result.error || 'Güncellenemedi'); return; }
      toast.success(current ? 'Hesap pasif edildi' : 'Hesap aktif edildi'); await loadAccounts();
    } catch { toast.error('Bir hata oluştu'); }
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === accounts.length - 1)) return;
    const newAccounts = [...accounts];
    const swap = direction === 'up' ? index - 1 : index + 1;
    [newAccounts[index], newAccounts[swap]] = [newAccounts[swap], newAccounts[index]];
    const result = await bankAccountClientService.reorderBankAccounts(newAccounts.map(a => a.id));
    if (!result.success) { toast.error('Sıralama güncellenemedi'); return; }
    await loadAccounts();
  }

  function copyToClipboard(text: string, label: string) { navigator.clipboard.writeText(text); toast.success(`${label} kopyalandı`); }

  const filtered = accounts.filter(a =>
    !search || a.bank_name.toLowerCase().includes(search.toLowerCase()) ||
    a.account_holder.toLowerCase().includes(search.toLowerCase()) ||
    a.iban.includes(search.toUpperCase())
  );

  const activeCount = accounts.filter(a => a.is_active).length;
  const passiveCount = accounts.filter(a => !a.is_active).length;

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold gradient-text flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" /> Banka Hesapları
          </h1>
          <p className="text-sm text-muted-foreground mt-1">EFT/Havale ödemeleri için banka hesaplarını yönetin</p>
        </div>
        <Button onClick={() => resetForm()} className="gap-1.5 shrink-0"><Plus className="h-4 w-4" /> Yeni Hesap</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Toplam', value: accounts.length, icon: Building2, color: 'text-primary' },
          { label: 'Aktif', value: activeCount, icon: Check, color: 'text-emerald-500' },
          { label: 'Pasif', value: passiveCount, icon: X, color: 'text-muted-foreground' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="flex items-center gap-3 p-3 lg:p-4">
              <div className="p-2 rounded-lg bg-primary/5"><Icon className={`h-5 w-5 ${color}`} /></div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{label}</p>
                <p className="text-xl lg:text-2xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative max-w-xs mb-4">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Banka, hesap sahibi veya IBAN ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm w-full" />
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 bg-muted/50 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-base font-medium mb-1">{search ? 'Aramanızla eşleşen hesap bulunamadı' : 'Henüz banka hesabı eklenmemiş'}</p>
            <p className="text-sm text-muted-foreground mb-4">İlk banka hesabınızı ekleyerek başlayın</p>
            <Button onClick={() => resetForm()} variant="outline" className="gap-1.5"><Plus className="h-4 w-4" /> Hesap Ekle</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((account, index) => (
            <Card key={account.id} className="border-border/50 overflow-hidden hover:border-primary/30 transition-colors">
              <div className="p-4 lg:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/5 shrink-0">
                    <Building2 className="h-5 w-5 text-primary/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold">{account.bank_name}</h3>
                      <Badge variant={account.is_active ? 'default' : 'secondary'} className="text-[10px]">{account.is_active ? 'Aktif' : 'Pasif'}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 gap-2 min-w-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Hesap Sahibi</p>
                          <p className="text-sm font-medium truncate">{account.account_holder}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => copyToClipboard(account.account_holder, 'Hesap sahibi')}><Copy className="h-3.5 w-3.5" /></Button>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 gap-2 min-w-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">IBAN</p>
                          <p className="text-xs font-mono truncate">{bankAccountClientService.formatIBAN(account.iban)}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => copyToClipboard(account.iban, 'IBAN')}><Copy className="h-3.5 w-3.5" /></Button>
                      </div>
                      {account.branch_name && (
                        <div className="p-2.5 rounded-lg bg-muted/30">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Şube</p>
                          <p className="text-sm font-medium truncate">{account.branch_name}{account.branch_code ? ` / ${account.branch_code}` : ''}</p>
                        </div>
                      )}
                      {account.swift_code && (
                        <div className="p-2.5 rounded-lg bg-muted/30">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">SWIFT</p>
                          <p className="text-sm font-mono">{account.swift_code}</p>
                        </div>
                      )}
                    </div>
                    {account.notes && (
                      <div className="mt-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                        <p className="text-xs text-amber-700 dark:text-amber-400">{account.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-row sm:flex-col gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleMove(index, 'up')} disabled={index === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleMove(index, 'down')} disabled={index === filtered.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => resetForm(account)}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleToggleStatus(account.id, account.is_active)}>
                      {account.is_active ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(account.id, account.bank_name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingAccount ? 'Banka Hesabını Düzenle' : 'Yeni Banka Hesabı Ekle'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Banka Adı *</Label>
                <Input value={formData.bank_name} onChange={e => setFormData({ ...formData, bank_name: e.target.value })} placeholder="Ziraat Bankası" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hesap Sahibi *</Label>
                <Input value={formData.account_holder} onChange={e => setFormData({ ...formData, account_holder: e.target.value })} placeholder="AXIS3 TEKNOLOJİ A.Ş." className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">IBAN *</Label>
              <Input value={formData.iban} onChange={e => setFormData({ ...formData, iban: e.target.value.replace(/\s/g, '').toUpperCase() })} placeholder="TR330001000000000000000001" className="h-9 text-sm font-mono" maxLength={26} />
              {formData.iban && <p className="text-xs font-mono text-primary">Önizleme: {bankAccountClientService.formatIBAN(formData.iban)}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Şube Adı</Label>
                <Input value={formData.branch_name || ''} onChange={e => setFormData({ ...formData, branch_name: e.target.value || null })} placeholder="Merkez Şube" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Şube Kodu</Label>
                <Input value={formData.branch_code || ''} onChange={e => setFormData({ ...formData, branch_code: e.target.value || null })} placeholder="0001" className="h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Hesap Numarası</Label>
                <Input value={formData.account_number || ''} onChange={e => setFormData({ ...formData, account_number: e.target.value || null })} placeholder="1234567890" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">SWIFT Kodu</Label>
                <Input value={formData.swift_code || ''} onChange={e => setFormData({ ...formData, swift_code: e.target.value.toUpperCase() || null })} placeholder="TCZBTR2A" className="h-9 text-sm font-mono" maxLength={11} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notlar</Label>
              <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value || null })} placeholder="Bu hesap hakkında notlar..." rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="rounded border-input" />
              <span className="text-sm">Hesap aktif (Kullanıcılara gösterilsin)</span>
            </label>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving || !formData.bank_name || !formData.account_holder || !formData.iban} className="flex-1 h-9">
                {saving ? 'Kaydediliyor...' : editingAccount ? 'Güncelle' : 'Oluştur'}
              </Button>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="h-9">İptal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
