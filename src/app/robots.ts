import { MetadataRoute } from 'next';

/**
 * Robots.txt configuration for Axis3
 * Defines crawling rules for search engines and AI bots
 */
export default function robots(): MetadataRoute.Robots {
  // Get base URL from environment variable with production fallback
  // IMPORTANT: Always use .com.tr domain, not .com
  let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr';
  
  // Safety check: If environment variable is set to .com, force .com.tr
  if (baseUrl.includes('axis3.com') && !baseUrl.includes('axis3.com.tr')) {
    console.warn('⚠️ ROBOTS.TXT: Detected axis3.com in NEXT_PUBLIC_SITE_URL, forcing axis3.com.tr');
    baseUrl = baseUrl.replace('axis3.com', 'axis3.com.tr');
  }
  
  // Remove trailing slash if present
  baseUrl = baseUrl.replace(/\/$/, '');
  
  return {
    rules: [
      // Allow general search indexing but block private areas
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/*',      // Admin panel
          '/dashboard/*',  // User dashboard
          '/cart/*',       // Shopping cart
          '/checkout/*',   // Checkout process
          '/upload/*',     // File upload pages
          '/api/*',        // API endpoints
          '/auth/*',       // Authentication pages
        ],
      },
    ],
    // Sitemap location - dynamically generated
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
