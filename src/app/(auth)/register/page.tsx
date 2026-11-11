import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { RegisterForm } from '@/components/auth/forms/register-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Kayıt Ol',
  description: 'AXIS3 hesabı oluşturun. 3D baskı hizmetlerimizden yararlanmak için hemen kaydolun.',
  robots: {
    index: false,
    follow: false,
  },
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RegisterForm />
    </Suspense>
  );
}
