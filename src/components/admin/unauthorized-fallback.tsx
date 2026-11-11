'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function UnauthorizedFallback() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/users');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
