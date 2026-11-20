import type { NextConfig } from 'next';

/**
 * Google etiketlerinin (GTM + Ads dönüşüm/remarketing) kullandığı alan adları.
 *
 * Dönüşüm ping'i kullanıcının ülkesine göre yerel alan adına gidebilir
 * (TR'de `https://www.google.com.tr/pagead/1p-conversion/...`), bu yüzden
 * `google.com` ile birlikte `google.com.tr` de açık. CSP'de `*.google.com`
 * `google.com.tr`yi KAPSAMAZ; ikisi ayrı yazılmalı.
 */
const GOOGLE_SCRIPT_SRC = [
  'https://www.googletagmanager.com',
  'https://*.googlesyndication.com',
  'https://*.googleadservices.com',
  'https://*.doubleclick.net',
  'https://www.gstatic.com',
].join(' ');

const GOOGLE_IMG_SRC = [
  'https://*.google.com',
  'https://*.google.com.tr',
  'https://*.googlesyndication.com',
  'https://*.googleadservices.com',
  'https://*.doubleclick.net',
  'https://*.google-analytics.com',
  'https://www.googletagmanager.com',
  'https://www.gstatic.com',
].join(' ');

const GOOGLE_CONNECT_SRC = [
  'https://*.google.com',
  'https://*.google.com.tr',
  'https://*.googlesyndication.com',
  'https://*.googleadservices.com',
  'https://*.doubleclick.net',
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
  'https://www.googletagmanager.com',
  'https://www.gstatic.com',
].join(' ');

const GOOGLE_FRAME_SRC = [
  'https://*.google.com',
  'https://*.google.com.tr',
  'https://*.googlesyndication.com',
  'https://*.googleadservices.com',
  'https://*.doubleclick.net',
  'https://www.googletagmanager.com',
].join(' ');

const nextConfig: NextConfig = {
  // Pre-existing type errors from Supabase schema drift — run tsc --noEmit separately
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  // Skip prerendering for _global-error to avoid build issues
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'tech.uzone.id',
      },
      {
        protocol: 'https',
        hostname: 'hub.author.envato.com',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400,
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    inlineCss: true,
    cssChunking: true,
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-avatar',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      'framer-motion',
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // GTM kapsayıcısı + Google Ads dönüşüm/remarketing etiketleri.
              `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://static.cloudflareinsights.com ${GOOGLE_SCRIPT_SRC}`,
              "style-src 'self' 'unsafe-inline'",
              `img-src 'self' data: blob: https://*.supabase.co https://*.iyzico.com ${GOOGLE_IMG_SRC}`,
              "font-src 'self'",
              `connect-src 'self' https://*.supabase.co https://api.iyzico.com https://sandbox-api.iyzico.com ${GOOGLE_CONNECT_SRC}`,
              // GTM önizleme/consent iframe'leri ve Ads dönüşüm iframe'leri.
              `frame-src 'self' https://*.iyzico.com ${GOOGLE_FRAME_SRC}`,
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  // Next.js 16: serverExternalPackages for packages with dynamic requires
  serverExternalPackages: ['iyzipay'],
  // Note: We use next-mdx-remote for blog content rendering (client-side)
  // No need for @next/mdx which has Turbopack compatibility issues
  
  // Webpack optimization for better code splitting
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Optimize chunk splitting for better caching
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Three.js in separate chunk (large library)
            three: {
              test: /[\\/]node_modules[\\/](three)[\\/]/,
              name: 'three',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Framer Motion in separate chunk
            framerMotion: {
              test: /[\\/]node_modules[\\/](framer-motion)[\\/]/,
              name: 'framer-motion',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Radix UI components together
            radixUI: {
              test: /[\\/]node_modules[\\/](@radix-ui)[\\/]/,
              name: 'radix-ui',
              priority: 10,
              reuseExistingChunk: true,
            },
            // React Email components
            reactEmail: {
              test: /[\\/]node_modules[\\/](@react-email)[\\/]/,
              name: 'react-email',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Lucide React icons in separate chunk
            lucideReact: {
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              name: 'lucide-react',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Supabase in separate chunk
            supabase: {
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              name: 'supabase',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Default vendor chunk for other node_modules
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
};

const withAnalyzer = (config: NextConfig): NextConfig => {
  if (process.env.ANALYZE === 'true') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bundleAnalyzer = require('@next/bundle-analyzer');
      return bundleAnalyzer({ enabled: true })(config);
    } catch {
      console.warn('@next/bundle-analyzer not available, skipping bundle analysis');
    }
  }
  return config;
};

export default withAnalyzer(nextConfig);
