'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/providers/auth-provider';
import { TwoFactorToggle } from '@/components/settings/two-factor-toggle';
import { CompanyInfoForm } from '@/components/settings/company-info-form';
import { NotificationPreferences } from '@/components/settings/notification-preferences';
import { AddressFormDialog } from '@/components/dashboard/address-form-dialog';
import { getUserAddresses, deleteAddress, setDefaultAddress, saveAddress, addressToFormData } from '@/lib/services/address-service';
import type { SavedAddress, AddressFormData } from '@/lib/services/address-service';
import { updateProfileSchema } from '@/lib/auth/schemas';
import {
  User, Phone, Shield, Palette, Save, Loader2, Sun, Moon, Monitor, Mail, Key, CheckCircle2, UserCircle, Settings2,
  MapPin, Plus, Pencil, Trash2, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserSettings {
  full_name: string;
  phone: string;
  email: string;
  is_corporate?: boolean;
}

const container = { animate: { transition: { staggerChildren: 0.06 } } };
const itemAnim = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const themes = [
  { id: 'light' as const, label: 'Açık Tema', desc: 'Aydınlık görünüm', icon: Sun, color: 'text-yellow-500', bg: 'from-yellow-500/10 to-yellow-500/5' },
  { id: 'dark' as const, label: 'Koyu Tema', desc: 'Karanlık görünüm', icon: Moon, color: 'text-blue-500', bg: 'from-blue-500/10 to-blue-500/5' },
  { id: 'system' as const, label: 'Sistem Teması', desc: 'Cihaz ayarlarını takip et', icon: Monitor, color: 'text-primary', bg: 'from-primary/10 to-primary/5' },
];

export default function SettingsPage() {
  const { theme, setTheme, systemTheme } = useTheme();
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState('');
  const [formData, setFormData] = useState<UserSettings>({ full_name: '', phone: '', email: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [editingAddress, setEditingAddress] = useState<{ data: AddressFormData; id: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Kullanıcı bulunamadı'); setLoading(false); return; }
      setUserId(user.id);

      const { data: userData, error } = await (supabase.from('users').select('full_name, phone, email, is_corporate') as any).eq('id', user.id).maybeSingle();

      if (error || !userData) {
        setFormData({
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          phone: user.user_metadata?.phone || '',
          email: user.email || '',
        });
      } else {
        const d = userData as { full_name: string; phone: string; email: string; is_corporate: boolean };
        setFormData({
          full_name: d.full_name || '',
          phone: d.phone || '',
          email: d.email || user.email || '',
          is_corporate: d.is_corporate || false,
        });
      }
    } catch {
      toast.error('Ayarlar yüklenirken hata oluştu');
    } finally { setLoading(false); }
  }

  async function handleSaveProfile() {
    if (!userId) { toast.error('Kullanıcı bulunamadı'); return; }
    const result = updateProfileSchema.safeParse({ firstName: formData.full_name?.split(' ')[0] || '', lastName: formData.full_name?.split(' ').slice(1).join(' ') || '', phone: formData.phone });
    if (!result.success) { toast.error(result.error.issues[0].message); return; }

    setSaving(true);
    try {
      const supabase = createClient();
      const patch = {
        full_name: formData.full_name,
        phone: formData.phone,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await (supabase.from('users') as any).update(patch).eq('id', userId);

      if (updateError) {
        const { error: insertError } = await (supabase.from('users') as any).insert({ id: userId, email: formData.email, ...patch });
        if (insertError) { toast.error('Ayarlar güncellenemedi'); return; }
      }

      toast.success('Ayarlar başarıyla güncellendi');
      await refreshProfile();
      await loadSettings();
    } catch {
      toast.error('Ayarlar kaydedilirken hata oluştu');
    } finally { setSaving(false); }
  }

  function handleThemeChange(newTheme: 'light' | 'dark' | 'system') {
    setTheme(newTheme);
    toast.success(`Tema "${newTheme === 'light' ? 'Açık' : newTheme === 'dark' ? 'Koyu' : 'Sistem'}" olarak ayarlandı`);
  }

  async function handleChangePassword() {
    if (!passwordData.newPassword || !passwordData.confirmPassword) { toast.error('Lütfen tüm alanları doldurun'); return; }
    if (passwordData.newPassword !== passwordData.confirmPassword) { toast.error('Yeni şifreler eşleşmiyor'); return; }
    if (passwordData.newPassword.length < 6) { toast.error('Şifre en az 6 karakter olmalıdır'); return; }
    setChangingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) {
        if (error.message.includes('same_password') || error.message.includes('same password')) toast.error('Yeni şifre mevcut şifrenizle aynı olamaz');
        else toast.error('Şifre değiştirilemedi: ' + error.message);
        return;
      }
      toast.success('Şifre başarıyla değiştirildi');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      toast.error('Şifre değiştirilirken hata oluştu');
    } finally { setChangingPassword(false); }
  }

  const fetchAddresses = async () => {
    setAddressLoading(true);
    try {
      const data = await getUserAddresses();
      setAddresses(data || []);
    } catch {} finally { setAddressLoading(false); }
  };

  useEffect(() => { if (userId) fetchAddresses(); }, [userId]);

  const handleSaveAddress = async (data: AddressFormData, existingId?: string) => {
    await saveAddress(data, existingId);
    await fetchAddresses();
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Bu adresi silmek istediginize emin misiniz?')) return;
    try {
      await deleteAddress(id);
      toast.success('Adres silindi');
      await fetchAddresses();
    } catch { toast.error('Silme basarisiz'); }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      await setDefaultAddress(id);
      toast.success('Varsayilan adres guncellendi');
      await fetchAddresses();
    } catch { toast.error('Hata olustu'); }
  };

  const openNewAddress = () => { setEditingAddress(null); setAddressDialogOpen(true); };

  const openEditAddress = (a: SavedAddress) => {
    setEditingAddress({ data: addressToFormData(a), id: a.id });
    setAddressDialogOpen(true);
  };

  const currentTheme = theme === 'system' ? systemTheme : theme;

  if (loading) {
    return (
      <DashboardShell>
        <div className="space-y-8">
          <Skeleton className="h-36 rounded-2xl" />
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <motion.div variants={container} initial="initial" animate="animate" className="space-y-8">

        {/* Hero */}
        <motion.div variants={itemAnim} className="relative overflow-hidden rounded-2xl border-2 border-border bg-gradient-to-br from-primary/5 via-background to-primary/5 p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="gap-1.5 border-primary/20 bg-primary/10 px-3 py-1">
                  <Settings2 className="h-3 w-3 text-primary" />
                  Ayarlar
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Ayarlar</h1>
              <p className="mt-1 text-sm text-muted-foreground">Hesap bilgilerinizi ve tercihlerinizi yönetin</p>
            </div>
          </div>
        </motion.div>

        {/* Profile */}
        <motion.div variants={itemAnim} className="relative overflow-hidden rounded-2xl border-2 border-border/60 bg-card/50 backdrop-blur-sm p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/10">
              <UserCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Profil Bilgileri</h2>
              <p className="text-xs text-muted-foreground">Kişisel bilgilerinizi güncelleyin</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" /> Ad Soyad
              </Label>
              <Input id="fullName" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Adınız Soyadınız" className="border-2 border-border/60 bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> E-posta
              </Label>
              <Input id="email" value={formData.email} disabled className="border-2 border-border/60 bg-background/30 backdrop-blur-sm opacity-60 cursor-not-allowed" />
              <p className="text-xs text-muted-foreground">E-posta adresi değiştirilemez</p>
            </div>

            <Separator className="bg-border/60" />

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Telefon
              </Label>
              <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+90 5XX XXX XX XX" className="border-2 border-border/60 bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50" />
            </div>

            <Button onClick={handleSaveProfile} disabled={saving} className="h-11 rounded-xl px-6 gap-2">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor...</> : <><Save className="h-4 w-4" /> Değişiklikleri Kaydet</>}
            </Button>
          </div>
        </motion.div>

        {/* Addresses */}
        <motion.div variants={itemAnim} className="relative overflow-hidden rounded-2xl border-2 border-border/60 bg-card/50 backdrop-blur-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-base">Adreslerim</h2>
                <p className="text-xs text-muted-foreground">Kayitli adreslerinizi yonetin</p>
              </div>
            </div>
            <Button size="sm" onClick={openNewAddress} className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Yeni Adres
            </Button>
          </div>

          {addressLoading ? (
            <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : addresses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl bg-muted/20 border border-dashed border-border/50">
              <MapPin className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground mb-1">Henuz kayitli adres yok</p>
              <p className="text-xs text-muted-foreground/60 mb-3">Siparis verirken adresinizi kaydedebilirsiniz</p>
              <Button size="sm" variant="outline" onClick={openNewAddress}><Plus className="h-3.5 w-3.5 mr-1.5" />Adres Ekle</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {addresses.map(a => (
                <div key={a.id} className={`flex items-start justify-between gap-3 p-4 rounded-xl border ${
                  a.is_default ? 'border-primary/30 bg-primary/[0.02]' : 'border-border/50 bg-background/30'
                }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="secondary" className="text-[10px] font-normal">{a.title}</Badge>
                      {a.is_default && (
                        <Badge variant="default" className="text-[10px] h-5 gap-1"><Star className="h-3 w-3" />Varsayilan</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{a.address_line1}</p>
                    <p className="text-xs text-muted-foreground/60">{a.full_name} - {a.phone}</p>
                    <p className="text-xs text-muted-foreground/50">{a.city} / {a.district}{a.postal_code ? ` - ${a.postal_code}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditAddress(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDeleteAddress(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    {!a.is_default && (
                      <Button variant="outline" size="sm" className="h-7 text-[11px] px-2 ml-1" onClick={() => handleSetDefaultAddress(a.id)}>Varsayilan Yap</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Theme */}
        <motion.div variants={itemAnim} className="relative overflow-hidden rounded-2xl border-2 border-border/60 bg-card/50 backdrop-blur-sm p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/10">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Görünüm</h2>
              <p className="text-xs text-muted-foreground">Tema tercihlerinizi ayarlayın</p>
            </div>
          </div>

          {mounted && (
            <div className="grid gap-3 sm:grid-cols-3">
              {themes.map((t) => {
                const Icon = t.icon;
                const isActive = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleThemeChange(t.id)}
                    className={cn(
                      'relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all duration-300',
                      isActive
                        ? 'border-primary/50 bg-gradient-to-br shadow-lg shadow-primary/10'
                        : 'border-border/60 bg-background/30 hover:border-border hover:bg-background/50',
                    )}
                  >
                    {isActive && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background/50 mb-3', t.color)}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <p className="font-medium text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.desc}
                      {t.id === 'system' && currentTheme && ` (Şu an: ${currentTheme === 'dark' ? 'Koyu' : 'Açık'})`}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* 2FA */}
        <motion.div variants={itemAnim} className="relative overflow-hidden rounded-2xl border-2 border-border/60 bg-card/50 backdrop-blur-sm p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">İki Faktörlü Doğrulama (2FA)</h2>
              <p className="text-xs text-muted-foreground">Hesabınıza ekstra güvenlik katmanı ekleyin</p>
            </div>
          </div>
          <TwoFactorToggle userId={userId} />
        </motion.div>

        {/* Password */}
        <motion.div variants={itemAnim} className="relative overflow-hidden rounded-2xl border-2 border-border/60 bg-card/50 backdrop-blur-sm p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Şifre Değiştir</h2>
              <p className="text-xs text-muted-foreground">Hesap güvenliğiniz için şifrenizi güncelleyin</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium flex items-center gap-2">
                <Key className="h-3.5 w-3.5 text-muted-foreground" /> Yeni Şifre
              </Label>
              <Input id="newPassword" type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} placeholder="En az 6 karakter" className="border-2 border-border/60 bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium flex items-center gap-2">
                <Key className="h-3.5 w-3.5 text-muted-foreground" /> Yeni Şifre (Tekrar)
              </Label>
              <Input id="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} placeholder="Şifrenizi tekrar girin" className="border-2 border-border/60 bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50" />
            </div>

            <Button onClick={handleChangePassword} disabled={changingPassword || !passwordData.newPassword || !passwordData.confirmPassword} variant="outline" className="h-11 rounded-xl px-6 gap-2">
              {changingPassword ? <><Loader2 className="h-4 w-4 animate-spin" /> Değiştiriliyor...</> : <><Shield className="h-4 w-4" /> Şifreyi Değiştir</>}
            </Button>

            <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/30 rounded-xl p-4 border border-border/40">
              <p>• Şifreniz en az 6 karakter olmalıdır</p>
              <p>• Güçlü bir şifre için harf, rakam ve özel karakter kullanın</p>
            </div>
          </div>
        </motion.div>

        {/* Company Info (Corporate Only) */}
        <motion.div variants={itemAnim}>
          <CompanyInfoForm userId={userId} isCorporate={formData.is_corporate || false} />
        </motion.div>

        {/* Notification Preferences */}
        <motion.div variants={itemAnim}>
          <NotificationPreferences userId={userId} />
        </motion.div>

        <div className="h-4" />
      </motion.div>

      <AddressFormDialog
        open={addressDialogOpen}
        onOpenChange={setAddressDialogOpen}
        onSave={handleSaveAddress}
        initial={editingAddress?.data}
        existingId={editingAddress?.id}
      />
    </DashboardShell>
  );
}
