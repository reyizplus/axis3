'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { Mail, Phone, MapPin, Clock, Loader2, CheckCircle2, Send, MessageSquare, ArrowRight, Sparkles, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const contactSchema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalıdır'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  phone: z.string().min(10, 'Telefon numarası en az 10 karakter olmalıdır'),
  message: z.string().min(20, 'Mesaj en az 20 karakter olmalıdır'),
});

const contactInfo = [
  {
    icon: Mail,
    title: 'E-posta',
    items: [
      { label: 'Genel İletişim', value: 'info@axis3.com.tr', href: 'mailto:info@axis3.com.tr' },
      { label: 'Müşteri Desteği', value: 'destek@axis3.com.tr', href: 'mailto:destek@axis3.com.tr' },
    ],
  },
  {
    icon: Phone,
    title: 'Telefon / WhatsApp',
    items: [
      { label: 'Müşteri Hattı', value: '+90 501 045 27 78', href: 'https://wa.me/905010452778' },
    ],
  },
  {
    icon: MapPin,
    title: 'Adres',
    items: [
      { label: 'Merkez', value: 'Teknoloji Geliştirme Bölgesi, Gaziantep' },
    ],
  },
  {
    icon: Clock,
    title: 'Çalışma Saatleri',
    items: [
      { label: 'Hafta İçi', value: '09:00 - 18:00' },
      { label: 'Cumartesi', value: '10:00 - 16:00' },
    ],
  },
];

export function ContactContent() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      message: formData.get('message') as string,
    };

    try {
      const validationResult = contactSchema.safeParse(data);
      if (!validationResult.success) {
        const firstError = validationResult.error.issues[0];
        toast.error(firstError?.message || 'Lütfen formu eksiksiz doldurun');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
      }

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Mesaj gönderilemedi');
      }

      toast.success('Mesajınız başarıyla gönderildi!');
      setIsSuccess(true);
      const form = e.currentTarget;
      if (form) form.reset();
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      console.error('Contact form error:', error);
      toast.error(error instanceof Error ? error.message : 'Mesaj gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  }

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
                İletişim
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-5">
                Size
                <span className="block gradient-text">Nasıl Yardımcı Olabiliriz?</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
                Sorularınız, önerileriniz veya projeleriniz için bize ulaşın. 
                En kısa sürede size dönüş yapalım.
              </p>
              <div className="flex flex-wrap gap-3">
                {['Hızlı Yanıt', '7/24 Destek', 'Uzman Ekip'].map((tag) => (
                  <span key={tag} className="px-3 py-1.5 rounded-full bg-muted/70 text-xs font-medium text-muted-foreground border border-border/50">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="hidden lg:block relative">
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/images/contact-bg.webp"
                  alt="AXIS3 İletişim"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
              </div>
              <div className="absolute -bottom-5 -right-5 flex gap-2">
                <div className="px-4 py-2 rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 shadow-xl flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">Hızlı Yanıt</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto px-4 pb-16 max-w-7xl">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border/50 bg-card p-6 sm:p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">Mesaj Gönder</h2>
                <p className="text-sm text-muted-foreground">Formu doldurun, en kısa sürede size dönüş yapalım.</p>
              </div>

              {isSuccess ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center mb-5">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Mesajınız Gönderildi!</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Teşekkür ederiz. En kısa sürede size dönüş yapacağız.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="name">Ad Soyad *</Label>
                      <Input id="name" name="name" placeholder="Adınız ve soyadınız" required disabled={isSubmitting} className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-posta *</Label>
                      <Input id="email" name="email" type="email" placeholder="ornek@email.com" required disabled={isSubmitting} className="h-11 rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon *</Label>
                    <Input id="phone" name="phone" type="tel" placeholder="0555 123 45 67" required disabled={isSubmitting} className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Mesajınız *</Label>
                    <textarea
                      id="message"
                      name="message"
                      className="flex min-h-[140px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      placeholder="Mesajınızı buraya yazın..."
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-xl gap-2" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Mesajı Gönder
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-4">
            {contactInfo.map((group, i) => (
              <div key={i} className="rounded-2xl border border-border/40 bg-card p-5 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <group.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm mb-1.5">{group.title}</h3>
                    <div className="space-y-1">
                      {group.items.map((item, idx) => (
                        <div key={idx}>
                          {'href' in item ? (
                            <a
                              href={item.href}
                              target={item.href.startsWith('http') ? '_blank' : undefined}
                              rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                              className="text-sm text-muted-foreground hover:text-primary transition-colors block"
                            >
                              <span className="text-[11px] text-muted-foreground/60 block -mt-0.5">{item.label}</span>
                              {item.value}
                            </a>
                          ) : (
                            <div>
                              <span className="text-[11px] text-muted-foreground/60 block -mt-0.5">{item.label}</span>
                              <span className="text-sm text-muted-foreground">{item.value}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* WhatsApp CTA */}
            <a
              href="https://wa.me/905010452778"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-200/50 dark:border-green-800/30 p-5 hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">WhatsApp&apos;tan Yazın</p>
                  <p className="text-xs text-muted-foreground">Hızlı yanıt için</p>
                </div>
                <ArrowRight className="h-5 w-5 text-green-600 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
