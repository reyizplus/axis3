'use client';

import { useRouter } from 'next/navigation';
import { Button } from './button';
import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  const router = useRouter();
  return (
    <Button variant="ghost" onClick={() => router.back()}>
      <ArrowLeft className="h-4 w-4" />
      Geri
    </Button>
  );
}
