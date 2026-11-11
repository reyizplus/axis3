'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Box, Zap, Sparkles, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  { icon: Zap, title: 'Hızlı Teslimat', desc: '24-48 saat içinde kargoda' },
  { icon: Sparkles, title: 'Kaliteli Malzeme', desc: 'Premium filament ve reçineler' },
  { icon: Shield, title: 'Güvenli Ödeme', desc: '256-bit SSL ile korunur' },
];

const footerLinks = [
  { href: '/privacy', label: 'Gizlilik Politikası' },
  { href: '/terms', label: 'Kullanım Koşulları' },
  { href: '/iletisim', label: 'İletişim' },
];

export default function AuthLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent dark:from-primary/10" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />

        <div className="w-full max-w-md space-y-6 relative z-10">
          <Link href="/" className="flex items-center justify-center group">
            <Image
              src="/navbar-logo.png"
              alt="AXIS3"
              width={130}
              height={40}
              className="h-8 lg:h-9 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
              priority
            />
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="backdrop-blur-xl bg-background/80 dark:bg-background/50 rounded-2xl p-8 shadow-2xl shadow-black/5 border border-border/50"
          >
            {children}
          </motion.div>

          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            {footerLinks.map((link, i) => (
              <span key={link.href} className="flex items-center gap-4">
                <Link href={link.href} className="hover:text-foreground transition-colors">
                  {link.label}
                </Link>
                {i < footerLinks.length - 1 && <span className="text-border">•</span>}
              </span>
            ))}
            <span className="text-border">•</span>
            <span>&copy; 2026</span>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-primary via-primary/80 to-primary/60 dark:from-primary/90 dark:via-primary/80 dark:to-primary/60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative flex flex-col items-center justify-center p-12 text-center w-full">
          <div className="max-w-md space-y-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative mx-auto w-36 h-36 mb-6"
            >
              <div className="absolute inset-0 bg-white/20 rounded-[2rem] blur-3xl animate-pulse" />
              <div className="relative flex items-center justify-center w-full h-full rounded-[2rem] bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl">
                <Box className="h-20 w-20 text-white animate-[spin_20s_linear_infinite]" strokeWidth={1.2} />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h2 className="text-4xl font-bold text-white leading-tight">
                Fikirlerinizi
                <br />
                <span className="text-white/80">Gerçeğe Dönüştürün</span>
              </h2>
              <p className="text-lg text-white/70 mt-4">
                Profesyonel 3D baskı hizmetleri ile projelerinizi hayata geçirin. Hızlı, güvenilir ve kaliteli üretim.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="grid gap-3 pt-4"
            >
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 text-left bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <feature.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{feature.title}</div>
                    <div className="text-sm text-white/60">{feature.desc}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
