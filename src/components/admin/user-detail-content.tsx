'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  ArrowLeft, User, Shield, Package, FileText, Activity,
  CheckCircle2, XCircle, MapPin, MessageSquare, HardDrive, LogIn,
  CreditCard, TrendingUp, DollarSign, ShoppingCart, RefreshCw,
} from 'lucide-react';
import { useAdminShell } from '@/components/layout/admin-shell';
import { UserActivitySection } from './user-activity-section';
import { UserFilesSection } from './user-files-section';
import { UserOrdersSection } from './user-orders-section';
import { UserActionsSection } from './user-actions-section';
import { UserSecuritySection, type AuthEvent } from './user-security-section';
import { UserCartSection, type CartRecord } from './user-cart-section';
import { Progress } from '@/components/ui/progress';

interface UserProfile {
  id: string; email: string; full_name: string;
  phone: string | null; company_name: string | null; is_corporate: boolean;
  tax_number: string | null; tax_office: string | null;
  email_verified: boolean; email_verified_at: string | null;
  phone_verified: boolean; two_factor_enabled: boolean;
  status: string; upload_quota_bytes: number | null;
  created_at: string; updated_at: string; deleted_at: string | null;
  last_sign_in_at: string | null; is_admin: boolean; auth_created_at: string;
}

interface AddressRecord {
  id: string; title: string; full_name: string; phone: string;
  address_line1: string; address_line2: string | null; city: string; district: string;
  postal_code: string | null; country: string; is_default: boolean; address_type: string;
}

interface FeedbackRecord {
  id: string; category: string; title: string; description: string;
  status: string; priority: string; created_at: string;
}

interface StorageUsage { totalBytes: number; fileCount: number; }
interface QuotaInfo { used: number; total: number; remaining: number; canUpload: boolean; bonus: number; }
interface PaymentRecord { id: string; amount: number; payment_method: string; status: string; created_at: string; }
interface PricingRule { id: string; material_id: string | null; markup_percentage: number | null; discount_percentage: number | null; valid_from: string; valid_until: string | null; }
interface GuestSession { id: string; session_id: string; email: string | null; files_uploaded: number; last_activity: string; created_at: string; }
interface Order { id: string; order_number: string; status: string; payment_status: string; total_amount: number; created_at: string; order_items: any[]; }
interface UploadedFile { id: string; original_filename: string; file_size: number; volume_cm3: number | null; surface_area_cm2: number | null; analysis_status: string; has_errors: boolean; created_at: string; storage_path: string; mime_type: string; }

interface UserDetailContentProps {
  userData: UserProfile; orders: Order[]; files: UploadedFile[];
  activityLogs: any[]; addresses: AddressRecord[]; feedback: FeedbackRecord[];
  storageUsage: StorageUsage; guestSession: GuestSession | null; quotaInfo: QuotaInfo;
  authEvents: AuthEvent[]; payments: PaymentRecord[]; pricingRules: PricingRule[];
  cart: CartRecord | null;
  isCurrentUserSuperAdmin?: boolean;
  targetPermissions?: string[];
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  suspended: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  deleted: 'bg-red-500/10 text-red-600 border-red-500/20',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const TABS = [
  { value: 'overview', label: 'Genel' },
  { value: 'orders', label: 'Siparişler' },
  { value: 'cart', label: 'Sepet' },
  { value: 'files', label: 'Dosyalar' },
  { value: 'activity', label: 'Aktivite' },
  { value: 'security', label: 'Güvenlik' },
] as const;

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
  { key: 'coupons', label: 'Kuponlar' },
  { key: 'security', label: 'Sunucu Logları' },
  { key: 'settings', label: 'Ayarlar' },
] as const;

export function UserDetailContent({
  userData, orders, files, activityLogs, addresses, feedback,
  storageUsage, guestSession, quotaInfo, authEvents, payments, pricingRules, cart,
  isCurrentUserSuperAdmin = false, targetPermissions = [],
}: UserDetailContentProps) {
  const router = useRouter();
  const { setSidebarOpen } = useAdminShell();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(targetPermissions);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const showPermissionsTab = isCurrentUserSuperAdmin && userData.is_admin;

  const handleTogglePermission = (key: string) => {
    setSelectedPermissions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSavePermissions = async () => {
    setSavingPermissions(true);
    try {
      const res = await fetch(`/api/admin/users/${userData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setPermissions: true, permissions: selectedPermissions }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Yetkiler güncellendi'); router.refresh(); }
      else toast.error(data.error || 'Güncellenemedi');
    } catch { toast.error('Bir hata oluştu'); } finally { setSavingPermissions(false); }
  };

  const totalSpent = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const avgOrderValue = orders.length > 0 ? totalSpent / orders.length : 0;
  const statusLabel = userData.status === 'active' ? 'Aktif' : userData.status === 'suspended' ? 'Askıda' : 'Silindi';

  return (
    <div className="px-4 py-6 max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
          <Link href="/admin/users"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
          <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-xl font-bold tracking-tight truncate">{userData.full_name || 'İsimsiz Kullanıcı'}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{userData.email}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className={`text-[10px] sm:text-xs font-medium ${statusColors[userData.status] || 'bg-gray-500/10 text-gray-600'}`}>
            {statusLabel}
          </Badge>
          {userData.is_admin && (
            <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 text-[10px] sm:text-xs shrink-0">
              <Shield className="h-2.5 w-2.5 mr-0.5" />Admin
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-2">
          <div className="overflow-x-auto -mx-1 px-1 scrollbar-none flex-1">
            <TabsList className="w-max min-w-full inline-flex">
              {TABS.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-[11px] sm:text-sm shrink-0">{tab.label}</TabsTrigger>
              ))}
              {showPermissionsTab && (
                <TabsTrigger value="permissions" className="text-[11px] sm:text-sm shrink-0">Yetkiler</TabsTrigger>
              )}
            </TabsList>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => router.refresh()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-5 mt-5">
          {/* Profile + Stats */}
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2 border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="px-4 sm:px-6 py-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary shrink-0" />
                  Profil Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Ad Soyad</p>
                      <p className="text-xs sm:text-sm font-medium mt-0.5 break-words">{userData.full_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">E-posta</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <p className="text-xs sm:text-sm font-medium break-words">{userData.email}</p>
                        {userData.email_verified ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px] h-4 px-1 shrink-0">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Doğr.
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 text-[10px] h-4 px-1 shrink-0">
                            <XCircle className="h-2.5 w-2.5 mr-0.5" />Doğr.
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Telefon</p>
                      <p className="text-xs sm:text-sm font-medium mt-0.5">{userData.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Hesap Türü</p>
                      <p className="text-xs sm:text-sm font-medium mt-0.5">{userData.is_corporate ? 'Kurumsal' : 'Bireysel'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Firma Adı</p>
                      <p className="text-xs sm:text-sm font-medium mt-0.5 break-words">{userData.company_name || '-'}</p>
                    </div>
                    {userData.is_corporate && (
                      <>
                        <div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Vergi Dairesi</p>
                          <p className="text-xs sm:text-sm font-medium mt-0.5 break-words">{userData.tax_office || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Vergi Numarası</p>
                          <p className="text-xs sm:text-sm font-medium mt-0.5 break-words">{userData.tax_number || '-'}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">2FA Durumu</p>
                      <p className="text-xs sm:text-sm font-medium mt-0.5">{userData.two_factor_enabled ? 'Aktif' : 'Devre Dışı'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Model Yükleme Kotası</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Package className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-xs sm:text-sm font-medium">{quotaInfo.used} / {quotaInfo.total} kullanıldı</span>
                      </div>
                      <Progress value={(quotaInfo.used / quotaInfo.total) * 100} className="h-1.5 mt-1" />
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] sm:text-xs text-muted-foreground">
                        <span>Temel: 3</span>
                        <span>Siparişler: +{Math.max(0, quotaInfo.total - 3 - quotaInfo.bonus)}</span>
                        <span>Bonus: +{quotaInfo.bonus}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="px-4 sm:px-6 py-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary shrink-0" />
                  Hızlı Bilgiler
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-6 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Package, label: 'Siparişler', value: orders.length, primary: false },
                    { icon: FileText, label: 'Modeller', value: files.length, primary: false },
                    { icon: DollarSign, label: 'Harcama', value: `₺${totalSpent.toFixed(2)}`, primary: true },
                    { icon: TrendingUp, label: 'Ort. Sipariş', value: `₺${avgOrderValue.toFixed(2)}`, primary: false },
                  ].map(({ icon: Icn, label, value, primary }) => (
                    <div key={label} className="p-2.5 sm:p-3 rounded-xl bg-muted/20">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icn className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-[10px] sm:text-xs text-muted-foreground">{label}</span>
                      </div>
                      <span className={`text-sm sm:text-lg font-bold ${primary ? 'text-primary' : ''}`}>{value}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5 text-xs sm:text-sm">
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Kayıt Tarihi</p>
                    <p className="text-xs sm:text-sm font-medium">{new Date(userData.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Son Giriş</p>
                    <p className="text-xs sm:text-sm font-medium">{userData.last_sign_in_at ? new Date(userData.last_sign_in_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Hiç giriş yapmadı'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Addresses */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="px-4 sm:px-6 py-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                Adres Bilgileri
              </CardTitle>
              <CardDescription className="text-xs">{addresses.length} kayıtlı adres</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-6">
              {addresses.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Kayıtlı adres bulunmuyor</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="p-3 sm:p-4 rounded-xl bg-muted/20 border border-border/40 space-y-1 text-xs sm:text-sm">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold">{addr.title}</span>
                        {addr.is_default && <Badge variant="outline" className="text-[10px] h-4 px-1">Varsayılan</Badge>}
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          {addr.address_type === 'shipping' ? 'Teslimat' : addr.address_type === 'billing' ? 'Fatura' : 'Her İkisi'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{addr.full_name} - {addr.phone}</p>
                      <p className="text-muted-foreground break-words">
                        {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}, {addr.district}/{addr.city}, {addr.country}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cart Overview */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="px-4 sm:px-6 py-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary shrink-0" />
                Sepet
              </CardTitle>
              <CardDescription className="text-xs">{cart ? `${cart.items.length} kalem, ${cart.totalItems} adet` : 'Aktif sepet yok'}</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-6">
              {!cart || cart.items.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sepet boş</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20">
                    <p className="text-[10px] text-muted-foreground">Toplam Ürün</p>
                    <p className="text-sm sm:text-lg font-bold mt-0.5">{cart.totalItems}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20">
                    <p className="text-[10px] text-muted-foreground">Tutar</p>
                    <p className="text-sm sm:text-lg font-bold mt-0.5 text-primary">₺{cart.totalPrice.toFixed(2)}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20">
                    <p className="text-[10px] text-muted-foreground">Kalem</p>
                    <p className="text-sm sm:text-lg font-bold mt-0.5">{cart.items.length}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Storage + Payments */}
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="px-4 sm:px-6 py-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-primary shrink-0" />
                  Depolama
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-6">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20">
                    <p className="text-[10px] text-muted-foreground">Kullanılan</p>
                    <p className="text-xs sm:text-sm font-bold mt-0.5">{formatBytes(storageUsage.totalBytes)}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20">
                    <p className="text-[10px] text-muted-foreground">Dosya</p>
                    <p className="text-xs sm:text-sm font-bold mt-0.5">{storageUsage.fileCount}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20">
                    <p className="text-[10px] text-muted-foreground">Kota</p>
                    <p className="text-xs sm:text-sm font-bold mt-0.5 truncate">{userData.upload_quota_bytes ? formatBytes(userData.upload_quota_bytes) : 'Sınırsız'}</p>
                  </div>
                </div>
                {userData.upload_quota_bytes && storageUsage.totalBytes > 0 && (
                  <Progress value={Math.min(100, (storageUsage.totalBytes / userData.upload_quota_bytes) * 100)} className="h-1.5 mt-3" />
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="px-4 sm:px-6 py-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary shrink-0" />
                  Ödemeler
                </CardTitle>
                <CardDescription className="text-xs">{payments.length} kayıt</CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-6">
                {payments.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Ödeme kaydı yok</p>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {payments.slice(0, 10).map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/20 text-xs sm:text-sm">
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold">₺{p.amount.toFixed(2)}</span>
                          <span className="text-muted-foreground ml-1.5 text-[10px]">{p.payment_method}</span>
                        </div>
                        <Badge variant="outline" className={`text-[10px] h-4 px-1 shrink-0 ml-2 ${
                          p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {p.status === 'paid' ? 'Ödendi' : 'Bekliyor'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Feedback */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="px-4 sm:px-6 py-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                Geri Bildirimler
              </CardTitle>
              <CardDescription className="text-xs">{feedback.length} kayıt</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-6">
              {feedback.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Geri bildirim yok</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {feedback.map((item) => (
                    <div key={item.id} className="flex items-start justify-between p-3 sm:p-4 rounded-xl bg-muted/20 border border-border/40 gap-2">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-semibold truncate">{item.title}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">{item.category}</Badge>
                        </div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 break-words">{item.description}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] h-4 px-1 shrink-0 ${
                        item.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-600' :
                        item.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600' :
                        'bg-gray-500/10 text-gray-600'
                      }`}>
                        {item.status === 'resolved' ? 'Çözüldü' : item.status === 'in_progress' ? 'İşleniyor' : 'Beklemede'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Guest Session */}
          {guestSession && (
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="px-4 sm:px-6 py-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <LogIn className="h-4 w-4 text-primary shrink-0" />
                  Misafir Oturumu
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20">
                    <p className="text-[10px] text-muted-foreground">Oturum ID</p>
                    <p className="text-xs sm:text-sm font-medium mt-0.5 truncate">{guestSession.session_id}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20">
                    <p className="text-[10px] text-muted-foreground">Yüklenen Dosyalar</p>
                    <p className="text-xs sm:text-sm font-medium mt-0.5">{guestSession.files_uploaded}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20">
                    <p className="text-[10px] text-muted-foreground">Son Aktivite</p>
                    <p className="text-xs sm:text-sm font-medium mt-0.5">{new Date(guestSession.last_activity).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing Rules */}
          {pricingRules.length > 0 && (
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="px-4 sm:px-6 py-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary shrink-0" />
                  Fiyatlandırma
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-6">
                <div className="space-y-1.5">
                  {pricingRules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-muted/20 text-xs sm:text-sm">
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold">
                          {rule.markup_percentage != null ? `+%${rule.markup_percentage}` : ''}
                          {rule.discount_percentage != null ? ` -%${rule.discount_percentage}` : ''}
                        </span>
                        <span className="text-muted-foreground ml-2">Malzeme: {rule.material_id || 'Tümü'}</span>
                      </div>
                      <span className="text-muted-foreground shrink-0 ml-2 text-[10px]">
                        {new Date(rule.valid_from).toLocaleDateString('tr-TR')}
                        {rule.valid_until ? ` - ${new Date(rule.valid_until).toLocaleDateString('tr-TR')}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <UserActionsSection
            userId={userData.id}
            userEmail={userData.email}
            status={userData.status}
            isAdmin={userData.is_admin}
            isCurrentUserSuperAdmin={isCurrentUserSuperAdmin}
          />
        </TabsContent>

        {/* Orders */}
        <TabsContent value="orders" className="space-y-5 mt-5">
          <UserOrdersSection orders={orders} />
        </TabsContent>

        {/* Cart */}
        <TabsContent value="cart" className="space-y-5 mt-5">
          <UserCartSection cart={cart} />
        </TabsContent>

        {/* Files */}
        <TabsContent value="files" className="space-y-5 mt-5">
          <UserFilesSection files={files as any} />
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity" className="space-y-5 mt-5">
          <UserActivitySection activityLogs={activityLogs} />
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-5 mt-5">
          <UserSecuritySection authEvents={authEvents} />
        </TabsContent>

        {/* Permissions */}
        {showPermissionsTab && (
          <TabsContent value="permissions" className="space-y-5 mt-5">
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="px-4 sm:px-6 py-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary shrink-0" />
                  Admin Yetkileri
                </CardTitle>
                <CardDescription className="text-xs">Hangi admin bölümlerine erişebileceğini belirleyin</CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-6">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {ADMIN_SECTIONS.map(section => (
                    <label
                      key={section.key}
                      className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border border-border/60 cursor-pointer hover:bg-muted/30 transition-colors text-xs sm:text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(section.key)}
                        onChange={() => handleTogglePermission(section.key)}
                        className="h-4 w-4 rounded border-gray-300 shrink-0"
                      />
                      <span className="font-medium truncate">{section.label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-5">
                  <Button onClick={handleSavePermissions} disabled={savingPermissions} size="sm">
                    {savingPermissions ? 'Kaydediliyor...' : 'Yetkileri Kaydet'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedPermissions(ADMIN_SECTIONS.map(s => s.key))}>
                    Tümünü Seç
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedPermissions([])}>
                    Tümünü Kaldır
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
