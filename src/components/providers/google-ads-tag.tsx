import Script from 'next/script';
import { getGoogleAdsId } from '@/lib/analytics/google-ads';

/**
 * Google Ads dönüşüm etiketi (gtag.js).
 *
 * Google'ın verdiği snippet `<head>` içinde, sunucudan gelen HTML'in parçası
 * olarak bulunmalıdır; Google'ın etiket doğrulama araçları kaynağı bu şekilde
 * görür. Bu yüzden `beforeInteractive` kullanılıyor: Next.js bu script'leri
 * ilk HTML'in `head` bölümüne koyar (istemci tarafında sonradan eklemez).
 *
 * KVKK/GDPR: Etiket herkese açık yüklenir ama **Consent Mode v2 varsayılanı
 * `denied`** olduğu için onay verilene kadar reklam/analiz çerezi yazılmaz.
 * Kullanıcı "Kabul Et" dediğinde `GoogleConsentMode` bileşeni `consent/update`
 * ile izinleri açar.
 */
export function GoogleAdsTag() {
  const adsId = getGoogleAdsId();
  if (!adsId) return null;

  return (
    <>
      <Script id="google-ads-consent-default" strategy="beforeInteractive">
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
          gtag('config', '${adsId}');
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${adsId}`}
        strategy="beforeInteractive"
      />
    </>
  );
}
