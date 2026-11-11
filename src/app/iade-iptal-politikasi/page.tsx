import type { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import Link from 'next/link';
import { RotateCcw, CheckCircle2, XCircle, AlertTriangle, Clock, Mail, Package } from 'lucide-react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = generateSEOMetadata({
  title: 'İade ve İptal Politikası | AXIS3',
  description: 'AXIS3 iade ve iptal koşulları, cayma hakkı kullanımı ve para iadesi süreci.',
  keywords: 'iade, iptal, para iadesi, cayma hakkı, AXIS3 iade politikası',
  url: `${SITE_URL}/iade-iptal-politikasi`,
});

export default function IadeIptalPolitikasiPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      <main className="container max-w-4xl py-12 space-y-12 flex-1">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <RotateCcw className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold gradient-text">İade ve İptal Politikası</h1>
          <p className="text-lg text-muted-foreground">
            Son güncelleme: 8 Haziran 2026
          </p>
        </div>

        <section className="glass-light dark:glass rounded-2xl p-8 space-y-4">
          <h2 className="text-2xl font-bold">Genel Bakış</h2>
          <p className="text-muted-foreground leading-relaxed">
            AXIS3 olarak, müşteri memnuniyetini en ön planda tutuyoruz. 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamında iade ve iptal süreçlerimizi aşağıda detaylandırıyoruz.
          </p>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <XCircle className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Sipariş İptali</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Üretim Öncesi İptal</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Siparişiniz üretime alınmadan önce iptal edebilirsiniz</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>İptal durumunda ödediğiniz ücret tamamen iade edilir</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>İptal talebinizi iletişim kanallarından veya hesabınız üzerinden yapabilirsiniz</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Üretim Sonrası İptal</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-2" />
                  <span>Üretim süreci başladıktan sonra sipariş iptali mümkün değildir</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-2" />
                  <span>İstisnai durumlar SATICI tarafından değerlendirilir</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <RotateCcw className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">İade Koşulları</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold"> Cayma Hakkı Kullanımı</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Ürünü teslim aldıktan sonra 14 gün içinde cayma hakkınızı kullanabilirsiniz</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Ürün, kullanılmamış ve orijinal ambalajında olmalıdır</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>İade kargo ücreti, cayma hakkı kullanımında ALICI&rsquo;ya aittir</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Ayıplı Ürün İadesi</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Üretim hatası tespit edilen ürünlerde tam iade veya yeniden üretim yapılır</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Kargo hasarı durumunda teslimat anında tutanak tutulmalıdır</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Ayıplı ürün iadelerinde kargo ücreti SATICI tarafından karşılanır</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <XCircle className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">İade Edilemeyecek Ürünler</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Aşağıdaki ürünlerde cayma hakkı kullanılamaz:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <span>Kişiselleştirilmiş/özel sipariş ürünleri (ALICI&rsquo;nın talebi doğrultusunda üretilen 3D baskılar)</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <span>Hijyen ve sağlık açısından iadesi uygun olmayan ürünler</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <span>ALICI tarafından hasar verilmiş veya kullanılmış ürünler</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <span>Orijinal ambalajı hasarlı veya eksik ürünler</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Para İadesi Süreci</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>İade talebiniz alındıktan sonra 3 iş günü içinde incelenir</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Onaylanan iadeler, ödeme yönteminize bağlı olarak 7-14 iş günü içinde hesabınıza yansır</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Kredi kartı iadeleri, bankanızın sürecine bağlı olarak 2-3 fatura döneminde görünebilir</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Havale/EFT ile yapılan ödemelerde iade, banka hesabınıza yapılır</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">İade Süreci Adımları</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <ol className="space-y-3 text-muted-foreground list-decimal list-inside">
              <li>İade talebinizi <strong className="text-foreground">info@axis3.com.tr</strong> adresine e-posta göndererek veya hesabınız üzerinden oluşturun</li>
              <li>İade nedeninizi ve sipariş numaranızı belirtin</li>
              <li>Ekibimiz talebinizi değerlendirir ve size iade talimatlarını iletir</li>
              <li>Ürünü orijinal ambalajıyla birlikte belirtilen adrese gönderin</li>
              <li>Ürün tarafımıza ulaştıktan sonra incelenir ve iade süreci başlatılır</li>
            </ol>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Değişiklikler</h2>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Axis3, bu iade ve iptal politikasını önceden haber vermeksizin değiştirme hakkını saklı tutar. Değişiklikler bu sayfada yayınlandığı anda yürürlüğe girer. Mevcut siparişler, sipariş anındaki politika şartlarına tabidir.
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
              İade ve iptal talepleriniz için:
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
