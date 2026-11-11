import { Metadata } from 'next';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import Link from 'next/link';
import { generateMetadata as generateSEOMetadata } from '@/lib/utils/seo';
import { Microscope, Ruler, Thermometer, Shield, ArrowRight, Sparkles, CheckCircle2, FlaskConical } from 'lucide-react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Malzeme Kataloğu | AXIS3 - 3D Baskı Malzemeleri',
  description: 'PLA, ABS, PETG, Resin ve daha fazlası. Projeleriniz için geniş 3D baskı malzeme yelpazesi. FDM ve SLA teknolojileri için uygun malzemeler.',
  keywords: '3D baskı malzemeleri, PLA, ABS, PETG, Resin, FDM malzemeler, SLA malzemeler, 3D printer filament',
  url: `${SITE_URL}/malzemeler`,
});

interface Material {
  id: string;
  name: string;
  technology: 'FDM' | 'SLA';
  description: string | null;
  colors: string[];
  is_active: boolean;
}

const techColors: Record<string, string> = {
  PLA: 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800',
  'PLA+': 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800',
  ABS: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
  PETG: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800',
  TPU: 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800',
  Naylon: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800',
  Reçine: 'bg-pink-500/10 text-pink-600 border-pink-200 dark:border-pink-800',
  Flex: 'bg-teal-500/10 text-teal-600 border-teal-200 dark:border-teal-800',
};

const techInfo = [
  { icon: Thermometer, label: 'Baskı Sıcaklığı', value: '190-260°C' },
  { icon: Ruler, label: 'Tabla Sıcaklığı', value: '50-110°C' },
  { icon: Shield, label: 'Dayanıklılık', value: 'Yüksek' },
  { icon: Microscope, label: 'Detay Kalitesi', value: 'Orta-Yüksek' },
];

export default async function MalzemelerPage() {
  const supabase = await createClient();
  const { data: materials } = await supabase
    .from('materials')
    .select('id, name, technology, description, colors, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true });

  const activeMaterials = (materials || []) as unknown as Material[];
  const fdmMaterials = activeMaterials.filter(m => m.technology === 'FDM');
  const slaMaterials = activeMaterials.filter(m => m.technology === 'SLA');

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
                Malzeme Kataloğu
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-5">
                Geniş <span className="gradient-text">Malzeme</span> Yelpazesi
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
                PLA&apos;dan Reçine&apos;ye, ABS&apos;den TPU&apos;ya 9&apos;dan fazla malzeme 
                seçeneğiyle projeniz için en doğru malzemeyi seçin.
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(techColors).slice(0, 6).map((name) => (
                  <span key={name} className={cn('px-3 py-1 rounded-full text-xs font-medium border', techColors[name] || 'bg-muted/50 text-muted-foreground')}>
                    {name}
                  </span>
                ))}
                {Object.keys(techColors).length > 6 && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground border border-border/50">
                    +{Object.keys(techColors).length - 6}
                  </span>
                )}
              </div>
            </div>
            <div className="hidden lg:block relative">
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/images/materials-bg.webp"
                  alt="3D Baskı Malzemeleri"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
              </div>
              <div className="absolute -bottom-5 -left-5 flex gap-2">
                <div className="px-4 py-2 rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 shadow-xl flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">{activeMaterials.length} Malzeme</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto px-4 pb-16 max-w-7xl">
        {activeMaterials.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card p-12 text-center">
            <FlaskConical className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Şu anda aktif malzeme bulunmuyor.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* FDM Materials */}
            {fdmMaterials.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Microscope className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">FDM Malzemeler</h2>
                    <p className="text-sm text-muted-foreground">Eriyik yığma modelleme için uygun filamentler</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {fdmMaterials.map((material) => (
                    <MaterialCard key={material.id} material={material} />
                  ))}
                </div>
              </section>
            )}

            {/* SLA Materials */}
            {slaMaterials.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <FlaskConical className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">SLA/Reçine Malzemeler</h2>
                    <p className="text-sm text-muted-foreground">Stereolitografi için uygun reçineler</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {slaMaterials.map((material) => (
                    <MaterialCard key={material.id} material={material} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Special Request */}
        <div className="mt-12 rounded-2xl border border-border/40 bg-gradient-to-br from-muted/50 to-muted/20 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">Özel Malzeme Talebi</h3>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Listede görmediğiniz bir malzeme mi arıyorsunuz? Bizimle iletişime geçin, 
                  özel malzeme taleplerinizi değerlendirelim.
                </p>
              </div>
            </div>
            <Link href="/iletisim">
              <Button className="rounded-xl gap-2 whitespace-nowrap">
                İletişime Geç
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

function MaterialCard({ material }: { material: Material }) {
  return (
    <Card className="group border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-base">{material.name}</CardTitle>
          <Badge
            variant={material.technology === 'FDM' ? 'default' : 'secondary'}
            className="rounded-lg text-[10px] px-2 py-0.5"
          >
            {material.technology}
          </Badge>
        </div>
        {material.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{material.description}</p>
        )}
      </CardHeader>
      <CardContent>
        {material.colors && material.colors.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Renk Seçenekleri</h4>
            <div className="flex flex-wrap gap-1.5">
              {material.colors.map((color) => (
                <span key={color} className="px-2.5 py-1 rounded-lg bg-muted/50 text-xs text-muted-foreground border border-border/40">
                  {color}
                </span>
              ))}
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="w-full mt-4 rounded-xl gap-1 text-xs h-9 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Link href="/register">
            Bu Malzeme ile Baskı Yaptır
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
