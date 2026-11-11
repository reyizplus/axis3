'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Pencil, Trash2, ArrowUp, ArrowDown, Check, X, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { bankAccountClientService, type BankAccount, type CreateBankAccountInput } from '@/lib/services/bank-account-client-service';

export function BankAccountsTab() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState<CreateBankAccountInput>({
    bank_name: '', account_holder: '', iban: '', branch_name: null, branch_code: null,
    account_number: null, swift_code: null, currency: 'TRY', is_active: true, display_order: 0, notes: null,
  });

  useEffect(() => { loadAccounts(); }, []);

  async function loadAccounts() {
    try {
      setLoading(true);
      setAccounts(await bankAccountClientService.getAllBankAccounts());
    } catch { toast.error('Banka hesapları yüklenemedi'); } finally { setLoading(false); }
  }

  function openCreateDialog() {
    setEditingAccount(null);
    setFormData({ bank_name: '', account_holder: '', iban: '', branch_name: null, branch_code: null, account_number: null, swift_code: null, currency: 'TRY', is_active: true, display_order: accounts.length + 1, notes: null });
    setIsDialogOpen(true);
  }

  function openEditDialog(account: BankAccount) {
    setEditingAccount(account);
    setFormData({ bank_name: account.bank_name, account_holder: account.account_holder, iban: account.iban, branch_name: account.branch_name, branch_code: account.branch_code, account_number: account.account_number, swift_code: account.swift_code, currency: account.currency, is_active: account.is_active, display_order: account.display_order, notes: account.notes });
    setIsDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editingAccount) {
        const result = await bankAccountClientService.updateBankAccount(editingAccount.id, formData);
        if (!result.success) { toast.error(result.error || 'Güncellenemedi'); return; }
        toast.success('Banka hesabı güncellendi');
      } else {
        const result = await bankAccountClientService.createBankAccount(formData);
        if (!result.success) { toast.error(result.error || 'Oluşturulamadı'); return; }
        toast.success('Banka hesabı oluşturuldu');
      }
      setIsDialogOpen(false);
      await loadAccounts();
    } catch { toast.error('Bir hata oluştu'); }
  }

  async function handleDelete(id: string, bankName: string) {
    if (!confirm(`"${bankName}" hesabını silmek istediğinizden emin misiniz?`)) return;
    try {
      const result = await bankAccountClientService.deleteBankAccount(id);
      if (!result.success) { toast.error(result.error || 'Silinemedi'); return; }
      toast.success('Banka hesabı silindi');
      await loadAccounts();
    } catch { toast.error('Bir hata oluştu'); }
  }

  async function handleToggleStatus(id: string, currentStatus: boolean) {
    try {
      const result = await bankAccountClientService.toggleAccountStatus(id, !currentStatus);
      if (!result.success) { toast.error(result.error || 'Güncellenemedi'); return; }
      toast.success(currentStatus ? 'Hesap pasif edildi' : 'Hesap aktif edildi');
      await loadAccounts();
    } catch { toast.error('Bir hata oluştu'); }
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const newAccounts = [...accounts];
    [newAccounts[index - 1], newAccounts[index]] = [newAccounts[index], newAccounts[index - 1]];
    const result = await bankAccountClientService.reorderBankAccounts(newAccounts.map(acc => acc.id));
    if (!result.success) { toast.error(result.error || 'Sıralanamadı'); return; }
    await loadAccounts();
  }

  async function handleMoveDown(index: number) {
    if (index === accounts.length - 1) return;
    const newAccounts = [...accounts];
    [newAccounts[index], newAccounts[index + 1]] = [newAccounts[index + 1], newAccounts[index]];
    const result = await bankAccountClientService.reorderBankAccounts(newAccounts.map(acc => acc.id));
    if (!result.success) { toast.error(result.error || 'Sıralanamadı'); return; }
    await loadAccounts();
  }

  function copyToClipboard(text: string, label: string) { navigator.clipboard.writeText(text); toast.success(`${label} kopyalandı`); }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-lg font-semibold truncate">Banka Hesapları</h3>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">EFT/Havale ödemeleri için banka hesaplarını yönetin</p>
        </div>
        <Button onClick={openCreateDialog} size="sm" className="shrink-0 w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />Yeni Hesap Ekle
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="px-3 sm:px-6 py-3"><CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">Toplam</CardTitle></CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 pt-0"><div className="text-lg sm:text-2xl font-bold">{accounts.length}</div></CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="px-3 sm:px-6 py-3"><CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">Aktif</CardTitle></CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 pt-0"><div className="text-lg sm:text-2xl font-bold text-emerald-600">{accounts.filter(a => a.is_active).length}</div></CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="px-3 sm:px-6 py-3"><CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">Pasif</CardTitle></CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 pt-0"><div className="text-lg sm:text-2xl font-bold text-muted-foreground">{accounts.filter(a => !a.is_active).length}</div></CardContent>
        </Card>
      </div>

      {accounts.length === 0 ? (
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
            <Building2 className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm sm:text-lg font-medium mb-1">Henüz banka hesabı eklenmemiş</p>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">İlk banka hesabınızı ekleyerek başlayın</p>
            <Button onClick={openCreateDialog} size="sm"><Plus className="mr-2 h-4 w-4" />Hesap Ekle</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {accounts.map((account, index) => (
            <Card key={account.id} className="border-border/50 shadow-sm overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="text-sm sm:text-base font-semibold truncate max-w-[120px] sm:max-w-[200px]">{account.bank_name}</h3>
                      <Badge variant={account.is_active ? 'default' : 'secondary'} className="text-[10px] h-4 px-1 shrink-0">{account.is_active ? 'Aktif' : 'Pasif'}</Badge>
                      <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">Sıra: {account.display_order}</Badge>
                    </div>
                    <div className="grid gap-2 sm:gap-3 sm:grid-cols-2">
                      <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-muted/20 gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-muted-foreground">Hesap Sahibi</p>
                          <p className="text-xs sm:text-sm font-medium truncate">{account.account_holder}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => copyToClipboard(account.account_holder, 'Hesap sahibi')}><Copy className="h-3.5 w-3.5" /></Button>
                      </div>
                      <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-muted/20 gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-muted-foreground">IBAN</p>
                          <p className="text-[11px] sm:text-sm font-mono font-medium truncate">{bankAccountClientService.formatIBAN(account.iban)}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => copyToClipboard(account.iban, 'IBAN')}><Copy className="h-3.5 w-3.5" /></Button>
                      </div>
                      {account.branch_name && (
                        <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20">
                          <p className="text-[10px] text-muted-foreground">Şube</p>
                          <p className="text-xs sm:text-sm font-medium truncate">{account.branch_name}</p>
                        </div>
                      )}
                      {account.swift_code && (
                        <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20">
                          <p className="text-[10px] text-muted-foreground">SWIFT</p>
                          <p className="text-[11px] sm:text-sm font-mono font-medium truncate">{account.swift_code}</p>
                        </div>
                      )}
                    </div>
                    {account.notes && (
                      <div className="p-2.5 sm:p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Not</p>
                        <p className="text-xs sm:text-sm break-words">{account.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex sm:flex-col gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleMoveUp(index)} disabled={index === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleMoveDown(index)} disabled={index === accounts.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openEditDialog(account)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleToggleStatus(account.id, account.is_active)}>{account.is_active ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}</Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleDelete(account.id, account.bank_name)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Banka Hesabını Düzenle' : 'Yeni Banka Hesabı Ekle'}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {editingAccount ? 'Bilgileri güncelleyin. Değişiklikler hemen yansıyacaktır.' : 'Müşteriler EFT/Havale ödemelerinde bu bilgileri görecektir.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label className="text-xs">Banka Adı *</Label><Input value={formData.bank_name} onChange={e => setFormData({ ...formData, bank_name: e.target.value })} placeholder="Ziraat Bankası" className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Hesap Sahibi *</Label><Input value={formData.account_holder} onChange={e => setFormData({ ...formData, account_holder: e.target.value })} placeholder="AXIS3 TEKNOLOJİ A.Ş." className="h-9" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">IBAN *</Label><Input value={formData.iban} onChange={e => setFormData({ ...formData, iban: e.target.value.replace(/\s/g, '').toUpperCase() })} placeholder="TR33 0001 0000 0000 0000 0000 01" maxLength={26} className="h-9" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label className="text-xs">Şube Adı</Label><Input value={formData.branch_name || ''} onChange={e => setFormData({ ...formData, branch_name: e.target.value || null })} placeholder="Merkez Şube" className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Şube Kodu</Label><Input value={formData.branch_code || ''} onChange={e => setFormData({ ...formData, branch_code: e.target.value || null })} placeholder="0001" className="h-9" /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label className="text-xs">Hesap Numarası</Label><Input value={formData.account_number || ''} onChange={e => setFormData({ ...formData, account_number: e.target.value || null })} placeholder="1234567890" className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">SWIFT Kodu</Label><Input value={formData.swift_code || ''} onChange={e => setFormData({ ...formData, swift_code: e.target.value.toUpperCase() || null })} placeholder="TCZBTR2A" maxLength={11} className="h-9" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Notlar</Label><textarea className="w-full min-h-[80px] px-3 py-2 rounded-xl border border-input bg-background text-sm" value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value || null })} placeholder="Bu hesap hakkında notlar..." /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="rounded border-input h-4 w-4" />
              <Label htmlFor="is_active" className="text-xs cursor-pointer">Hesap aktif (Kullanıcılara gösterilsin)</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">İptal</Button></DialogClose>
            <Button onClick={handleSave} size="sm">{editingAccount ? 'Güncelle' : 'Oluştur'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
