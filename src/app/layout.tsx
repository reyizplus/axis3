import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ClientProviders } from '@/components/providers/client-providers';
import { CustomToaster } from '@/components/ui/custom-toaster';
import { GoogleAnalytics } from '@/components/providers/google-analytics';
import { GoogleConsentMode } from '@/components/providers/google-consent-mode';
import { GoogleTag } from '@/components/providers/google-tag';
import { WebVitals } from '@/components/providers/web-vitals';
import { generateMetadata as generateSEOMetadata, generateOrganizationSchema, generateWebSiteSchema } from '@/lib/utils/seo';
import { inter, montserrat } from '@/lib/fonts';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';

export const metadata: Metadata = generateSEOMetadata({
  title: 'AXIS3 - Profesyonel 3D Baskı Platformu | Anında Fiyat Teklifi',
  description: 'STL dosyanızı yükleyin, anında fiyat alın. Profesyonel 3D baskı hizmeti ile projelerinizi hayata geçirin. 9+ farklı malzeme, hızlı teslimat, güvenli ödeme.',
  keywords: '3D baskı, 3D printing, STL dosya, anında fiyat, profesyonel 3D baskı, PLA, ABS, PETG, 3D yazıcı hizmeti, FDM, SLA',
  url: SITE_URL,
  alternates: {
    languages: {
      'x-default': SITE_URL,
      tr: SITE_URL,
    },
  },
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebSiteSchema();

  return (
    <html lang="tr" suppressHydrationWarning className={`${inter.variable} ${montserrat.variable}`}>
      <head>
        {/* Google etiketi (GTM/AW) — Google'ın istediği gibi <head> başında,
            sunucudan gelen HTML'in içinde. Çerez yazımı Consent Mode ile
            onay verilene kadar kapalıdır. */}
        <GoogleTag />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Theme initialization - prevents flash of wrong theme. Must be sync/blocking before React hydration. Server-rendered to avoid React 19 client script warning. */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){var e="class",i="theme",s="light",u=null,m=["light","dark"],a=null,l=true,h=true;let d=document.documentElement,w=["light","dark"];function p(n){(Array.isArray(e)?e:[e]).forEach(function(y){var k=y==="class",S=k&&a?m.map(function(f){return a[f]||f}):m;k?(d.classList.remove.apply(d.classList,S),d.classList.add(a&&a[n]?a[n]:n)):d.setAttribute(y,n)}),R(n)}function R(n){h&&w.indexOf(n)!==-1&&(d.style.colorScheme=n)}function c(){return window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}if(u)p(u);else try{var n=localStorage.getItem(i)||s,y=l&&n==="system"?c():n;p(y)}catch(n){}})();
        `}} />

        {/* Critical CSS - Inline for LCP optimization */}
        <style suppressHydrationWarning dangerouslySetInnerHTML={{
          __html: `
            /* Critical above-the-fold styles */
            body {
              margin: 0;
              font-family: var(--font-montserrat), var(--font-inter), system-ui, -apple-system, sans-serif;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            .hero-title {
              font-size: clamp(2.5rem, 5vw, 4.5rem);
              font-weight: 700;
              line-height: 1.1;
              letter-spacing: -0.02em;
            }
            .gradient-text {
              background: linear-gradient(135deg, #F27022 0%, #FF8C42 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }
          `
        }} />
        
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        <GoogleConsentMode />
        <ClientProviders />
        <WebVitals />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <CustomToaster />
          </AuthProvider>
        </ThemeProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
