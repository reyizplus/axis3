import localFont from 'next/font/local';

/**
 * Yerel yazı tipi dosyaları (Google Fonts latin subset variable woff2).
 * next/font/google yerine next/font/local kullanılıyor: build sırasına
 * Google Fonts API'sine ağ isteği yapmamak için.
 */
export const inter = localFont({
  src: '../fonts/inter-latin.woff2',
  variable: '--font-inter',
  display: 'swap',
  weight: '100 900',
});

export const montserrat = localFont({
  src: '../fonts/montserrat-latin.woff2',
  variable: '--font-montserrat',
  display: 'swap',
  weight: '100 900',
});