import type { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import Link from 'next/link';
import { Shield, Eye, Lock, Database, UserCheck, Mail } from 'lucide-react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Gizlilik Politikası | AXIS3',
  description: 'AXIS3 gizlilik politikası ve kişisel veri koruma uygulamaları.',
  keywords: 'gizlilik politikası, kişisel veri, veri güvenliği, AXIS3 gizlilik',
  url: `${SITE_URL}/privacy`,
});

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      <main className="container max-w-4xl py-12 space-y-12 flex-1">
        {/* Hero */}
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold gradient-text">Gizlilik Politikası</h1>
          <p className="text-lg text-muted-foreground">
            Son güncelleme: 18 Nisan 2026
          </p>
        </div>

        {/* Introduction */}
        <section className="glass-light dark:glass rounded-2xl p-8 space-y-4">
          <h2 className="text-2xl font-bold">Giriş</h2>
          <p className="text-muted-foreground leading-relaxed">
            AXIS3 olarak, kullanıcılarımızın gizliliğini korumayı en önemli önceliklerimizden biri olarak görüyoruz. 
            Bu gizlilik politikası, kişisel verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar.
          </p>
        </section>

        {/* Data Collection */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Toplanan Veriler</h2>
          </div>
          
          <div className="glass-light dark:glass rounded-2xl p-8 space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Kişisel Bilgiler</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Ad, soyad ve iletişim bilgileri</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>E-posta adresi ve telefon numarası</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Teslimat adresi bilgileri</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Teknik Veriler</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>IP adresi ve tarayıcı bilgileri</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Çerez ve oturum verileri</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Kullanım istatistikleri</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Dosya Verileri</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Yüklenen STL dosyaları</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Dosya meta verileri (boyut, tarih, vb.)</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Data Usage */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Verilerin Kullanımı</h2>
          </div>
          
          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Topladığımız veriler aşağıdaki amaçlarla kullanılır:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>3D baskı siparişlerinizi işlemek ve teslim etmek</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Hesap güvenliğinizi sağlamak</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Müşteri desteği sunmak</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Hizmet kalitemizi iyileştirmek</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Yasal yükümlülüklerimizi yerine getirmek</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Data Security */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Veri Güvenliği</h2>
          </div>
          
          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Verilerinizin güvenliğini sağlamak için endüstri standardı güvenlik önlemleri kullanıyoruz:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>SSL/TLS şifreleme ile güvenli veri iletimi</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Şifreli veritabanı depolama</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Düzenli güvenlik denetimleri</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Sınırlı personel erişimi</span>
              </li>
            </ul>
          </div>
        </section>

        {/* User Rights */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <UserCheck className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Kullanıcı Hakları</h2>
          </div>
          
          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              KVKK kapsamında aşağıdaki haklara sahipsiniz:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Kişisel verilerinizin işlenip işlenmediğini öğrenme</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>İşlenmişse buna ilişkin bilgi talep etme</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Verilerin düzeltilmesini veya silinmesini isteme</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Verilerin aktarıldığı üçüncü kişileri öğrenme</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Contact */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">İletişim</h2>
          </div>
          
          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Gizlilik politikamız hakkında sorularınız için bizimle iletişime geçebilirsiniz:
            </p>
            <div className="space-y-2">
              <p className="text-muted-foreground">
                <strong className="text-foreground">E-posta:</strong> privacy@axis3.com.tr
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Adres:</strong> Gaziantep, Türkiye
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="pt-8 border-t text-center text-sm text-muted-foreground">
          <p>
            Bu politika son olarak 18 Nisan 2026 tarihinde güncellenmiştir.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
