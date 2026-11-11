import type { Metadata } from 'next';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import Link from 'next/link';
import { Shield, Info, CheckCircle2, Database, Eye, Mail, UserCheck } from 'lucide-react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = generateSEOMetadata({
  title: 'KVKK Aydınlatma Metni | AXIS3',
  description: 'AXIS3 KVKK aydınlatma metni ile kişisel verilerinizin işlenme amaçları, hukuki sebepleri ve haklarınız hakkında bilgi alın.',
  keywords: 'KVKK, kişisel veri, veri koruma, aydınlatma metni, AXIS3 KVKK',
  url: `${SITE_URL}/kvkk-aydinlatma-metni`,
});

export default function KvkkAydinlatmaMetniPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      <main className="container max-w-4xl py-12 space-y-12 flex-1">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold gradient-text">KVKK Aydınlatma Metni</h1>
          <p className="text-lg text-muted-foreground">
            Son güncelleme: 8 Haziran 2026
          </p>
        </div>

        <section className="glass-light dark:glass rounded-2xl p-8 space-y-4">
          <h2 className="text-2xl font-bold">Veri Sorumlusu Bilgisi</h2>
          <p className="text-muted-foreground leading-relaxed">
            6698 sayılı Kişisel Verilerin Korunması Kanunu (&ldquo;KVKK&rdquo;) uyarınca, kişisel verileriniz aşağıda açıklanan kapsamda veri sorumlusu olarak AXIS3 tarafından işlenmektedir.
          </p>
          <div className="space-y-2 mt-4">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Ticari Unvan:</strong> AXIS3 Endüstriyel 3D Baskı Çözümleri
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Adres:</strong> Gaziantep, Türkiye
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">E-posta:</strong> kvkk@axis3.com.tr
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Kişisel Verilerin İşlenme Amacı</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>3D baskı siparişlerinin alınması, işlenmesi ve teslim edilmesi</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Müşteri hesabı oluşturulması ve yönetilmesi</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Ödeme işlemlerinin gerçekleştirilmesi</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Müşteri hizmetleri ve destek taleplerinin yanıtlanması</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Yasal yükümlülüklerin yerine getirilmesi</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Hizmet kalitesinin artırılması ve kullanıcı deneyiminin iyileştirilmesi</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>İletişim ve bilgilendirme amaçlı e-postaların gönderilmesi</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">İşlenen Kişisel Veriler</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Kimlik Bilgileri</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Ad, soyad</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>TC kimlik numarası (fatura düzenleme amaçlı)</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">İletişim Bilgileri</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>E-posta adresi</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Telefon numarası</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Teslimat adresi</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">İşlem Güvenliği Bilgileri</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>IP adres bilgisi</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Tarayıcı bilgileri</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Oturum ve çerez verileri</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Müşteri İşlem Bilgileri</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Sipariş geçmişi ve detayları</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Yüklenen dosya bilgileri</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span>Fatura bilgileri</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Kişisel Verilerin Toplanma Yöntemi ve Hukuki Sebebi</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Kişisel verileriniz, web sitemiz, e-posta, telefon ve diğer iletişim kanalları aracılığıyla otomatik veya manuel yöntemlerle toplanmaktadır. Verileriniz, KVKK&rsquo;nın 5. ve 6. maddelerinde belirtilen aşağıdaki hukuki sebeplere dayanarak işlenmektedir:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Kanunlarda açıkça öngörülmesi</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Açık rızanıza dayalı olarak (pazarlama vb. amaçlarla)</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Kişisel Verilerin Aktarılması</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Kişisel verileriniz, aşağıdaki amaçlarla üçüncü taraflarla paylaşılabilir:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span><strong className="text-foreground">Ödeme kuruluşları:</strong> Ödeme işlemlerinin gerçekleştirilmesi için (iyzico)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span><strong className="text-foreground">E-posta hizmet sağlayıcısı:</strong> Bildirim e-postalarının gönderilmesi için (Resend)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span><strong className="text-foreground">Analitik hizmet sağlayıcıları:</strong> Anonim kullanım istatistikleri (Google Analytics)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span><strong className="text-foreground">Kargo şirketleri:</strong> Sipariş teslimatı için</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span><strong className="text-foreground">Yetkili kamu kurumları:</strong> Yasal yükümlülükler kapsamında</span>
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Verileriniz, yurt dışında mukim üçüncü taraflara aktarılması durumunda, KVKK&rsquo;nın 9. maddesi kapsamında gerekli güvenlik önlemleri alınmaktadır.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <UserCheck className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">KVKK Kapsamındaki Haklarınız</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              KVKK&rsquo;nın 11. maddesi uyarınca, veri sorumlusuna başvurarak aşağıdaki haklara sahipsiniz:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Kişisel verilerinizin işlenip işlenmediğini öğrenme</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Kişisel verilerin işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Kişisel verilerin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Kişisel verilerin silinmesini veya yok edilmesini isteme</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Düzeltme, silme veya yok etme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span>Kişisel verilerin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Haklarınızı Kullanma Yöntemi</h2>
          </div>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              KVKK&rsquo;nın 11. maddesinde sayılan haklarınıza ilişkin başvurularınızı, kimliğinizi tespit edici belgelerle birlikte aşağıdaki yöntemlerle iletebilirsiniz:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span><strong className="text-foreground">E-posta:</strong> kvkk@axis3.com.tr adresine e-posta göndererek</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                <span><strong className="text-foreground">Posta:</strong> Gaziantep, Türkiye adresine iadeli taahhütlü mektup göndererek</span>
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Başvurularınız, talebin niteliğine göre en kısa sürede ve en geç 30 gün içinde ücretsiz olarak sonuçlandırılacaktır. Ancak, işlemin ayrıca bir maliyet gerektirmesi halinde, KVKK&rsquo;nın 13. maddesi uyarınca belirlenen tarifedeki ücret alınabilir.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Veri Saklama Süresi</h2>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Kişisel verileriniz, işleme amaçlarının gerektirdiği süre boyunca ve ilgili mevzuatta öngörülen saklama süreleri kadar muhafaza edilmektedir. Süre sonunda verileriniz silinecek, yok edilecek veya anonim hale getirilecektir. Türk Ticaret Kanunu ve Vergi Usul Kanunu kapsamında ticari ve mali kayıtlar 10 yıl süreyle saklanmaktadır.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Değişiklikler</h2>

          <div className="glass-light dark:glass rounded-2xl p-8 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Axis3, bu aydınlatma metnini önceden haber vermeksizin değiştirme hakkını saklı tutar. Değişiklikler bu sayfada yayınlandığı anda yürürlüğe girer.
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
              KVKK kapsamındaki soru ve talepleriniz için:
            </p>
            <div className="space-y-2">
              <p className="text-muted-foreground">
                <strong className="text-foreground">E-posta:</strong> kvkk@axis3.com.tr
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Telefon:</strong> +90 501 045 27 78
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Adres:</strong> Gaziantep, Türkiye
              </p>
            </div>
          </div>
        </section>

        <div className="pt-8 border-t text-center text-sm text-muted-foreground">
          <p>
            Bu metin son olarak 8 Haziran 2026 tarihinde güncellenmiştir.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
