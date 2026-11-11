'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, ArrowUp, ChevronRight } from 'lucide-react';

const socialLinks = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/axis3tr',
    viewBox: '0 0 24 24',
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61589043361480',
    viewBox: '0 0 24 24',
    path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  },
  {
    label: 'X (Twitter)',
    href: 'https://twitter.com/axis3tr',
    viewBox: '0 0 24 24',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/axis3',
    viewBox: '0 0 24 24',
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
];

const footerLinks = [
  {
    title: 'Hizmetler',
    links: [
      { label: '3D Baskı', href: '/hizmetler' },
      { label: 'Malzemeler', href: '/malzemeler' },
      { label: 'Mağaza', href: '/store' },
      { label: 'Fiyat Al', href: '/upload' },
      { label: 'Sipariş Takibi', href: '/siparis-takip' },
    ],
  },
  {
    title: 'Şirket',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'İletişim', href: '/iletisim' },
      { label: 'Hakkımızda', href: '/hakkimizda' },

    ],
  },
  {
    title: 'Yasal',
    links: [
      { label: 'Gizlilik Politikası', href: '/privacy' },
      { label: 'Kullanım Koşulları', href: '/terms' },
      { label: 'Çerez Politikası', href: '/cerez-politikasi' },
      { label: 'KVKK Aydınlatma Metni', href: '/kvkk-aydinlatma-metni' },
      { label: 'Mesafeli Satış Sözleşmesi', href: '/mesafeli-satis-sozlesmesi' },
      { label: 'İade ve İptal Politikası', href: '/iade-iptal-politikasi' },
      { label: 'Teslimat ve Kargo Politikası', href: '/teslimat-kargo-politikasi' },
    ],
  },
];

const paymentLogos = ['visa', 'mastercard', 'amex', 'troy', 'iyzico'];

export function PublicFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      className="relative bg-background border-t border-border/60"
      role="contentinfo"
      aria-label="Site Footer"
    >
      {/* Gradient accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 py-16">
          {/* Brand - spans 2 cols on lg */}
          <div className="lg:col-span-2 space-y-6">
            <Image
              src="/footer-icon.png"
              alt="AXIS3 Logo"
              width={140}
              height={140}
              className="h-16 w-auto object-contain"
            />
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Endüstriyel 3D baskı çözümleri ile fikirlerinizi gerçeğe dönüştürüyoruz.
              STL dosyanızı yükleyin, anında fiyat teklifi alın.
            </p>

            {/* Social links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center h-10 w-10 rounded-full border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
                  aria-label={social.label}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox={social.viewBox}>
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map((group) => (
            <div key={group.title} className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase">
                {group.title}
              </h3>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                      <ChevronRight className="h-3 w-3 text-primary/60 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 py-6 border-t border-border/60">
          <span className="text-sm font-medium text-foreground">İletişim</span>
          <a
            href="mailto:info@axis3.com.tr"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
          >
            <Mail className="h-4 w-4" />
            info@axis3.com.tr
          </a>
          <a
            href="https://wa.me/905010452778"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
          >
            <Phone className="h-4 w-4" />
            +90 501 045 27 78
          </a>
        </div>

        {/* Payment + Copyright row */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 py-6 border-t border-border/60">
          {/* Payment */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider shrink-0">
              Güvenli Ödeme
            </span>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {paymentLogos.map((logo) => (
                <Image
                  key={logo}
                  src={`/payment-logos/${logo}.svg`}
                  alt={logo}
                  width={40}
                  height={26}
                  className="h-5 sm:h-6 w-auto object-contain opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                  title={logo}
                />
              ))}
            </div>
          </div>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground text-center lg:text-right">
            &copy; {new Date().getFullYear()} AXIS3 - Endüstriyel 3D Baskı Çözümleri. Tüm hakları saklıdır.
          </p>
        </div>
      </div>

      {/* Back to top */}
      <button
        onClick={scrollToTop}
        className="absolute -top-5 right-6 lg:right-12 flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
        aria-label="Yukarı Çık"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </footer>
  );
}
