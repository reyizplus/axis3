import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />
      <main className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="max-w-md w-full glass-light dark:glass">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-6xl font-bold text-primary">404</h1>
              <h2 className="text-2xl font-semibold">Sayfa Bulunamadı</h2>
              <p className="text-muted-foreground">
                Aradığınız sayfa mevcut değil veya taşınmış olabilir.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link href="/">Ana Sayfaya Dön</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
