import type { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { Cookie, Shield, Info, Settings, XCircle, Mail } from 'lucide-react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Çerez Politikası | AXIS3',
  description: 'AXIS3 çerez politikası ve çerez tercihleri hakkında detaylı bilgi.',
  keywords: 'çerez, cookie, çerez politikası, gizlilik, AXIS3 çerez',
  url: `${SITE_URL}/cerez-politikasi`,
});

export default function CerezPolitikasiPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      <main className="container max-w-4xl py-12 space-y-12 flex-1">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Cookie className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold gradient-text">Çerez Politikası</h1>
          <p className="text-lg text-muted-foreground">
            Son güncelleme: 8 Haziran 2026
          </p>
        </div>

        <section className="glass-light dark:glass rounded-2xl p-8 space-y-4">
          <h2 className="text-2xl font-bold">Giriş</h2>
          <p className="text-muted-foreground leading-relaxed">
            AXIS3 olarak, web sitemizde çerezler ve benzer teknolojiler kullanmaktayız. Bu çerez politikası, hangi çerezleri kullandığımızı, bu çerezlerin ne amaçla kullanıldığını ve çerez tercihlerinizi nasıl yönetebileceğinizi açıklamaktadır. Sitemizi kullanarak, bu politikada belirtilen şekilde çerez kullanımına izin vermiş olursunuz.
          </p>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Çerez Nedir?</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Çerezler, bir web sitesini ziyaret ettiğinizde tarayıcınıza kaydedilen küçük metin dosyalarıdır. Bu dosyalar, web sitemizin cihazınızı tanımasına ve tercihlerinizi hatırlamasına olanak tanır. Çerezler, web sitesinin daha verimli çalışmasını sağlamak, kullanıcı deneyimini iyileştirmek ve size daha alakalı içerikler sunmak amacıyla kullanılır.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Cookie className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Kullandığımız Çerez Türleri</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Zorunlu Çerezler ve Yerel Depolama</h3>
              <p className="text-muted-foreground">
                Bu çerezler, web sitemizin düzgün çalışması için gereklidir. Oturum yönetimi, güvenlik ve site temel işlevleri için kullanılırlar. Bu çerezlerin devre dışı bırakılması site işlevselliğini etkileyebilir.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span><strong className="text-foreground">sb-&lt;proje&gt;-auth-token:</strong> Supabase kimlik doğrulama oturumu (büyük oturumlarda .0, .1 şeklinde parçalanabilir)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span><strong className="text-foreground">axis3-cookie-consent (localStorage):</strong> Çerez tercihlerinizin hatırlanması</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Analitik ve Performans Çerezleri</h3>
              <p className="text-muted-foreground">
                Bu çerezler, ziyaretçilerin web sitemizi nasıl kullandığı hakkında bilgi toplamamıza yardımcı olur. Sayfa ziyaret sayıları, hangi sayfaların daha popüler olduğu gibi anonim istatistikler elde etmemizi sağlar. Bu çerezler yalnızca çerez bildiriminde <strong className="text-foreground">&ldquo;Kabul Et&rdquo;</strong> seçildikten sonra oluşturulur.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span><strong className="text-foreground">_ga, _ga_&lt;kimlik&gt;:</strong> Google Analytics tarafından kullanıcı istatistikleri</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span><strong className="text-foreground">_gid:</strong> Google Analytics tarafından günlük ziyaretçi ayrımı</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">İşlevsellik Tercihleri</h3>
              <p className="text-muted-foreground">
                Tema ve sepet gibi kişisel tercihleriniz tarayıcınızın yerel depolamasında (localStorage) saklanır; bunlar üçüncü taraflarla paylaşılmaz:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span><strong className="text-foreground">theme (localStorage):</strong> Açık/koyu tema tercihi</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span><strong className="text-foreground">axis3_cart_store (localStorage):</strong> Sepetinizdeki ürünler</span>
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
            <h2 className="text-2xl font-bold">Çerezlerin Kullanım Amaçları</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Çerezleri aşağıdaki amaçlarla kullanmaktayız:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Kimlik doğrulama ve oturum yönetimi sağlamak</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Sepetinizdeki ürünleri hatırlamak</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Tercihlerinizi (dil, tema) kaydetmek</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Sitemizin performansını ve kullanımını analiz etmek</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Güvenlik önlemleri almak ve dolandırıcılığı önlemek</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Çerez Tercihlerinin Yönetimi</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Çerez tercihlerinizi aşağıdaki yöntemlerle yönetebilirsiniz:
            </p>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Tarayıcı Ayarları</h3>
              <p className="text-muted-foreground">
                Çoğu web tarayıcısı, çerezleri kabul etmeyi reddetme veya belirli çerez türlerini engelleme seçeneği sunar. Tarayıcınızın ayarlar menüsünden çerez tercihlerinizi değiştirebilirsiniz:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span><strong className="text-foreground">Google Chrome:</strong> Ayarlar &rarr; Gizlilik ve Güvenlik &rarr; Çerezler</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span><strong className="text-foreground">Mozilla Firefox:</strong> Seçenekler &rarr; Gizlilik & Güvenlik &rarr; Çerezler</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span><strong className="text-foreground">Safari:</strong> Tercihler &rarr; Gizlilik &rarr; Çerezler</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span><strong className="text-foreground">Microsoft Edge:</strong> Ayarlar &rarr; Çerezler ve Site İzinleri</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3 mt-4">
              <h3 className="text-lg font-semibold">Çerez Onay Yönetimi</h3>
              <p className="text-muted-foreground">
                Web sitemizi ilk ziyaretinizde görüntülenen çerez onay bildirimi aracılığıyla, zorunlu olmayan çerezleri kabul edebilir veya reddedebilirsiniz. Dilediğiniz zaman çerez tercihlerinizi değiştirebilirsiniz.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <XCircle className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Üçüncü Taraf Çerezleri</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Web sitemizde, aşağıdaki üçüncü taraf hizmet sağlayıcıların çerezlerini kullanmaktayız:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span><strong className="text-foreground">Google Analytics:</strong> Kullanıcı davranışlarını anonim olarak analiz etmek için (yalnızca onay sonrası)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span><strong className="text-foreground">Supabase:</strong> Kimlik doğrulama ve oturum yönetimi için</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span><strong className="text-foreground">iyzico:</strong> Ödeme sayfasında ödeme işleminin güvenli şekilde tamamlanması için</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span><strong className="text-foreground">Cloudflare:</strong> Site güvenliği ve trafik ölçümü için (çerez kullanmayan analiz)</span>
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Üçüncü tarafların çerez kullanımı, kendi gizlilik politikalarına tabidir. Bu politikalar için ilgili hizmet sağlayıcıların web sitelerini ziyaret edebilirsiniz.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Değişiklikler</h2>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Axis3, bu çerez politikasını önceden haber vermeksizin değiştirme hakkını saklı tutar. Değişiklikler bu sayfada yayınlandığı anda yürürlüğe girer. Politikanın üst kısmındaki son güncelleme tarihini kontrol ederek değişiklikleri takip edebilirsiniz.
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
              Çerez politikamız hakkında sorularınız için bizimle iletişime geçebilirsiniz:
            </p>
            <div className="space-y-2">
              <p className="text-muted-foreground">
                <strong className="text-foreground">E-posta:</strong> privacy@axis3.com.tr
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
