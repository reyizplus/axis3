/**
 * Payment Callback Page
 * /checkout/callback
 * 
 * This page receives the payment callback from iyzico after 3D Secure
 * It extracts the token and forwards it to the API endpoint for processing
 */

'use client';

import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

export default function PaymentCallbackPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
        <div className="max-w-7xl mx-auto flex h-16 items-center px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Image
              src="/navbar-logo.png"
              alt="AXIS3"
              width={110}
              height={36}
              priority
              className="h-9 w-auto object-contain"
            />
          </Link>
        </div>
      </header>
      <main className="flex-1">
        <Suspense fallback={
          <div className="flex items-center justify-center py-16 px-4">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="mt-4 text-muted-foreground">Yükleniyor...</p>
            </div>
          </div>
        }>
          <PaymentCallbackContent />
        </Suspense>
      </main>
    </div>
  );
}

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Ödeme işleminiz kontrol ediliyor...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get token from URL query parameters
        const token = searchParams.get('token');
        
        if (!token) {
          console.error('[Callback Page] No token found in URL');
          setStatus('error');
          setMessage('Geçersiz ödeme token\'ı');
          setTimeout(() => {
            router.push('/checkout/failed?error=invalid_token');
          }, 2000);
          return;
        }

        console.log('[Callback Page] Processing payment with token:', token);

        // Forward to API endpoint for processing
        const response = await fetch('/api/v1/payments/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();

        if (result.success && result.orderId) {
          console.log('[Callback Page] Payment successful, redirecting to success page');
          setStatus('success');
          setMessage('Ödeme başarılı! Yönlendiriliyorsunuz...');
          
          // Redirect to success page
          setTimeout(() => {
            router.push(`/checkout/success?orderId=${result.orderId}`);
          }, 1500);
        } else {
          console.error('[Callback Page] Payment failed:', result.error);
          setStatus('error');
          setMessage(result.error || 'Ödeme işlemi başarısız');
          
          // Redirect to failed page
          setTimeout(() => {
            const errorParam = result.error ? `&error=${encodeURIComponent(result.error)}` : '';
            const orderParam = result.orderId ? `orderId=${result.orderId}` : '';
            router.push(`/checkout/failed?${orderParam}${errorParam}`);
          }, 2000);
        }
      } catch (error) {
        console.error('[Callback Page] Exception during callback processing:', error);
        setStatus('error');
        setMessage('Ödeme işlemi sırasında bir hata oluştu');
        
        setTimeout(() => {
          router.push('/checkout/failed?error=callback_failed');
        }, 2000);
      }
    };

    processCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-md w-full mx-4">
        <div className="bg-card border border-border/50 rounded-2xl shadow-xl p-8 text-center">
          {/* Status Icon */}
          <div className="mb-6">
            {status === 'processing' && (
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <svg
                  className="w-10 h-10 text-emerald-600 dark:text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
            {status === 'error' && (
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10">
                <svg
                  className="w-10 h-10 text-destructive"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Status Message */}
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {status === 'processing' && 'İşleniyor'}
            {status === 'success' && 'Başarılı'}
            {status === 'error' && 'Hata'}
          </h1>
          
          <p className="text-muted-foreground mb-6">
            {message}
          </p>

          {/* Loading Indicator */}
          {status === 'processing' && (
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
            </div>
          )}

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Lütfen bu sayfayı kapatmayın veya yenilemeyin
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
