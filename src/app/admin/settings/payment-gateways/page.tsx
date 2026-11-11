'use client';

import { Settings } from 'lucide-react';
import PaymentGatewaysTab from '@/components/admin/PaymentGatewaysTab';

export default function PaymentGatewaysPage() {
  return (
    <div className="px-4 py-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
          <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-bold tracking-tight truncate">Ödeme Yöntemleri</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">Ödeme gateway&apos;lerini yönetin ve yapılandırın</p>
        </div>
      </div>
      <PaymentGatewaysTab />
    </div>
  );
}
