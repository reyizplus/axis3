import { Metadata } from 'next';
import Image from 'next/image';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { Target, Eye, Heart, Shield, Users, Award, Rocket, Sparkles, TrendingUp, Quote, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Hakkımızda | AXIS3 - Endüstriyel 3D Baskı Çözümleri',
  description: 'AXIS3 olarak endüstriyel 3D baskı teknolojileri ile hayallerinizi gerçeğe dönüştürüyoruz. Profesyonel ekibimiz ve ileri teknoloji yazıcılarımızla hizmetinizdeyiz.',
  keywords: 'AXIS3, 3D baskı şirketi, endüstriyel 3D baskı, Türkiye 3D baskı hizmeti',
  url: `${SITE_URL}/hakkimizda`,
});

const timeline = [
  { year: '2021', title: 'Kuruluş', desc: 'AXIS3, 3D baskı teknolojileri alanında hizmet vermek üzere kuruldu.' },
  { year: '2022', title: 'Online Platform', desc: 'Anında fiyat teklifi ve online sipariş platformu kullanıma açıldı.' },
  { year: '2023', title: 'Büyüme', desc: 'Yazıcı filosu genişletildi, 9+ malzeme çeşidine ulaşıldı.' },
  { year: '2024', title: 'Endüstriyel Çözümler', desc: 'Endüstriyel iş birlikleri ve kurumsal çözümler sunulmaya başlandı.' },
  { year: '2025', title: 'Liderlik', desc: 'Türkiye genelinde 25.000+ başarılı baskı ve 3.500+ müşteri.' },
];

const values = [
  { icon: Shield, title: 'Kalite', desc: 'Tüm baskılar sıkı kalite kontrolünden geçer.' },
  { icon: Users, title: 'Müşteri Odaklılık', desc: 'Her müşterimize özel çözümler sunuyoruz.' },
  { icon: Award, title: 'Teknoloji', desc: 'En güncel yazıcı ve yazılımları kullanıyoruz.' },
  { icon: Heart, title: 'Tutku', desc: '3D baskı tutkumuzu her projeye yansıtıyoruz.' },
];

export default function HakkimizdaPage() {
  return (
    <div className="min-h-screen flex flex-col">
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
                Hakkımızda
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-5">
                3D Baskıda
                <span className="block gradient-text">Türkiye&apos;nin Lideri</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
                AXIS3 olarak 2021 yılından bu yana endüstriyel 3D baskı teknolojileri ile 
                hayalleri gerçeğe dönüştürüyoruz. Profesyonel ekibimiz ve son teknoloji 
                yazıcılarımızla 25.000&apos;den fazla başarılı baskıya imza attık.
              </p>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Profesyonel Ekip</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Endüstriyel Kalite</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">7/24 Destek</span>
                </div>
              </div>
            </div>
            <div className="hidden lg:block relative">
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/images/about-showcase.webp"
                  alt="AXIS3 Hakkımızda"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
              </div>
              <div className="absolute -bottom-4 -left-4 rounded-xl px-4 py-2.5 bg-card/90 backdrop-blur-sm border border-border/50 shadow-xl flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold gradient-text">2021</p>
                  <p className="text-[10px] text-muted-foreground">Kuruluş</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/40 bg-muted/30">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
            {[
              { value: '25.000+', label: 'Başarılı Baskı', icon: CheckCircle2 },
              { value: '3.500+', label: 'Mutlu Müşteri', icon: Users },
              { value: '9+', label: 'Malzeme Çeşidi', icon: Sparkles },
              { value: '4+', label: 'Yıllık Deneyim', icon: TrendingUp },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-3">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-extrabold gradient-text">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 sm:py-20 px-4">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <Badge variant="outline" className="px-4 py-1 text-xs font-medium border-primary/20 bg-primary/5 text-primary rounded-full">
              Hikayemiz
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Her Şey Bir <span className="gradient-text">Fikirle Başladı</span>
            </h2>
          </div>
          <div className="prose prose-gray dark:prose-invert max-w-none text-center">
            <p className="text-lg text-muted-foreground leading-relaxed">
              3D baskı teknolojilerinin herkes için erişilebilir olması gerektiğine inanarak yola çıktık. 
              Karmaşık süreçleri basitleştirdik, anlık fiyatlandırma sistemimizle şeffaf ve güvenilir 
              bir hizmet sunuyoruz. Bugün Türkiye&apos;nin dört bir yanından müşterilerimize 
              endüstriyel kalitede 3D baskı hizmeti veriyoruz.
            </p>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 sm:py-20 px-4 bg-muted/30">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-14">
            <Badge variant="outline" className="px-4 py-1 text-xs font-medium border-primary/20 bg-primary/5 text-primary rounded-full">
              Zaman Çizelgesi
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Yolculuğumuz
            </h2>
          </div>
          <div className="relative">
            <div className="absolute left-1/2 -translate-x-px top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-primary/10 to-transparent hidden md:block" />
            <div className="space-y-8 md:space-y-12">
              {timeline.map((item, i) => (
                <div key={i} className="relative md:grid md:grid-cols-2 md:gap-8 items-center">
                  <div className={`md:text-right ${i % 2 === 1 ? 'md:order-2' : ''}`}>
                    <div className="bg-card border border-border/50 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 shadow-sm">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
                        {item.year}
                      </span>
                      <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <div className={`hidden md:flex justify-center ${i % 2 === 1 ? 'order-1' : ''}`}>
                    <div className="w-4 h-4 rounded-full bg-primary border-4 border-background shadow-md" />
                  </div>
                  <div className={`hidden md:block ${i % 2 === 1 ? 'order-3' : ''}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 sm:py-20 px-4">
        <div className="container max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <Badge variant="outline" className="px-4 py-1 text-xs font-medium border-primary/20 bg-primary/5 text-primary rounded-full">
              Hedeflerimiz
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Misyon & <span className="gradient-text">Vizyon</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="group rounded-2xl border border-border/50 bg-card p-8 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Target className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Misyonumuz</h3>
              <p className="text-muted-foreground leading-relaxed">
                3D baskı teknolojilerini herkes için erişilebilir kılmak. Profesyonel kalitede 
                baskı hizmetimizi, anlık fiyatlandırma ve kolay sipariş süreci ile herkesin 
                kullanımına sunuyoruz.
              </p>
            </div>
            <div className="group rounded-2xl border border-border/50 bg-card p-8 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Eye className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Vizyonumuz</h3>
              <p className="text-muted-foreground leading-relaxed">
                Türkiye&apos;nin lider online 3D baskı platformu olmak. Sürekli gelişen teknolojimiz 
                ve genişleyen malzeme ağımızla müşterilerimize en iyi deneyimi sunmayı amaçlıyoruz.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 sm:py-20 px-4 bg-muted/30">
        <div className="container max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <Badge variant="outline" className="px-4 py-1 text-xs font-medium border-primary/20 bg-primary/5 text-primary rounded-full">
              Değerlerimiz
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Bizi <span className="gradient-text">Biz Yapan</span> Değerler
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((val, i) => (
              <div key={i} className="group rounded-2xl border border-border/50 bg-card p-6 text-center hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <val.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">{val.title}</h3>
                <p className="text-sm text-muted-foreground">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-16 px-4">
        <div className="container max-w-4xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/10 p-10 sm:p-14 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
            <Quote className="h-12 w-12 text-primary/20 mx-auto mb-6" />
            <blockquote className="text-xl sm:text-2xl font-medium text-foreground leading-relaxed max-w-2xl mx-auto mb-6">
              &ldquo;3D baskı sadece bir üretim yöntemi değil, hayal gücünün sınırlarını zorlayan 
              bir dönüşüm aracıdır.&rdquo;
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                AA
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Ahmet Acar</p>
                <p className="text-xs text-muted-foreground">Kurucu, AXIS3</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-16 sm:pb-20 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-background to-muted border border-border/40 p-8 sm:p-12 text-center">
            <div className="absolute inset-0 grid-bg opacity-20" />
            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
                <Rocket className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                Projenize <span className="gradient-text">Başlamaya</span> Hazır mısınız?
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                STL dosyanızı yükleyin, saniyeler içinde fiyat teklifi alın. Profesyonel 3D baskı dünyasına adım atın.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="lg" asChild className="h-14 px-10 rounded-2xl text-base font-semibold gap-2.5 shadow-lg shadow-primary/25">
                  <Link href="/register">
                    <Rocket className="h-5 w-5" />
                    Hemen Başla
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="h-14 px-10 rounded-2xl text-base font-semibold gap-2.5 border-muted-foreground/20">
                  <Link href="/hizmetler">
                    Hizmetleri Keşfet
                    <ArrowRight className="h-4 w-4" />
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
