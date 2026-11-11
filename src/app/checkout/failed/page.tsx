'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { XCircle, ArrowLeft, RefreshCw, HelpCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const error = searchParams.get('error');

  const getErrorMessage = (errorCode: string | null) => {
    if (!errorCode) return 'Ödeme işlemi tamamlanamadı. Lütfen tekrar deneyin.';

    const errorMessages: Record<string, string> = {
      'invalid_token': 'Geçersiz ödeme tokenı. Lütfen tekrar deneyin.',
      'callback_failed': 'Ödeme işlemi sırasında bir hata oluştu.',
      'payment_failed': 'Ödeme başarısız oldu. Lütfen kart bilgilerinizi kontrol edin.',
      'insufficient_funds': 'Yetersiz bakiye. Lütfen başka bir kart deneyin.',
      'card_declined': 'Kartınız reddedildi. Lütfen bankanızla iletişime geçin.',
      '3ds_failed': '3D Secure doğrulaması başarısız oldu.',
    };

    return errorMessages[errorCode] || errorCode;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-16 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="glass-light dark:glass border-red-500/20 shadow-sm">
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="flex justify-center mb-4"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 relative">
                  <XCircle className="h-12 w-12 text-red-500" />
                </div>
              </div>
            </motion.div>
            <CardTitle className="text-2xl sm:text-3xl font-bold">Ödeme Başarısız</CardTitle>
            <CardDescription className="text-base mt-2 max-w-md mx-auto">
              {getErrorMessage(error)}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {orderId && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border/50">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Sipariş Numarası</p>
                  <p className="font-mono font-semibold text-sm">{orderId}</p>
                </div>
                <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 shrink-0">
                  Başarısız
                </Badge>
              </div>
            )}

            <div className="space-y-3 rounded-xl bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Önerilen Adımlar
              </div>
              <ul className="space-y-2">
                {[
                  'Kart bilgilerinizi kontrol edip tekrar deneyin',
                  'Farklı bir ödeme yöntemi kullanın',
                  'Bankanızla iletişime geçin',
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {orderId ? (
                <>
                  <Button asChild className="flex-1 h-11 glow-hover">
                    <Link href={`/checkout?orderId=${orderId}`}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Tekrar Dene
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1 h-11">
                    <Link href="/dashboard/orders">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Siparişlerim
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild className="flex-1 h-11 glow-hover">
                    <Link href="/cart">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Sepete Dön
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1 h-11">
                    <Link href="/dashboard">
                      Dashboard
                    </Link>
                  </Button>
                </>
              )}
            </div>

            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5" />
                Sorun devam ederse{' '}
                <Link href="/iletisim" className="text-primary hover:underline font-medium">
                  destek ekibimizle
                </Link>
                iletişime geçin.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <Suspense fallback={
          <div className="flex items-center justify-center py-16 px-4">
            <div className="animate-pulse text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto" />
              <div className="h-6 w-48 bg-muted rounded mx-auto" />
            </div>
          </div>
        }>
          <PaymentFailedContent />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
