'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Key, Send, Ban, Shield, ShieldOff, CheckCircle2,
  Loader2, AlertTriangle, Trash2,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger, DialogClose,
} from '@/components/ui/dialog';

const ADMIN_SECTIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'orders', label: 'Siparişler' },
  { key: 'materials', label: 'Malzemeler' },
  { key: 'inventory', label: 'Envanter' },
  { key: 'users', label: 'Kullanıcılar' },
  { key: 'cargo', label: 'Kargo' },
  { key: 'storage', label: 'Depo' },
  { key: 'blog', label: 'Blog' },
  { key: 'feedback', label: 'Geri Bildirim' },
  { key: 'store-products', label: 'Mağaza - Ürünler' },
  { key: 'store-categories', label: 'Mağaza - Kategoriler' },
  { key: 'security', label: 'Sunucu Logları' },
  { key: 'settings', label: 'Ayarlar' },
];

interface UserActionsSectionProps {
  userId: string;
  userEmail: string;
  status: string;
  isAdmin: boolean;
  isCurrentUserSuperAdmin?: boolean;
}

export function UserActionsSection({ userId, userEmail, status, isAdmin, isCurrentUserSuperAdmin = false }: UserActionsSectionProps) {
  const router = useRouter();
  const [sendingReset, setSendingReset] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [togglingRole, setTogglingRole] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>(ADMIN_SECTIONS.map(s => s.key));
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleSendPasswordReset = async () => {
    setSendingReset(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, { method: 'POST' });
      const data = await res.json();
      if (data.success) toast.success(`Şifre sıfırlama maili gönderildi: ${userEmail}`);
      else toast.error(data.error || 'Mail gönderilemedi');
    } catch { toast.error('Bir hata oluştu'); } finally { setSendingReset(false); }
  };

  const handleToggleStatus = async () => {
    setTogglingStatus(true);
    try {
      const newStatus = status === 'active' ? 'suspended' : 'active';
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(newStatus === 'active' ? 'Hesap aktifleştirildi' : 'Hesap askıya alındı');
        router.refresh();
      } else toast.error(data.error || 'İşlem başarısız');
    } catch { toast.error('Bir hata oluştu'); } finally { setTogglingStatus(false); }
  };

  const handleDeleteUser = async () => {
    setDeletingUser(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { toast.success('Kullanıcı tamamen silindi'); router.push('/admin/users'); }
      else toast.error(data.error || 'Silme işlemi başarısız');
    } catch { toast.error('Bir hata oluştu'); } finally { setDeletingUser(false); }
  };

  const handleGrantAdmin = async () => {
    if (selectedSections.length === 0) { toast.error('En az bir panel seçmelisiniz'); return; }
    setTogglingRole(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggleRole: true, action: 'grant', sections: selectedSections }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Admin yetkisi verildi'); setGrantDialogOpen(false); router.refresh(); }
      else toast.error(data.error || 'İşlem başarısız');
    } catch { toast.error('Bir hata oluştu'); } finally { setTogglingRole(false); }
  };

  const handleRevokeAdmin = async () => {
    setTogglingRole(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggleRole: true, action: 'revoke' }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Admin yetkisi kaldırıldı'); router.refresh(); }
      else toast.error(data.error || 'İşlem başarısız');
    } catch { toast.error('Bir hata oluştu'); } finally { setTogglingRole(false); }
  };

  const toggleSection = (key: string) => {
    setSelectedSections(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const isDeleted = status === 'deleted';

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden border-orange-500/20">
      <CardHeader className="px-4 sm:px-6 py-4">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Key className="h-4 w-4 text-primary shrink-0" />
          Admin İşlemleri
        </CardTitle>
        <CardDescription className="text-xs">Kullanıcı hesabı yönetim işlemleri</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-6">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {/* Password Reset */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="h-auto flex-col items-start gap-1.5 p-3 sm:p-4" disabled={sendingReset}>
                <div className="flex items-center gap-2 w-full">
                  {sendingReset ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <Send className="h-4 w-4 text-primary shrink-0" />}
                  <span className="font-medium text-xs sm:text-sm">Şifre Sıfırlama</span>
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">Kullanıcıya mail gönder</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Şifre Sıfırlama Maili Gönder</AlertDialogTitle>
                <AlertDialogDescription>
                  <strong>{userEmail}</strong> adresine şifre sıfırlama maili gönderilecek. Onaylıyor musunuz?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>İptal</AlertDialogCancel>
                <AlertDialogAction onClick={handleSendPasswordReset}>
                  {sendingReset ? 'Gönderiliyor...' : 'Gönder'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Account Status */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className={`h-auto flex-col items-start gap-1.5 p-3 sm:p-4 ${isDeleted ? 'opacity-50 pointer-events-none' : status === 'suspended' ? 'border-emerald-500/30' : 'border-amber-500/30'}`}
              >
                <div className="flex items-center gap-2 w-full">
                  {status === 'active' ? <Ban className="h-4 w-4 text-amber-500 shrink-0" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                  <span className="font-medium text-xs sm:text-sm">{status === 'active' ? 'Askıya Al' : 'Aktifleştir'}</span>
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">
                  {status === 'active' ? 'Siteye erişimi engelle' : 'Erişimi tekrar aç'}
                </span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{status === 'active' ? 'Hesabı Askıya Al' : 'Hesabı Aktifleştir'}</AlertDialogTitle>
                <AlertDialogDescription>
                  {status === 'active' ? 'Bu kullanıcı siteye erişemeyecek.' : 'Bu kullanıcı tekrar siteye erişebilecek.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>İptal</AlertDialogCancel>
                <AlertDialogAction onClick={handleToggleStatus}>
                  {togglingStatus ? 'İşleniyor...' : 'Onayla'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Admin Grant */}
          {isCurrentUserSuperAdmin && !isAdmin && (
            <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-auto flex-col items-start gap-1.5 p-3 sm:p-4 border-blue-500/30">
                  <div className="flex items-center gap-2 w-full">
                    <Shield className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="font-medium text-xs sm:text-sm">Admin Yap</span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">Admin yetkisi ver</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Admin Yetkisi Ver</DialogTitle>
                  <DialogDescription>
                    <strong>{userEmail}</strong> için hangi panellere erişim izni verileceğini seçin
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 max-h-64 overflow-y-auto py-2">
                  {ADMIN_SECTIONS.map(section => (
                    <label
                      key={section.key}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-border/60 cursor-pointer hover:bg-muted/30 transition-colors text-xs sm:text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSections.includes(section.key)}
                        onChange={() => toggleSection(section.key)}
                        className="h-4 w-4 rounded border-gray-300 shrink-0"
                      />
                      <span className="font-medium truncate">{section.label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedSections(ADMIN_SECTIONS.map(s => s.key))}>Tümünü Seç</Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedSections([])}>Tümünü Kaldır</Button>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">İptal</Button></DialogClose>
                  <Button onClick={handleGrantAdmin} disabled={togglingRole || selectedSections.length === 0}>
                    {togglingRole ? 'İşleniyor...' : `Admin Yap (${selectedSections.length} panel)`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Admin Revoke */}
          {isCurrentUserSuperAdmin && isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="h-auto flex-col items-start gap-1.5 p-3 sm:p-4 border-orange-500/30">
                  <div className="flex items-center gap-2 w-full">
                    <ShieldOff className="h-4 w-4 text-orange-500 shrink-0" />
                    <span className="font-medium text-xs sm:text-sm">Admin Yetkisini Kaldır</span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">Standart kullanıcıya düşür</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Admin Yetkisini Kaldır</AlertDialogTitle>
                  <AlertDialogDescription>Bu kullanıcının admin yetkileri kaldırılacak.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRevokeAdmin}>
                    {togglingRole ? 'İşleniyor...' : 'Onayla'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Info Card */}
          <div className="flex flex-col items-start gap-1.5 p-3 sm:p-4 rounded-xl bg-muted/20 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium">Bilgi</span>
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground break-words">
              Tüm işlemler denetim günlüğüne kaydedilir.
              <br />Email: {userEmail}
            </span>
          </div>

          {/* Delete */}
          <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="h-auto flex-col items-start gap-1.5 p-3 sm:p-4 border-red-500/30 hover:border-red-500/50">
                <div className="flex items-center gap-2 w-full">
                  <Trash2 className="h-4 w-4 text-red-500 shrink-0" />
                  <span className="font-medium text-xs sm:text-sm text-red-500">Kullanıcıyı Sil</span>
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">Tüm verileriyle sil</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-500 flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />Kullanıcıyı Tamamen Sil
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p className="font-semibold text-foreground">Bu işlem geri alınamaz!</p>
                  <ul className="list-disc list-inside text-xs sm:text-sm space-y-1">
                    <li>Kullanıcı hesabı ve profil bilgileri</li>
                    <li>Yüklediği tüm dosyalar (siparişte olanlar hariç)</li>
                    <li>Adresleri, sepeti ve geri bildirimleri</li>
                    <li>Şifre sıfırlama tokenları ve doğrulama kodları</li>
                  </ul>
                  <p className="text-xs sm:text-sm font-medium mt-2"><strong>{userEmail}</strong> tamamen silinecek.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>İptal</AlertDialogCancel>
                <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteUser}>
                  {deletingUser ? 'Siliniyor...' : 'Kullanıcıyı Sil'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
