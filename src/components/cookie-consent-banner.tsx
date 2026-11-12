'use client';

import { useState, useEffect, useRef } from 'react';
import { Cookie } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

const COOKIE_CONSENT_KEY = 'axis3-cookie-consent';
const SHOW_DELAY_MS = 700;

type ConsentChoice = 'accepted' | 'declined' | null;

async function syncToDb(consent: 'accepted' | 'declined') {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await supabase
    .from('users')
    .update({ cookie_consent: consent })
    .eq('id', session.user.id);
}

async function loadFromDb(): Promise<ConsentChoice> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data } = await supabase
    .from('users')
    .select('cookie_consent')
    .eq('id', session.user.id)
    .maybeSingle();
  if (data?.cookie_consent === 'accepted' || data?.cookie_consent === 'declined') {
    return data.cookie_consent;
  }
  return null;
}

export function CookieConsentBanner() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<ConsentChoice>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const consentRef = useRef<ConsentChoice>(null);

  useEffect(() => {
    consentRef.current = consent;
  }, [consent]);

  // Kayıtlı tercihi bir kez oku (localStorage + giriş yapılmışsa veritabanı).
  useEffect(() => {
    let cancelled = false;

    async function resolveConsent() {
      const saved = localStorage.getItem(COOKIE_CONSENT_KEY);

      if (saved === 'accepted') {
        if (cancelled) return;
        setConsent('accepted');
        setReady(true);
        return;
      }

      const dbConsent = await loadFromDb();
      if (cancelled) return;

      if (dbConsent === 'accepted') {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
        setConsent('accepted');
        window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: 'accepted' }));
      } else if (dbConsent === 'declined' || saved === 'declined') {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
        setConsent('declined');
      }

      setReady(true);
    }

    resolveConsent();
    return () => { cancelled = true; };
  }, []);

  // Tercih kabul edilmediyse her sayfa değişiminde bildirimi tekrar göster.
  useEffect(() => {
    if (!ready) return;

    if (consentRef.current === 'accepted') {
      setVisible(false);
      return;
    }

    setVisible(false);
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pathname, ready]);

  function persist(choice: 'accepted' | 'declined') {
    localStorage.setItem(COOKIE_CONSENT_KEY, choice);
    consentRef.current = choice;
    setConsent(choice);
    setVisible(false);
    syncToDb(choice);
    window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: choice }));
  }

  if (consent === 'accepted') return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[100] p-4 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
      <div className="mx-auto max-w-5xl glass-light dark:glass rounded-2xl border border-border/50 shadow-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <Cookie className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <h3 className="font-semibold text-foreground">Çerez Tercihleri</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Web sitemizde size en iyi deneyimi sunmak için çerezler kullanıyoruz.
              Zorunlu çerezler her zaman aktiftir. Diğer çerezleri kabul etmek isterseniz{' '}
              &ldquo;Kabul Et&rdquo; butonuna tıklayın; kabul etmek istemiyorsanız çerezleri{' '}
              <button
                type="button"
                onClick={() => persist('declined')}
                className="text-foreground/60 underline decoration-foreground/25 underline-offset-2 hover:text-foreground hover:decoration-foreground/50 transition-colors"
              >
                Reddet
              </button>{' '}
              bağlantısıyla reddedebilirsiniz. Detaylı bilgi için{' '}
              <Link href="/cerez-politikasi" className="text-primary hover:underline font-medium">
                Çerez Politikası
              </Link>{' '}
              sayfamızı ziyaret edebilirsiniz.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button size="sm" onClick={() => persist('accepted')}>
                Kabul Et
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/cerez-politikasi">Detaylı Bilgi</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
