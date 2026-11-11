'use client';

import { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

const COOKIE_CONSENT_KEY = 'axis3-cookie-consent';

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
  const [consent, setConsent] = useState<ConsentChoice>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_CONSENT_KEY) as ConsentChoice;
    if (saved === 'accepted') {
      setConsent('accepted');
      return;
    }
    let cancelled = false;
    loadFromDb().then((dbConsent) => {
      if (cancelled) return;
      if (dbConsent === 'accepted') {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
        setConsent('accepted');
        window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: 'accepted' }));
        return;
      }
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    });
    return () => { cancelled = true; };
  }, []);

  function handleAccept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setConsent('accepted');
    setVisible(false);
    syncToDb('accepted');
    window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: 'accepted' }));
  }

  function handleDismiss() {
    setVisible(false);
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
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Çerez Tercihleri</h3>
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Web sitemizde size en iyi deneyimi sunmak için çerezler kullanıyoruz.
              Zorunlu çerezler her zaman aktiftir. Diğer çerezleri kabul etmek isterseniz
              &ldquo;Kabul Et&rdquo; butonuna tıklayın. Detaylı bilgi için{' '}
              <Link href="/cerez-politikasi" className="text-primary hover:underline font-medium">
                Çerez Politikası
              </Link>{' '}
              sayfamızı ziyaret edebilirsiniz.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button size="sm" onClick={handleAccept}>
                Kabul Et
              </Button>
              <Button size="sm" variant="outline" onClick={handleDismiss}>
                Şimdi Değil
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/cerez-politikasi">Detaylı Bilgi</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
