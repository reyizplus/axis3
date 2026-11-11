/**
 * SEO Utilities for Axis3
 * Centralized SEO metadata generation with comprehensive Open Graph and Twitter Card support
 */

import { Metadata } from 'next';

// Site configuration - Uses environment variable with production fallback
// IMPORTANT: Always use .com.tr domain, not .com
function getSiteUrl(): string {
  let url = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';
  
  // Safety check: If environment variable is set to .com, force .com.tr
  if (url.includes('axis3.com') && !url.includes('axis3.com.tr')) {
    console.warn('⚠️ SEO: Detected axis3.com in NEXT_PUBLIC_SITE_URL, forcing axis3.com.tr');
    url = url.replace('axis3.com', 'axis3.com.tr');
  }
  
  // Remove trailing slash if present
  return url.replace(/\/$/, '');
}

const SITE_URL = getSiteUrl();
export const SITE_NAME = 'AXIS3';
const DEFAULT_TITLE = 'AXIS3 - Profesyonel 3D Baskı Platformu';
const DEFAULT_DESCRIPTION = 'STL dosyanızı yükleyin, anında fiyat alın. Profesyonel 3D baskı hizmeti ile projelerinizi hayata geçirin. 9+ farklı malzeme, hızlı teslimat, güvenli ödeme.';
const DEFAULT_IMAGE = `${SITE_URL}/logo.png`;
export const TWITTER_HANDLE = '@axis3tr';

export interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  noIndex?: boolean;
  alternates?: Metadata['alternates'];
}

/**
 * Generate comprehensive metadata for a page
 */
export function generateMetadata(config: SEOConfig = {}): Metadata {
  const {
    title = DEFAULT_TITLE,
    description = DEFAULT_DESCRIPTION,
    keywords,
    image = DEFAULT_IMAGE,
    url = SITE_URL,
    type = 'website',
    publishedTime,
    modifiedTime,
    author,
    noIndex = false,
    alternates: extraAlternates,
  } = config;

  const fullUrl = url.startsWith('http') ? url : `${SITE_URL}${url}`;
  const fullImage = image.startsWith('http') ? image : `${SITE_URL}${image}`;

  return {
    title,
    description,
    keywords,
    authors: author ? [{ name: author }] : undefined,
    creator: SITE_NAME,
    publisher: SITE_NAME,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: fullUrl,
      languages: {
        'x-default': fullUrl,
        tr: fullUrl,
      },
      ...extraAlternates,
    },
    openGraph: {
      type,
      locale: 'tr_TR',
      url: fullUrl,
      siteName: SITE_NAME,
      title,
      description,
      images: [
        {
          url: fullImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    twitter: {
      card: 'summary_large_image',
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      title,
      description,
      images: [fullImage],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
        verification: {
          google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
          yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
          ...(process.env.NEXT_PUBLIC_BING_VERIFICATION && {
            other: {
              'msvalidate.01': process.env.NEXT_PUBLIC_BING_VERIFICATION,
            },
          }),
        },
  };
}

/**
 * Generate JSON-LD structured data for Organization
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: DEFAULT_DESCRIPTION,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'TR',
      addressLocality: 'Türkiye',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+90-501-045-27-78',
      contactType: 'customer service',
      email: 'info@axis3.com.tr',
      availableLanguage: ['Turkish'],
    },
    sameAs: [
      'https://www.instagram.com/axis3tr',
      'https://www.facebook.com/profile.php?id=61589043361480',
      'https://twitter.com/axis3tr',
      'https://www.linkedin.com/company/axis3',
    ],
  };
}

/**
 * Generate JSON-LD structured data for WebSite
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generate JSON-LD structured data for BreadcrumbList
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

/**
 * Generate JSON-LD structured data for Article
 */
export function generateArticleSchema(config: {
  title: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  url: string;
}) {
  const { title, description, image, datePublished, dateModified, author, url } = config;
  const fullUrl = url.startsWith('http') ? url : `${SITE_URL}${url}`;
  const fullImage = image.startsWith('http') ? image : `${SITE_URL}${image}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image: fullImage,
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      '@type': 'Person',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': fullUrl,
    },
  };
}

/**
 * Generate JSON-LD structured data for Product/Service
 */
export function generateServiceSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: '3D Baskı Hizmeti',
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    description: 'Profesyonel FDM ve SLA teknolojileri ile yüksek kaliteli 3D baskı hizmeti',
    serviceType: '3D Printing Service',
    areaServed: {
      '@type': 'Country',
      name: 'Turkey',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: '3D Baskı Hizmetleri',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'FDM 3D Baskı',
            description: 'PLA, ABS, PETG malzemeler ile FDM baskı hizmeti',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'SLA 3D Baskı',
            description: 'Resin malzemeler ile yüksek detaylı SLA baskı hizmeti',
          },
        },
      ],
    },
  };
}

/**
 * Generate JSON-LD script string for embedding in HTML
 */
export function getJsonLdScript(data: object): string {
  return JSON.stringify(data);
}
