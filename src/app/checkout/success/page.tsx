'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  Package,
  Clock,
  MapPin,
  ArrowRight,
  Home,
  FileText,
  Building2,
  Copy,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { AccordionItem } from '@/components/ui/accordion';
import { motion } from 'framer-motion';
import { celebrateOrderComplete } from '@/lib/celebrations/confetti';
import { toast } from 'sonner';
import Link from 'next/link';

interface BankAccount {
  id: string;
  bank_name: string;
  account_holder: string;
  iban: string;
  branch_name?: string;
  branch_code?: string;
  account_number?: string;
  swift_code?: string;
  currency: string;
  display_order: number;
}

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const paymentMethod = searchParams.get('method') || 'iyzico';
  const [showContent, setShowContent] = useState(false);
  const [orderAmount, setOrderAmount] = useState<number | null>(null);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [estimatedDelivery, setEstimatedDelivery] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [openAccountId, setOpenAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      router.push('/dashboard');
      return;
    }

    const clearCarts = async () => {
      try {
        const { cartService } = await import('@/lib/cart/cart-service');
        await cartService.clearCart();
        if (typeof window !== 'undefined') {
          localStorage.removeItem('axis3_cart_store');
          window.dispatchEvent(new CustomEvent('store-cart-updated'));
        }
      } catch (error) {
        console.error('Failed to clear carts:', error);
      }
    };

    const fetchOrderDetails = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        const { data: orderData } = await (supabase.from('orders') as any)
          .select('total_amount, order_number, estimated_delivery')
          .eq('id', orderId)
          .single();

        if (orderData && 'total_amount' in orderData && 'order_number' in orderData) {
          setOrderAmount((orderData as { total_amount: number; order_number: string; estimated_delivery?: string }).total_amount);
          setOrderNumber((orderData as { total_amount: number; order_number: string; estimated_delivery?: string }).order_number);
          setEstimatedDelivery((orderData as { total_amount: number; order_number: string; estimated_delivery?: string }).estimated_delivery || null);
        }

        const { data: accounts } = await (supabase.from('bank_accounts') as any)
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (accounts && accounts.length > 0) {
          const typedAccounts = accounts as unknown as BankAccount[];
          setBankAccounts(typedAccounts);
          if (typedAccounts.length === 1) {
            setOpenAccountId(typedAccounts[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch order details:', error);
      }
    };

    clearCarts();
    fetchOrderDetails();
    celebrateOrderComplete();
    setTimeout(() => setShowContent(true), 300);
  }, [orderId, router]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} kopyalandı`);
  };

  if (!orderId) return null;

  const estimatedDate = estimatedDelivery
    ? new Date(estimatedDelivery)
    : (() => {
        const fallback = new Date();
        fallback.setDate(fallback.getDate() + 7);
        return fallback;
      })();

  const formattedDate = estimatedDate.toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const isBankTransfer = paymentMethod === 'bank_transfer';

  return (
    <DashboardShell>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 20 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Success Header */}
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mb-4"
            >
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-bold gradient-text">
              Siparişiniz Alındı!
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto">
              {isBankTransfer
                ? 'Ödeme bilgileriniz aşağıda yer almaktadır.'
                : 'Teşekkür ederiz. Siparişiniz başarıyla oluşturuldu.'}
            </p>
          </div>

          {/* Order Number Card */}
          <Card className="glass-light dark:glass border-emerald-500/20 shadow-sm">
            <CardContent className="py-8">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  Sipariş Numarası
                </div>
                <p className="text-2xl sm:text-3xl font-mono font-bold gradient-text tracking-wider">
                  {orderNumber || 'Yükleniyor...'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bank Transfer Details */}
          {isBankTransfer && bankAccounts.length > 0 && (
            <Card className="glass-light dark:glass border-amber-500/20 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-amber-500" />
                  Banka Hesap Bilgileri
                </CardTitle>
                <CardDescription>
                  {bankAccounts.length === 1
                    ? 'Lütfen aşağıdaki hesaba ödemenizi yapın'
                    : 'Aşağıdaki hesaplardan birine ödemenizi yapabilirsiniz'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Önemli:</strong> Açıklama kısmına mutlaka sipariş numaranızı (<strong className="text-foreground">{orderNumber || 'yükleniyor...'}</strong>) yazınız. Aksi takdirde ödemeniz eşleştirilemeyebilir.
                  </p>
                </div>

                <div className="space-y-3">
                  {bankAccounts.map((account) => (
                    <AccordionItem
                      key={account.id}
                      isOpen={openAccountId === account.id}
                      onToggle={() => setOpenAccountId(openAccountId === account.id ? null : account.id)}
                      trigger={
                        <div className="flex items-center justify-between w-full px-4 py-3.5 bg-muted/30 hover:bg-muted/50 transition-colors rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-sm">{account.bank_name}</p>
                              <p className="text-xs text-muted-foreground">{account.account_holder}</p>
                            </div>
                          </div>
                          {openAccountId === account.id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      }
                      content={
                        <div className="p-4 space-y-3 bg-background rounded-b-xl">
                          <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50 gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground mb-1">Hesap Sahibi</p>
                              <p className="font-semibold text-sm break-words">{account.account_holder}</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(account.account_holder, 'Hesap sahibi')} className="shrink-0">
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50 gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground mb-1">IBAN</p>
                              <p className="font-mono font-semibold text-xs sm:text-sm break-all">{account.iban}</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(account.iban, 'IBAN')} className="shrink-0">
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>

                          {account.branch_name && (
                            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Şube</p>
                                <p className="font-semibold text-sm">{account.branch_name}</p>
                                {account.branch_code && <p className="text-xs text-muted-foreground">Kod: {account.branch_code}</p>}
                              </div>
                            </div>
                          )}

                          {account.account_number && (
                            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50 gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground mb-1">Hesap No</p>
                                <p className="font-mono font-semibold text-xs sm:text-sm break-all">{account.account_number}</p>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(account.account_number!, 'Hesap No')} className="shrink-0">
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          )}

                          {account.swift_code && (
                            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50 gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground mb-1">SWIFT</p>
                                <p className="font-mono font-semibold text-xs sm:text-sm break-all">{account.swift_code}</p>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(account.swift_code!, 'SWIFT')} className="shrink-0">
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      }
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Ödenecek Tutar</p>
                    <p className="text-2xl font-bold gradient-text">
                      {orderAmount !== null
                        ? `${orderAmount.toFixed(2)} ${bankAccounts[0]?.currency || 'TRY'}`
                        : 'Yükleniyor...'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">Açıklama (Zorunlu)</p>
                    <p className="font-mono font-semibold text-xs sm:text-sm break-all">{orderNumber || 'Yükleniyor...'}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(orderNumber, 'Sipariş Numarası')} disabled={!orderNumber} className="shrink-0">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <Separator />

                <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                  <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Not:</strong> Ödemeniz 1-2 iş günü içinde kontrol edilecek ve onaylandıktan sonra siparişiniz üretime alınacaktır.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Details */}
          <Card className="glass-light dark:glass shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Sipariş Detayları
              </CardTitle>
              <CardDescription>
                Siparişinizin özeti ve tahmini teslimat bilgileri
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
                  <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm mb-1">Tahmini Teslimat</p>
                    <p className="text-sm text-muted-foreground">{formattedDate}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
                  <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm mb-1">Sipariş Durumu</p>
                    {isBankTransfer ? (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                        Ödeme Bekleniyor
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                        Ödeme Alındı
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Sonraki Adımlar
                </h3>
                <ol className="space-y-2.5 text-sm text-muted-foreground">
                  {isBankTransfer && (
                    <li className="flex items-start gap-2.5">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold">
                        1
                      </span>
                      <span className="pt-0.5">Yukarıdaki banka hesabına ödemenizi yapın (Açıklama kısmına sipariş numaranızı yazın)</span>
                    </li>
                  )}
                  <li className="flex items-start gap-2.5">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      {isBankTransfer ? '2' : '1'}
                    </span>
                    <span className="pt-0.5">{isBankTransfer ? 'Ödemeniz onaylandıktan sonra siparişiniz inceleniyor ve üretim için hazırlanıyor' : 'Siparişiniz inceleniyor ve üretim için hazırlanıyor'}</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      {isBankTransfer ? '3' : '2'}
                    </span>
                    <span className="pt-0.5">3D baskı işlemi başlatılacak</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      {isBankTransfer ? '4' : '3'}
                    </span>
                    <span className="pt-0.5">Kalite kontrolü yapılacak</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      {isBankTransfer ? '5' : '4'}
                    </span>
                    <span className="pt-0.5">Kargoya teslim edilecek ve size ulaştırılacak</span>
                  </li>
                </ol>
              </div>

              <Separator />

              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Not:</strong> Sipariş durumunuz hakkında e-posta ile bilgilendirileceksiniz.
                  Ayrıca &quot;Siparişlerim&quot; sayfasından durumu takip edebilirsiniz.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Button asChild variant="outline" className="h-12">
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Ana Sayfa
              </Link>
            </Button>
            <Button asChild className="h-12 glow-hover">
              <Link href={`/dashboard/orders/${orderId}`}>
                <Package className="mr-2 h-4 w-4" />
                Sipariş Detayları
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 col-span-2 sm:col-span-1">
              <Link href="/dashboard/orders">
                <FileText className="mr-2 h-4 w-4" />
                Tüm Siparişlerim
              </Link>
            </Button>
          </div>

          {/* Support Info */}
          <Card className="glass-light dark:glass border-dashed">
            <CardContent className="py-6">
              <div className="text-center space-y-1.5">
                <p className="text-sm font-semibold">Yardıma mı ihtiyacınız var?</p>
                <p className="text-sm text-muted-foreground">
                  Herhangi bir sorunuz varsa{' '}
                  <Link href="/iletisim" className="text-primary hover:underline font-medium">
                    bizimle iletişime geçin
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardShell>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <DashboardShell>
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <div className="flex items-center justify-center h-[400px]">
            <div className="animate-pulse text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-muted mx-auto" />
              <div className="h-8 w-64 bg-muted rounded mx-auto" />
            </div>
          </div>
        </div>
      </DashboardShell>
    }>
      <SuccessContent />
    </Suspense>
  );
}
