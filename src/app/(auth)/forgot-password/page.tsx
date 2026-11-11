import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ForgotPasswordForm } from '@/components/auth/forms/forgot-password-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Şifremi Unuttum',
  description: 'AXIS3 hesabınızın şifresini sıfırlayın. E-posta adresinize gönderilen bağlantı ile yeni şifre belirleyin.',
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

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
