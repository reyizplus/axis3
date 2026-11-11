import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { LoginForm } from '@/components/auth/forms/login-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Giriş Yap',
  description: 'AXIS3 hesabınıza giriş yapın. 3D baskı hizmetlerimizden yararlanmak için hemen oturum açın.',
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

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginForm />
    </Suspense>
  );
}
