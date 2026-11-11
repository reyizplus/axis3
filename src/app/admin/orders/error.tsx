'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RefreshCcw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function OrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Orders page error:', error);
  }, [error]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">
      <Card className="border-destructive/30 bg-destructive/[0.03]">
        <CardContent className="flex flex-col items-center py-16">
          <div className="rounded-full bg-destructive/10 p-4 mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">Siparişler Yüklenemedi</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
            Sipariş listesi yüklenirken beklenmeyen bir hata oluştu.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={reset} variant="default" className="gap-2">
              <RefreshCcw className="h-4 w-4" /> Tekrar Dene
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/admin"><ArrowLeft className="h-4 w-4" /> Panale Dön</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
