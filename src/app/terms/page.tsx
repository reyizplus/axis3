import type { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import Link from 'next/link';
import { Shield, FileText, AlertTriangle, Scale, Mail, CheckCircle2, XCircle } from 'lucide-react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Kullanım Koşulları | AXIS3',
  description: 'AXIS3 kullanım koşulları, hizmet şartları ve kullanıcı sorumlulukları.',
  keywords: 'kullanım koşulları, hizmet şartları, kullanıcı sözleşmesi, AXIS3 şartlar',
  url: `${SITE_URL}/terms`,
});

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      <main className="container max-w-4xl py-12 space-y-12 flex-1">
        {/* Hero */}
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold gradient-text">Kullanım Koşulları</h1>
          <p className="text-lg text-muted-foreground">
            Son güncelleme: 18 Nisan 2026
          </p>
        </div>

        {/* Introduction */}
        <section className="glass-light dark:glass rounded-2xl p-8 space-y-4">
          <h2 className="text-2xl font-bold">Giriş</h2>
          <p className="text-muted-foreground leading-relaxed">
            Bu kullanım koşulları, AXIS3 platformunu kullanırken uymanız gereken kuralları ve şartları belirler. 
            Platformumuzu kullanarak bu koşulları kabul etmiş sayılırsınız.
          </p>
        </section>

        {/* Service Description */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Hizmet Tanımı</h2>
          </div>
          
          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Axis3, kullanıcıların STL dosyalarını yükleyerek profesyonel 3D baskı hizmeti alabilecekleri bir platformdur.
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>FDM ve SLA teknolojileri ile 3D baskı</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Çeşitli malzeme seçenekleri</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Otomatik fiyat hesaplama</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Hızlı teslimat</span>
              </li>
            </ul>
          </div>
        </section>

        {/* User Responsibilities */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Kullanıcı Sorumlulukları</h2>
          </div>
          
          <div className="glass-light dark:glass rounded-2xl p-8 space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Hesap Güvenliği</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Hesap bilgilerinizi gizli tutmakla yükümlüsünüz</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Hesabınızda gerçekleşen tüm aktivitelerden sorumlusunuz</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Yetkisiz erişim durumunda derhal bildirim yapmalısınız</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Dosya Yükleme</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Yalnızca yasal ve telif hakkı size ait dosyalar yükleyebilirsiniz</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Zararlı yazılım içeren dosyalar yüklemek yasaktır</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Dosya boyutu 50MB ile sınırlıdır</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Ödeme</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Tüm ödemeler peşin olarak yapılmalıdır</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Fiyatlar KDV dahildir</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Ödeme bilgilerinizin doğruluğundan sorumlusunuz</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Prohibited Uses */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold">Yasak Kullanımlar</h2>
          </div>
          
          <div className="glass-light dark:glass rounded-2xl p-8 border-destructive/20 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Aşağıdaki amaçlarla platformu kullanmanız kesinlikle yasaktır:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <span>Silah, mühimmat veya tehlikeli malzeme üretimi</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <span>Telif hakkı ihlali içeren ürünler</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <span>Yasa dışı veya zararlı içerik</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <span>Platformun güvenliğini tehdit eden aktiviteler</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <span>Spam veya otomatik sistemler kullanımı</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Intellectual Property */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Fikri Mülkiyet</h2>
          </div>
          
          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Yüklediğiniz dosyaların tüm hakları size aittir. Axis3:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Dosyalarınızı yalnızca sipariş işleme amacıyla kullanır</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Dosyalarınızı üçüncü şahıslarla paylaşmaz</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Sipariş tamamlandıktan sonra dosyaları güvenli şekilde saklar</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Limitation of Liability */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold">Sorumluluk Sınırlaması</h2>
          </div>
          
          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Axis3, aşağıdaki durumlardan sorumlu tutulamaz:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-500 mt-2" />
                <span>Dosya tasarımından kaynaklanan üretim hataları</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-500 mt-2" />
                <span>Malzeme özelliklerinden kaynaklanan sınırlamalar</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-500 mt-2" />
                <span>Kargo şirketinden kaynaklanan gecikmeler</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-500 mt-2" />
                <span>Mücbir sebep durumları</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Cancellation and Refund */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">İptal ve İade</h2>
          </div>
          
          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">İptal Koşulları</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Üretim başlamadan önce siparişinizi iptal edebilirsiniz</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Üretim başladıktan sonra iptal mümkün değildir</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">İade Koşulları</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Üretim hatası durumunda tam iade</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Hasarlı teslimat durumunda yeniden üretim</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>İade süresi teslimat tarihinden itibaren 14 gündür</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Changes to Terms */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Değişiklikler</h2>
          
          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Axis3, bu kullanım koşullarını önceden haber vermeksizin değiştirme hakkını saklı tutar. 
              Değişiklikler bu sayfada yayınlandığı anda yürürlüğe girer. Platformu kullanmaya devam ederek 
              güncel koşulları kabul etmiş sayılırsınız.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">İletişim</h2>
          
          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Kullanım koşulları hakkında sorularınız için:
            </p>
            <div className="space-y-2">
              <p className="text-muted-foreground">
                <strong className="text-foreground">E-posta:</strong> legal@axis3.com.tr
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Telefon:</strong> +90 501 045 27 78
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="pt-8 border-t text-center text-sm text-muted-foreground">
          <p>
            Bu koşullar son olarak 18 Nisan 2026 tarihinde güncellenmiştir.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
