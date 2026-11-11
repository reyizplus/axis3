import type { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import Link from 'next/link';
import { Shield, Truck, Package, Clock, MapPin, Mail, CheckCircle, AlertTriangle, Ban } from 'lucide-react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Teslimat ve Kargo Politikası | AXIS3',
  description: 'AXIS3 teslimat süreleri, kargo koşulları ve gönderim politikası hakkında detaylı bilgi.',
  keywords: 'teslimat, kargo, gönderim, 3D baskı teslimat, AXIS3 kargo politikası',
  url: `${SITE_URL}/teslimat-kargo-politikasi`,
});

export default function TeslimatKargoPolitikasiPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      <main className="container max-w-4xl py-12 space-y-12 flex-1">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Truck className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold gradient-text">Teslimat ve Kargo Politikası</h1>
          <p className="text-lg text-muted-foreground">
            Son güncelleme: 8 Haziran 2026
          </p>
        </div>

        <section className="glass-light dark:glass rounded-2xl p-8 space-y-4">
          <h2 className="text-2xl font-bold">Genel Bakış</h2>
          <p className="text-muted-foreground leading-relaxed">
            AXIS3 olarak, siparişlerinizin güvenli ve zamanında teslim edilmesi için çalışıyoruz. Bu politika, teslimat süreçlerimiz, kargo seçeneklerimiz ve gönderim koşullarımız hakkında detaylı bilgi içermektedir.
          </p>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Üretim ve Teslimat Süreleri</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Tahmini Süreler</h3>
              <p className="text-muted-foreground">
                Teslimat süreleri, üretim süresi ve kargo süresinin toplamından oluşmaktadır:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span><strong className="text-foreground">Üretim Süresi:</strong> 1-5 iş günü (malzeme ve karmaşıklığa bağlı olarak)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span><strong className="text-foreground">Kargo Süresi:</strong> 1-3 iş günü (teslimat adresine bağlı olarak)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span><strong className="text-foreground">Toplam Tahmini Süre:</strong> 2-8 iş günü</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Süreyi Etkileyen Faktörler</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Modelin boyutu ve karmaşıklığı</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Seçilen malzeme ve baskı teknolojisi</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Mevcut üretim kapasitesi ve kuyruk durumu</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Teslimat adresinin konumu</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Kargo ve Gönderim</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Kargo Firmaları</h3>
              <p className="text-muted-foreground">
                Siparişleriniz, tercih edilen kargo firmaları aracılığıyla gönderilmektedir. Kargo firması seçimi, teslimat adresine ve sipariş özelliklerine göre belirlenir.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Kargo Ücreti</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Kargo ücreti, sipariş özetinde gösterilir ve toplam tutara eklenir</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Belirli tutar üzerindeki siparişlerde kargo ücretsiz olabilir</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Kampanya dönemlerinde kargo ücreti değişiklik gösterebilir</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Paketleme</h3>
              <p className="text-muted-foreground">
                Ürünleriniz, 3D baskı ürünlerine uygun özel paketleme malzemeleri ile korunarak gönderilir. Hassas ve kırılgan parçalar ekstra koruma önlemleri ile paketlenir.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Teslimat Adresi</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Sipariş sırasında belirttiğiniz teslimat adresine gönderim yapılır</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Adres bilgilerinizin doğru ve eksiksiz olduğundan emin olunuz</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Yanlış adres bildiriminden kaynaklanan gecikme ve kayıplardan SATICI sorumlu değildir</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Teslimat adresi değişikliği için sipariş üretime alınmadan önce iletişime geçilmelidir</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <AlertTriangle className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Teslimatla İlgili Önemli Bilgiler</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Teslimat sırasında paketi kontrol ediniz, hasar varsa tutanak tutturup fotoğraflayınız</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Kargonuzu teslim alırken kimlik ibraz etmeniz gerekebilir</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Teslimat sırasında alıcı bulunamazsa, kargo firması tekrar deneme yapacaktır</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Mücbir sebeplerden dolayı teslimatta gecikme yaşanabilir, bu durumda bilgilendirme yapılır</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Kargo takip numarası, siparişiniz kargoya verildiğinde e-posta ile iletilir</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Teslimat Bölgeleri</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Şu an için yalnızca Türkiye içi teslimat yapılmaktadır. Yurt dışı teslimat seçenekleri için bizimle iletişime geçebilirsiniz. Türkiye&rsquo;nin tüm şehirlerine teslimat yapılmaktadır. Kırsal bölgelerde teslimat süresi uzayabilir.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Değişiklikler</h2>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Axis3, bu teslimat ve kargo politikasını önceden haber vermeksizin değiştirme hakkını saklı tutar. Değişiklikler bu sayfada yayınlandığı anda yürürlüğe girer. Mevcut siparişler, sipariş anındaki politika şartlarına tabidir.
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
              Teslimat ve kargo ile ilgili sorularınız için:
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
            Bu politika son olarak 8 Haziran 2026 tarihinde güncellenmiştir.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
