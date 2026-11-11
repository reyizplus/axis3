import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Printer, Layers, Zap, Shield, Wrench, Palette, ArrowRight, CheckCircle2, Sparkles, Cuboid, Microscope, Ruler, Clock, HeadphonesIcon } from 'lucide-react';
import { generateMetadata as generateSEOMetadata, generateServiceSchema } from '@/lib/utils/seo';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = generateSEOMetadata({
  title: '3D Baskı Hizmetlerimiz | AXIS3 - FDM ve SLA Teknolojileri',
  description: 'Profesyonel FDM ve SLA teknolojileri ile yüksek kaliteli 3D baskı hizmeti. Anında fiyat teklifi, hızlı teslimat, güvenli ödeme. PLA, ABS, PETG, Resin baskı.',
  keywords: 'FDM baskı, SLA baskı, 3D baskı hizmeti, profesyonel 3D baskı, stereolithography, fused deposition modeling',
  url: `${SITE_URL}/hizmetler`,
});

const mainServices = [
  {
    icon: Printer,
    title: 'FDM Baskı',
    subtitle: 'Fused Deposition Modeling',
    desc: 'Endüstriyel FDM yazıcılarımızla PLA, ABS, PETG, TPU gibi geniş malzeme yelpazesinde büyük boyutlu ve ekonomik baskılar üretiyoruz.',
    features: ['Geniş malzeme seçeneği', 'Büyük boyut kapasitesi', 'Ekonomik fiyatlandırma', 'Hızlı üretim süresi'],
    gradient: 'from-blue-500/20 to-cyan-500/20',
    iconBg: 'bg-blue-500/10 text-blue-600',
  },
  {
    icon: Cuboid,
    title: 'SLA/DLP Baskı',
    subtitle: 'Stereolithography',
    desc: 'Yüksek çözünürlüklü reçine baskı teknolojimizle mükemmel yüzey kalitesi ve detay hassasiyeti sunuyoruz. Prototip ve model üretimi için ideal.',
    features: ['Mükemmel yüzey kalitesi', 'Yüksek detay hassasiyeti', 'Pürüzsüz yüzey', 'Hassas prototipleme'],
    gradient: 'from-violet-500/20 to-purple-500/20',
    iconBg: 'bg-violet-500/10 text-violet-600',
  },
  {
    icon: Wrench,
    title: 'Tasarım Desteği',
    subtitle: 'Design Support',
    desc: 'Uzman mühendis ekibimizle STL dosyanızı baskıya hazır hale getiriyor, gerekirse sıfırdan tasarım yapıyoruz.',
    features: ['STL optimizasyonu', 'Sıfırdan tasarım', 'Destek yapıları', 'Geometri analizi'],
    gradient: 'from-emerald-500/20 to-teal-500/20',
    iconBg: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    icon: Palette,
    title: 'Özel Kaplama & Boyama',
    subtitle: 'Post-Processing',
    desc: 'Zımparalama, boyama, astarlama ve özel yüzey işlemleri ile baskılarınızı profesyonel bir görünüme kavuşturuyoruz.',
    features: ['Zımparalama', 'Profesyonel boyama', 'Özel kaplama', 'Yüzey işlemleri'],
    gradient: 'from-orange-500/20 to-amber-500/20',
    iconBg: 'bg-orange-500/10 text-orange-600',
  },
];

const extras = [
  { icon: Zap, title: 'Hızlı Teslimat', desc: 'Standart siparişlerde 3-5 iş günü, acil siparişlerde 24-48 saat teslimat.' },
  { icon: Shield, title: 'Kalite Garantisi', desc: 'Tüm baskılar kalite kontrolünden geçer. Memnuniyetiniz garantimizdir.' },
  { icon: Clock, title: '7/24 Sipariş', desc: 'Haftanın her günü 7/24 dosya yükleyebilir, anında fiyat alabilirsiniz.' },
  { icon: HeadphonesIcon, title: 'Teknik Destek', desc: 'Sipariş öncesi ve sonrası uzman ekibimizle iletişime geçin.' },
];

export default function HizmetlerPage() {
  const serviceSchema = generateServiceSchema();

  return (
    <div className="min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-20 max-w-7xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-5 px-4 py-1.5 text-xs font-medium border-primary/20 bg-primary/5 text-primary rounded-full">
                Hizmetlerimiz
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-5">
                Profesyonel
                <span className="block gradient-text">3D Baskı Çözümleri</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
                FDM&apos;den SLA&apos;ya, tasarım desteğinden özel kaplamaya kadar her ihtiyaca 
                uygun, uçtan uca 3D baskı çözümleri sunuyoruz.
              </p>
              <div className="flex flex-wrap gap-3">
                {['FDM', 'SLA', 'Tasarım', 'Kaplama'].map((tag) => (
                  <span key={tag} className="px-3 py-1.5 rounded-full bg-muted/70 text-xs font-medium text-muted-foreground border border-border/50">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="hidden lg:block relative">
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/images/services-banner.webp"
                  alt="AXIS3 Hizmetler"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
              </div>
              <div className="absolute -bottom-5 -right-5 flex gap-2">
                <div className="px-4 py-2 rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 shadow-xl">
                  <p className="text-xs text-muted-foreground">9+ Malzeme</p>
                </div>
                <div className="px-4 py-2 rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 shadow-xl">
                  <p className="text-xs text-muted-foreground">25K+ Baskı</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 sm:py-20 px-4 bg-muted/30">
        <div className="container max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-14">
            <Badge variant="outline" className="px-4 py-1 text-xs font-medium border-primary/20 bg-primary/5 text-primary rounded-full">
              Tüm Hizmetler
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              İhtiyacınıza Uygun <span className="gradient-text">Çözümler</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Her proje farklıdır. Bu yüzden geniş hizmet yelpazemizle size özel çözümler sunuyoruz.
            </p>
          </div>

          <div className="space-y-6">
            {mainServices.map((service, i) => (
              <div key={i} className="group rounded-2xl border border-border/50 bg-card p-6 sm:p-8 hover:shadow-lg hover:border-primary/30 transition-all duration-300 relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${service.gradient}`} />
                <div className="relative z-10 grid md:grid-cols-[auto_1fr_auto] gap-6 items-start">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 ${service.iconBg}`}>
                    <service.icon className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold">{service.title}</h3>
                      <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">{service.subtitle}</span>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4 max-w-2xl">{service.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {service.features.map((feat, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="h-3 w-3 text-primary/70" />
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="hidden md:flex items-center">
                    <Button variant="ghost" size="sm" asChild className="rounded-xl gap-1">
                      <Link href="/register">
                        Detay
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Extra Features */}
      <section className="py-16 sm:py-20 px-4">
        <div className="container max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <Badge variant="outline" className="px-4 py-1 text-xs font-medium border-primary/20 bg-primary/5 text-primary rounded-full">
              Neden AXIS3?
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Sizi <span className="gradient-text">Bekleyen</span> Ayrıcalıklar
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {extras.map((item, i) => (
              <div key={i} className="group rounded-2xl border border-border/40 bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all duration-300 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-16 sm:py-20 px-4 bg-muted/30">
        <div className="container max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-14">
            <Badge variant="outline" className="px-4 py-1 text-xs font-medium border-primary/20 bg-primary/5 text-primary rounded-full">
              Çalışma Süreci
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Nasıl <span className="gradient-text">Çalışıyoruz?</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-5">
            {[
              { step: '1', title: 'Dosya Yükle', desc: 'STL/OBJ dosyanızı platforma yükleyin.' },
              { step: '2', title: 'Malzeme Seç', desc: 'Size en uygun malzemeyi belirleyin.' },
              { step: '3', title: 'Sipariş Ver', desc: 'Ödemenizi yapın ve üretim başlasın.' },
              { step: '4', title: 'Teslimat', desc: 'Ürününüz kapınıza gelsin.' },
            ].map((item, i) => (
              <div key={i} className="relative text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">{item.step}</span>
                </div>
                <h3 className="font-bold mb-1.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
                {i < 3 && <div className="hidden md:block absolute top-8 -right-3 w-6 h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/10 p-8 sm:p-14 text-center">
            <div className="absolute top-0 right-0 w-60 h-60 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                Haydi, <span className="gradient-text">Başlayalım</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                STL dosyanızı yükleyin, saniyeler içinde fiyat teklifi alın. Profesyonel 3D baskı dünyasına adım atın.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="lg" asChild className="h-14 px-10 rounded-2xl text-base font-semibold gap-2.5 shadow-lg shadow-primary/25">
                  <Link href="/register">
                    Hemen Başla
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="h-14 px-10 rounded-2xl text-base font-semibold gap-2.5 border-muted-foreground/20">
                  <Link href="/malzemeler">
                    Malzemeleri İncele
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
