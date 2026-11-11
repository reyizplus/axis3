import type { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import Link from 'next/link';
import { FileSignature, CheckCircle2, Scale, AlertTriangle, XCircle, Mail, Clock } from 'lucide-react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Mesafeli Satış Sözleşmesi | AXIS3',
  description: 'AXIS3 mesafeli satış sözleşmesi, ön bilgilendirme ve cayma hakkı koşulları.',
  keywords: 'mesafeli satış, ön bilgilendirme, cayma hakkı, tüketici hakları, AXIS3 satış sözleşmesi',
  url: `${SITE_URL}/mesafeli-satis-sozlesmesi`,
});

export default function MesafeliSatisSozlesmesiPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      <main className="container max-w-4xl py-12 space-y-12 flex-1">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <FileSignature className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold gradient-text">Mesafeli Satış Sözleşmesi</h1>
          <p className="text-lg text-muted-foreground">
            Son güncelleme: 8 Haziran 2026
          </p>
        </div>

        <section className="glass-light dark:glass rounded-2xl p-8 space-y-4">
          <h2 className="text-2xl font-bold">Madde 1 - Taraflar</h2>
          <div className="space-y-2">
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">SATICI:</strong>
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li><strong>Ünvan:</strong> AXIS3 Endüstriyel 3D Baskı Çözümleri</li>
              <li><strong>Adres:</strong> Gaziantep, Türkiye</li>
              <li><strong>E-posta:</strong> info@axis3.com.tr</li>
              <li><strong>Telefon:</strong> +90 501 045 27 78</li>
            </ul>
          </div>
          <div className="space-y-2 mt-4">
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">ALICI:</strong> Sipariş sırasında kimlik ve iletişim bilgilerini sağlayan gerçek veya tüzel kişidir.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <FileSignature className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Madde 2 - Sözleşmenin Konusu</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Bu sözleşmenin konusu, ALICI&rsquo;nın SATICI&rsquo;ya ait AXIS3 platformu üzerinden sipariş verdiği 3D baskı hizmet ve ürünlerinin satışı, teslimatı ve ödeme koşullarına ilişkin tarafların hak ve yükümlülüklerinin belirlenmesidir.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Madde 3 - Sipariş ve Ön Bilgilendirme</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              ALICI, sipariş vermeden önce platform üzerinde aşağıdaki konularda ön bilgilendirme alır:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Malzeme türü, kalite seviyesi ve tahmini üretim süresi</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Toplam ürün bedeli, KDV ve varsa kargo ücreti dahil nihai fiyat</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Ödeme yöntemleri ve taksit seçenekleri</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Teslimat süresi ve kargo bilgileri</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Cayma hakkı ve iade koşulları</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Madde 4 - Sözleşmenin Kurulması</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              ALICI, sipariş sürecini tamamlayarak &ldquo;Siparişi Tamamla&rdquo; butonuna tıkladığında ve ödemeyi gerçekleştirdiğinde bu sözleşme kurulmuş olur. Sipariş onay e-postası, sözleşmenin kurulduğuna dair teyit niteliğindedir. SATICI, siparişi onaylamama hakkını saklı tutar. Bu durumda ALICI&rsquo;ya bilgi verilir ve ödeme iadesi yapılır.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Madde 5 - Teslimat</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Teslimat koşulları aşağıdaki gibidir:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Ürünler, sipariş onayından sonra belirtilen üretim ve kargo süresi içinde teslim edilir</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Teslimat, ALICI&rsquo;nın belirttiği adrese yapılır</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Kargo kaynaklı hasar durumunda ALICI, teslimat anında tutanak tutturmalıdır</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Mücbir sebepler veya üretim kaynaklı gecikmelerde ALICI bilgilendirilir</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <XCircle className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Madde 6 - Cayma Hakkı</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca:
            </p>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Cayma Hakkının Kullanımı</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>ALICI, ürünü teslim aldığı tarihten itibaren 14 gün içinde cayma hakkına sahiptir</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Cayma hakkı, info@axis3.com.tr adresine e-posta gönderilerek veya iade talep formu ile kullanılabilir</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Ürün, cayma bildirimi yapıldıktan sonra 10 gün içinde SATICI&rsquo;ya gönderilmelidir</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 mt-4">
              <h3 className="text-lg font-semibold">Cayma Hakkının İstisnaları</h3>
              <p className="text-muted-foreground">
                Aşağıdaki durumlarda cayma hakkı kullanılamaz:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-2" />
                  <span>Tüketicinin isteği doğrultusunda kişiselleştirilen ürünler (özel sipariş 3D baskılar)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-2" />
                  <span>Üretim süreci başlamış siparişler (ALICI&rsquo;nın onayı ile)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-2" />
                  <span>Hijyen ve sağlık açısından iadesi uygun olmayan ürünler</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <AlertTriangle className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Madde 7 - Sorumluluk ve Garanti</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              SATICI, sipariş edilen ürünün belirtilen özelliklere uygun olarak üretilmesinden ve teslim edilmesinden sorumludur. SATICI, aşağıdaki durumlardan sorumlu tutulamaz:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                <span>ALICI tarafından sağlanan STL dosyasındaki tasarım hataları</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                <span>Malzeme özelliklerinden kaynaklanan fiziksel sınırlamalar</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                <span>Mücbir sebep halleri</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Madde 8 - Yetkili Mahkeme</h2>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              İşbu sözleşmeden doğan uyuşmazlıklarda, Tüketicinin Korunması Hakkındaki Kanun ve ilgili mevzuat uyarınca ALICI&rsquo;nın ikametgahının bulunduğu yerdeki Tüketici Hakem Heyetleri veya Tüketici Mahkemeleri yetkilidir.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Madde 9 - Değişiklikler</h2>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Axis3, bu sözleşme şartlarını önceden haber vermeksizin değiştirme hakkını saklı tutar. Değişiklikler bu sayfada yayınlandığı anda yürürlüğe girer. Mevcut siparişler, sipariş anındaki sözleşme şartlarına tabidir.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">İletişim</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Sözleşme hakkında sorularınız için:
            </p>
            <div className="space-y-2">
              <p className="text-muted-foreground">
                <strong className="text-foreground">E-posta:</strong> info@axis3.com.tr
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Telefon:</strong> +90 501 045 27 78
              </p>
            </div>
          </div>
        </section>

        <div className="pt-8 border-t text-center text-sm text-muted-foreground">
          <p>
            Bu sözleşme son olarak 8 Haziran 2026 tarihinde güncellenmiştir.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
