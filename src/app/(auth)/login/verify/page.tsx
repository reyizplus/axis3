'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { TwoFactorForm } from '@/components/auth/forms/two-factor-form';

export const dynamic = 'force-dynamic';

function TwoFactorContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  return <TwoFactorForm email={email || ''} />;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function LoginVerifyPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TwoFactorContent />
    </Suspense>
  );
}
