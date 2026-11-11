import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ResetPasswordForm } from '@/components/auth/forms/reset-password-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Şifre Sıfırla',
  description: 'AXIS3 hesabınızın şifresini sıfırlayın. Yeni şifrenizi belirleyin.',
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
