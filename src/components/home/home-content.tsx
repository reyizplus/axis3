'use client';

import Link from 'next/link';
import Image from 'next/image';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionItem,
} from '@/components/ui/accordion';
import {
  Upload,
  Zap,
  Package,
  Shield,
  ArrowRight,
  CheckCircle2,
  Star,
  Printer,
  Cuboid,
  Wrench,
  Truck,
  Clock,
  HeadphonesIcon,
  Users,
  Building2,
  Quote,
  ChevronDown,
  Sparkles,
  Microscope,
  Ruler,
  Palette,
  ChevronRight,
  Heart,
  ShoppingCart,
  Phone,
  MessageSquare,
  Calendar,
  Newspaper,
} from 'lucide-react';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface BlogPostBrief {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  published_at: string | null;
  created_at: string;
  category_id: string | null;
}

interface HomeContentProps {
  blogPosts: BlogPostBrief[];
  categoryMap: Map<string, string>;
}

const stats = [
  { value: '25.000+', label: 'Başarılı Baskı', icon: CheckCircle2 },
  { value: '3.500+', label: 'Mutlu Müşteri', icon: Users },
  { value: '9+', label: 'Farklı Malzeme', icon: Microscope },
  { value: '81', label: 'İl Hizmet', icon: Building2 },
];

const services = [
  {
    icon: Printer,
    title: 'FDM Baskı',
    desc: 'PLA, ABS, PETG, TPU gibi malzemelerle endüstriyel kalitede baskı',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    iconBg: 'bg-blue-500/10 text-blue-600',
  },
  {
    icon: Cuboid,
    title: 'SLA/DLP Baskı',
    desc: 'Yüksek çözünürlüklü reçine baskı ile mükemmel yüzey kalitesi',
    gradient: 'from-violet-500/20 to-purple-500/20',
    iconBg: 'bg-violet-500/10 text-violet-600',
  },
  {
    icon: Wrench,
    title: 'Tasarım Desteği',
    desc: 'Uzman ekibimizle STL dosyanızı baskıya hazır hale getirin',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    iconBg: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    icon: Palette,
    title: 'Özel Renk & Kaplama',
    desc: 'Boyama, zımparalama ve özel yüzey işlemleri ile premium görünüm',
    gradient: 'from-orange-500/20 to-amber-500/20',
    iconBg: 'bg-orange-500/10 text-orange-600',
  },
];

const features = [
  {
    icon: Zap,
    title: 'Anında Fiyat Teklifi',
    desc: 'STL dosyanızı yükleyin, yapay zeka destekli sistemimiz saniyeler içinde fiyat hesaplasın.',
  },
  {
    icon: Ruler,
    title: 'Hassas Ölçüm & Analiz',
    desc: 'Otomatik geometri analizi ile baskı süresi ve malzeme miktarı en doğru şekilde hesaplanır.',
  },
  {
    icon: Shield,
    title: 'Güvenli Ödeme',
    desc: 'iyzico altyapısı ile 256-bit SSL sertifikasıyla korunan güvenli ödeme deneyimi.',
  },
  {
    icon: Truck,
    title: 'Hızlı Teslimat',
    desc: 'Üretim tamamlandığında anında kargoya verilir, kapınıza kadar takip edebilirsiniz.',
  },
  {
    icon: Clock,
    title: '7/24 Otomatik Sistem',
    desc: 'Haftanın her günü 24 saat boyunca dosya yükleyebilir, anında fiyat alabilirsiniz.',
  },
  {
    icon: HeadphonesIcon,
    title: 'Premium Destek',
    desc: 'Sipariş öncesi ve sonrası uzman ekibimizle iletişime geçin, size özel çözümler sunalım.',
  },
];

const testimonials = [
  {
    name: 'Ahmet Yılmaz',
    title: 'Makine Mühendisi',
    content: 'Prototip ihtiyaçlarımız için AXIS3\'ü kullanıyoruz. Kalite ve teslimat süresi konusunda beklentilerimizin üzerinde bir hizmet alıyoruz.',
    rating: 5,
  },
  {
    name: 'Elif Demir',
    title: 'Endüstriyel Tasarımcı',
    content: 'SLA baskı kaliteleri gerçekten etkileyici. Tasarımlarımı en ince detayına kadar başarıyla basıyorlar. Üstelik fiyatlar çok makul.',
    rating: 5,
  },
  {
    name: 'Mehmet Kaya',
    title: 'Maker & Hobi Tutkunu',
    content: 'Kişisel projelerim için düzenli olarak sipariş veriyorum. Her seferinde mükemmel sonuç alıyorum. Kesinlikle tavsiye ederim.',
    rating: 5,
  },
  {
    name: 'Zeynep Şahin',
    title: 'Mimar',
    content: 'Maket ve model çalışmalarımızda AXIS3\'ün hassasiyeti sayesinde müşterilerimizi etkilemeyi başarıyoruz. Hızlı ve güvenilir.',
    rating: 5,
  },
  {
    name: 'Can Öztürk',
    title: 'Mekatronik Mühendisi',
    content: 'Teknik parça üretiminde tolerans değerleri çok başarılı. Mühendislik projeleri için gönül rahatlığıyla tercih ediyorum.',
    rating: 4,
  },
];

const faqItems = [
  {
    question: 'Hangi dosya formatlarını kabul ediyorsunuz?',
    answer: 'STL, OBJ, 3MF, STEP ve IGES formatlarını kabul ediyoruz. STL formatı en yaygın kullanılan formattır ve sistemimiz tarafından en hızlı şekilde analiz edilir.',
  },
  {
    question: 'Siparişim ne zaman kargoya verilir?',
    answer: 'Standart üretim süresi 2-5 iş günüdür. Karmaşık modellerde bu süre uzayabilir. Sipariş oluşturma aşamasında tahmini teslimat tarihini görebilirsiniz.',
  },
  {
    question: 'Hangi malzemeleri kullanıyorsunuz?',
    answer: 'PLA, PLA+, ABS, PETG, TPU, Naylon, Reçine (SLA), Flex ve ahşap dolgulu filament gibi 9\'dan fazla malzeme seçeneğimiz bulunuyor. Hepsi endüstriyel kalite standartlarındadır.',
  },
  {
    question: 'Toplu siparişlerde indirim alabilir miyim?',
    answer: 'Evet, 10 adet ve üzeri siparişlerde özel fiyatlandırma sunuyoruz. Toplu siparişleriniz için bizimle iletişime geçerek özel teklif alabilirsiniz.',
  },
  {
    question: 'İade ve değişim politikanız nedir?',
    answer: 'Memnun kalmadığınız ürünlerde 14 gün içinde iade yapabilirsiniz. Üretim hatası durumunda ürünü ücretsiz yeniden basarız. Detaylı bilgi için İade Politikamızı inceleyin.',
  },
];

export function HomeContent({ blogPosts, categoryMap }: HomeContentProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="min-h-screen flex flex-col">
        <PublicHeader />

        {/* ===== HERO ===== */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute top-1/3 left-1/4 w-2 h-2 rounded-full bg-primary/30" />
            <div className="absolute top-1/4 right-1/3 w-3 h-3 rounded-full bg-primary/20" />
            <div className="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 rounded-full bg-primary/25" />
          </div>

          <div className="container mx-auto px-4 max-w-7xl relative z-10 py-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="max-w-xl">
                <m.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <Badge variant="outline" className="mb-6 px-4 py-1.5 text-xs font-medium border-primary/20 bg-primary/5 text-primary rounded-full">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Profesyonel 3D Baskı Platformu
                  </Badge>
                </m.div>

                <m.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <h1 className="hero-title mb-6">
                    Fikirlerinizi
                    <span className="block gradient-text">Gerçeğe Dönüştürün</span>
                  </h1>
                </m.div>

                <m.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8"
                >
                  STL dosyanızı yükleyin, yapay zeka destekli sistemimiz saniyeler içinde fiyat teklifi oluştursun. 
                  9+ malzeme çeşidi, hızlı teslimat ve güvenli ödeme ile profesyonel 3D baskı hizmeti.
                </m.p>

                <m.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-3 sm:gap-4"
                >
                  <Button size="lg" asChild className="h-14 px-10 rounded-2xl text-base font-semibold gap-2.5 shadow-lg shadow-primary/25">
                    <Link href="/register">
                      <Upload className="h-5 w-5" />
                      Ücretsiz Başla
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="h-14 px-10 rounded-2xl text-base font-semibold gap-2.5 border-muted-foreground/20">
                    <Link href="/hizmetler">
                      Hizmetleri Keşfet
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </m.div>

                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-6 mt-8 pt-6 border-t border-border/40"
                >
                  <div className="flex -space-x-2">
                    {['avatar-1', 'avatar-2'].map((img, i) => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-gradient-to-br from-primary/20 to-primary/10 overflow-hidden relative">
                        <Image
                          src={`/images/${img}.webp`}
                          alt="Müşteri"
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                    ))}
                    <div className="w-10 h-10 rounded-full border-2 border-background bg-primary/10 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary">3.5K</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-0.5 mb-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">3.500+ mutlu müşteri</p>
                  </div>
                </m.div>
              </div>

              <m.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="hidden lg:block relative"
              >
                <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="/images/hero-bg.webp"
                    alt="AXIS3 3D Baskı"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
                </div>
                <div className="absolute -bottom-4 -right-4 z-20 rounded-xl px-4 py-2.5 bg-card/90 backdrop-blur-sm border border-border/50 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Printer className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">Son Baskı Tamamlandı</p>
                      <p className="text-xs text-muted-foreground">Mekatronik parça • 6 saat 32 dk</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-4 -left-4 rounded-xl px-4 py-2.5 bg-card/90 backdrop-blur-sm border border-border/50 shadow-xl flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold gradient-text">9+</p>
                    <p className="text-[10px] text-muted-foreground">Malzeme</p>
                  </div>
                </div>
              </m.div>
            </div>
          </div>
        </section>

        {/* ===== TRUST BAR ===== */}
        <section className="border-y border-border/40 bg-muted/30">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
              {stats.map((stat, i) => (
                <m.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-3">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-3xl md:text-4xl font-extrabold gradient-text">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </m.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== SERVICES ===== */}
        <section className="py-16 sm:py-20 px-4">
          <div className="container max-w-7xl mx-auto">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center space-y-4 mb-12"
            >
              <Badge variant="outline" className="px-4 py-1 text-xs font-medium border-primary/20 bg-primary/5 text-primary rounded-full">
                Hizmetlerimiz
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold">
                <span className="gradient-text">Profesyonel</span> 3D Baskı Çözümleri
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                FDM&apos;den SLA&apos;ya, tasarım desteğinden özel kaplamaya kadar her ihtiyaca uygun çözümler
              </p>
            </m.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {services.map((service, i) => (
                <m.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Link href="/hizmetler">
                    <div className="group relative h-full rounded-2xl border border-border/50 bg-card p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
                      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300', service.gradient)} />
                      <div className="relative z-10 space-y-4">
                        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300', service.iconBg)}>
                          <service.icon className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold text-lg">{service.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{service.desc}</p>
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Detaylı Bilgi
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </m.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="py-16 sm:py-20 px-4 bg-muted/30">
          <div className="container max-w-7xl mx-auto">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center space-y-4 mb-14"
            >
              <Badge variant="outline" className="px-4 py-1 text-xs font-medium border-primary/20 bg-primary/5 text-primary rounded-full">
                Nasıl Çalışır?
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold">
                3 Adımda <span className="gradient-text">Sipariş Ver</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Karmaşık süreçleri basitleştirdik. Dosyanızı yükleyin, ayarları seçin, gerisini bize bırakın.
              </p>
            </m.div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 relative">
              {[
                {
                  step: '01',
                  icon: Upload,
                  title: 'Dosya Yükle',
                  desc: 'STL, OBJ veya 3MF dosyanızı sürükle-bırak ile yükleyin. Sistem otomatik olarak modelinizi analiz etsin.',
                  gradient: 'from-blue-500/20 to-cyan-500/20',
                },
                {
                  step: '02',
                  icon: Microscope,
                  title: 'Malzeme & Kalite Seç',
                  desc: '9+ malzeme seçeneği arasından ihtiyacınıza uygun olanı belirleyin. Renk, doluluk ve kalite ayarlarını yapın.',
                  gradient: 'from-violet-500/20 to-purple-500/20',
                },
                {
                  step: '03',
                  icon: Package,
                  title: 'Sipariş Ver & Takip Et',
                  desc: 'Ödemenizi güvenle tamamlayın. Üretim aşamasını ve kargonuzu gerçek zamanlı olarak takip edin.',
                  gradient: 'from-emerald-500/20 to-teal-500/20',
                },
              ].map((item, i) => (
                <m.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative"
                >
                  <div className="relative h-full rounded-2xl border border-border/50 bg-card p-8 hover:border-primary/30 transition-all duration-300 group">
                    <div className={cn('absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300', item.gradient)} />
                    <div className="relative z-10 space-y-5">
                      <div className="flex items-center justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <item.icon className="h-7 w-7 text-primary" />
                        </div>
                        <span className="text-5xl font-black text-primary/10 group-hover:text-primary/20 transition-colors">{item.step}</span>
                      </div>
                      <h3 className="text-xl font-bold">{item.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Ücretsiz</span>
                      </div>
                    </div>
                  </div>
                  {i < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-5 z-20">
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <ArrowRight className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  )}
                </m.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== WHY AXIS3 / FEATURES ===== */}
        <section className="py-16 sm:py-20 px-4">
          <div className="container max-w-7xl mx-auto">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center space-y-4 mb-12"
            >
              <Badge variant="outline" className="px-4 py-1 text-xs font-medium border-primary/20 bg-primary/5 text-primary rounded-full">
                Neden AXIS3?
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold">
                Bizi <span className="gradient-text">Farklı Kılan</span> Özellikler
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                3D baskı sürecinizi hızlandıran ve kolaylaştıran teknolojik altyapı
              </p>
            </m.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((feature, i) => (
                <m.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="group h-full rounded-2xl border border-border/40 bg-card p-6 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <feature.icon className="h-5.5 w-5.5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1.5">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                      </div>
                    </div>
                  </div>
                </m.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== TESTIMONIALS ===== */}
        <section className="py-16 sm:py-20 px-4 bg-muted/30">
          <div className="container max-w-7xl mx-auto">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center space-y-4 mb-12"
            >
              <Badge variant="outline" className="px-4 py-1 text-xs font-medium border-primary/20 bg-primary/5 text-primary rounded-full">
                Müşteri Yorumları
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold">
                Müşterilerimiz <span className="gradient-text">Ne Diyor?</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Binlerce mutlu müşterinin tercih ettiği 3D baskı platformu
              </p>
            </m.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {testimonials.slice(0, 3).map((item, i) => (
                <m.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <div className="group h-full rounded-2xl border border-border/40 bg-card p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-300 relative">
                    <Quote className="absolute top-5 right-5 h-8 w-8 text-primary/5 group-hover:text-primary/10 transition-colors" />
                    <div className="flex items-center gap-0.5 mb-4">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={cn(
                            'h-4 w-4',
                            idx < item.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted-foreground/20'
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5 italic">
                      &ldquo;{item.content}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                        {item.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.title}</p>
                      </div>
                    </div>
                  </div>
                </m.div>
              ))}
            </div>

            <m.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="flex flex-wrap items-center justify-center gap-3 mt-8"
            >
              {testimonials.slice(3).map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border/30 bg-card/50 text-sm">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className={cn(
                          'h-3 w-3',
                          idx < item.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground/20'
                        )}
                      />
                    ))}
                  </div>
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{item.title}</span>
                </div>
              ))}
            </m.div>
          </div>
        </section>

        {/* ===== BLOG ===== */}
        {blogPosts.length > 0 && (
          <section className="py-16 sm:py-20 px-4">
            <div className="container max-w-7xl mx-auto">
              <m.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center space-y-4 mb-12"
              >
                <Badge variant="outline" className="px-4 py-1 text-xs font-medium border-primary/20 bg-primary/5 text-primary rounded-full">
                  <Newspaper className="h-3.5 w-3.5 mr-1.5" />
                  Blog
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold">
                  Son <span className="gradient-text">Blog</span> Yazıları
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  3D baskı teknolojileri, ipuçları ve endüstriyel uygulamalar hakkında en güncel yazılar
                </p>
              </m.div>

              {(() => {
                const featured = blogPosts[0];
                const rest = blogPosts.slice(1);

                return (
                  <div className="space-y-10">
                    {/* Featured */}
                    {featured && (
                      <div>
                        <div className="flex items-center gap-2 mb-5">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Öne Çıkan
                          </span>
                        </div>
                        <m.div
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                        >
                          <Link href={`/blog/${featured.slug}`} className="group block">
                            <div className="rounded-2xl border border-border/40 bg-card overflow-hidden hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 md:grid md:grid-cols-2">
                              {featured.featured_image ? (
                                <div className="relative h-56 md:h-full min-h-[260px] overflow-hidden">
                                  <Image
                                    src={featured.featured_image}
                                    alt={featured.title}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                </div>
                              ) : (
                                <div className="h-56 md:h-full min-h-[260px] bg-gradient-to-br from-primary/5 to-muted flex items-center justify-center">
                                  <Newspaper className="h-16 w-16 text-primary/20" />
                                </div>
                              )}
                              <div className="p-6 md:p-8 flex flex-col justify-center">
                                <div className="flex items-center gap-3 mb-3">
                                  {featured.category_id && categoryMap.has(featured.category_id) && (
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                                      {categoryMap.get(featured.category_id)}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(featured.published_at || featured.created_at).toLocaleDateString('tr-TR', {
                                      year: 'numeric', month: 'long', day: 'numeric',
                                    })}
                                  </span>
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                                  {featured.title}
                                </h3>
                                {featured.excerpt && (
                                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                                    {featured.excerpt}
                                  </p>
                                )}
                                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                                  Okumaya Devam Et
                                  <ArrowRight className="h-4 w-4" />
                                </span>
                              </div>
                            </div>
                          </Link>
                        </m.div>
                      </div>
                    )}

                    {/* Remaining */}
                    {rest.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-5">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Diğer Yazılar
                          </span>
                        </div>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                          {rest.map((post, i) => (
                            <m.div
                              key={post.id}
                              initial={{ opacity: 0, y: 20 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true }}
                              transition={{ delay: i * 0.08 }}
                            >
                              <Link href={`/blog/${post.slug}`} className="group block h-full">
                                <div className="h-full rounded-2xl border border-border/40 bg-card overflow-hidden hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                                  {post.featured_image ? (
                                    <div className="relative h-48 overflow-hidden">
                                      <Image
                                        src={post.featured_image}
                                        alt={post.title}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                    </div>
                                  ) : (
                                    <div className="h-48 bg-gradient-to-br from-primary/5 to-muted flex items-center justify-center">
                                      <Newspaper className="h-12 w-12 text-primary/20" />
                                    </div>
                                  )}
                                  <div className="p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                      {post.category_id && categoryMap.has(post.category_id) && (
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                                          {categoryMap.get(post.category_id)}
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(post.published_at || post.created_at).toLocaleDateString('tr-TR', {
                                          year: 'numeric', month: 'long', day: 'numeric',
                                        })}
                                      </span>
                                    </div>
                                    <h3 className="font-semibold text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                      {post.title}
                                    </h3>
                                    {post.excerpt && (
                                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                        {post.excerpt}
                                      </p>
                                    )}
                                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                      Okumaya Devam Et
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </span>
                                  </div>
                                </div>
                              </Link>
                            </m.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!featured && rest.length === 0 && (
                      <p className="text-center text-muted-foreground text-sm">Henüz blog yazısı bulunmuyor.</p>
                    )}
                  </div>
                );
              })()}

              <m.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="text-center mt-8"
              >
                <Button variant="outline" asChild className="rounded-xl gap-2">
                  <Link href="/blog">
                    Tüm Yazıları Gör
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </m.div>
            </div>
          </section>
        )}

        {/* ===== FAQ ===== */}
        <section className="py-16 sm:py-20 px-4 bg-muted/30">
          <div className="container max-w-3xl mx-auto">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center space-y-4 mb-12"
            >
              <Badge variant="outline" className="px-4 py-1 text-xs font-medium border-primary/20 bg-primary/5 text-primary rounded-full">
                Sık Sorulan Sorular
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold">
                Merak <span className="gradient-text">Ettikleriniz</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                3D baskı süreci hakkında en çok sorulan sorular
              </p>
            </m.div>

            <Accordion className="space-y-3">
              {faqItems.map((item, i) => (
                <AccordionItem
                  key={i}
                  isOpen={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                  trigger={
                    <div className="flex items-center justify-between w-full px-5 py-4 text-left">
                      <span className="font-medium text-sm pr-4">{item.question}</span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200',
                          openFaq === i && 'rotate-180'
                        )}
                      />
                    </div>
                  }
                  content={
                    <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                      {item.answer}
                    </div>
                  }
                />
              ))}
            </Accordion>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="py-16 sm:py-24 px-4">
          <div className="container max-w-5xl mx-auto">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/10 p-8 sm:p-14 text-center"
            >
              <div className="absolute top-0 right-0 w-60 h-60 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-60 h-60 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
              <div className="absolute inset-0 grid-bg opacity-20" />

              <div className="relative z-10 space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                  Haydi, Projenize <span className="gradient-text">Başlayın</span>
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                  Ücretsiz hesap oluşturun, STL dosyanızı yükleyin ve saniyeler içinde fiyat teklifi alın. 
                  Profesyonel 3D baskı dünyasına adım atın.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                  <Button size="lg" asChild className="h-14 px-10 rounded-2xl text-base font-semibold gap-2.5 shadow-lg shadow-primary/25">
                    <Link href="/register">
                      <Upload className="h-5 w-5" />
                      Ücretsiz Hesap Oluştur
                    </Link>
                  </Button>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-primary/70" />
                      Ücretsiz
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-primary/70" />
                      1 Dk
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-primary/70" />
                      Taahhütsüz
                    </span>
                  </div>
                </div>
              </div>
            </m.div>
          </div>
        </section>

        <PublicFooter />
      </div>
    </LazyMotion>
  );
}
