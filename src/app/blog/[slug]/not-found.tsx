import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { FileQuestion } from 'lucide-react';
import Link from 'next/link';

export default function BlogPostNotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md mx-auto text-center space-y-8">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
              <FileQuestion className="h-10 w-10 text-primary/60" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Blog Yazısı Bulunamadı</h1>
            <p className="text-muted-foreground">
              Aradığınız blog yazısı bulunamadı veya yayından kaldırılmış olabilir.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Link
              href="/blog"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Blog&apos;a Dön
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-border/60 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Ana Sayfa
            </Link>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
