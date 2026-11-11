'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function StoreCartRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/cart');
  }, [router]);

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
