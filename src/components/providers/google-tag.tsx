import Script from 'next/script';
import { getGtmContainerId } from '@/lib/analytics/gtm';
import { getGoogleAdsId } from '@/lib/analytics/google-ads';

/**
 * Google etiketi (gtag.js) — GTM kapsayıcısı ve/veya Google Ads kimliği.
 *
 * Google'ın talimatı: etiket her sayfanın `<head>` bölümünde, sunucudan gelen
 * HTML'in parçası olarak bulunmalı. `beforeInteractive` bunu garanti eder;
 * `afterInteractive` gibi istemci tarafında sonradan eklenmez.
 *
 * Tek yükleyici kullanılır (`gtag/js?id=<GTM>` varsa o, yoksa `<AW>`); aynı
 * sayfada iki Google etiketi yüklemek çift sayıma yol açar.
 *
 * KVKK/GDPR: **Consent Mode v2 varsayılanı `denied`**. Etiket yüklenir ama
 * kullanıcı "Kabul Et" diyene kadar reklam/analiz çerezi yazılmaz; onay
 * verildiğinde `GoogleConsentMode` bileşeni izinleri açar.
 */
export function GoogleTag() {
  const gtmId = getGtmContainerId();
  const adsId = getGoogleAdsId();

  // gtag.js yükleyicisi için tek kimlik: GTM kapsayıcısı varsa o kullanılır.
  const loaderId = gtmId ?? adsId;
  if (!loaderId) return null;

  const configLines = [gtmId, adsId]
    .filter((id): id is string => Boolean(id))
    .map((id) => `gtag('config', '${id}');`)
    .join('\n          ');

  return (
    <>
      <Script id="google-tag-init" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
            wait_for_update: 500,
            url_passthrough: true,
            ads_data_redaction: true,
          });
          gtag('js', new Date());
          ${configLines}
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${loaderId}`}
        strategy="beforeInteractive"
      />
    </>
  );
}
