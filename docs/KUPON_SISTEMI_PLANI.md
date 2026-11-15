# AXIS3 — Kupon (İndirim Kodu) Sistemi Uygulama Planı

**Tarih:** 2026-11-15
**Durum:** Onay bekliyor
**Kapsam:** 3D baskı hizmet siparişleri + mağaza ürünleri

---

## 1. Amaç

Müşterilerin ödeme adımında indirim kodu girerek siparişlerine indirim uygulayabilmesi; yönetim tarafında ise kuponların tanımlanması, sınırlandırılması ve kullanımının izlenmesi.

## 2. Mevcut Durum (kod kanıtları)

| Konu | Bugünkü durum |
| --- | --- |
| Kupon altyapısı | Yok. `src/` ve `supabase/` içinde `coupon`, `kupon`, `promo` eşleşmesi bulunmuyor. |
| Fiyat otoritesi | `src/lib/services/order-creation-service.ts` — tüm birim fiyatlar sunucuda, DB verisinden yeniden hesaplanıyor. |
| Toplam matematiği | `src/lib/services/order-totals.ts` — `subtotal`, `shipping`, `vat`, `total`. KDV `(ara toplam + kargo)` üzerinden. |
| Fiyat sapması koruması | İstemci `expectedTotal` gönderiyor; sunucu toplamı 0,02 TL'den fazla farklıysa sipariş 409 ile reddediliyor. |
| Sipariş şeması | `orders.discount_amount` kolonu **zaten mevcut** (001_initial_schema.sql). Kupon referansı yok. |
| Ödeme | iyzico checkout form; `basketItems` toplamının `paidPrice` ile **birebir** eşit olması zorunlu (`payment-service.ts`). Bugün fark, son kaleme eklenerek düzeltiliyor. |
| İptal akışı | `order-cancellation-service.ts` → `releaseOrderStock()`; ödeme başarısız/terk edilirse stok iade ediliyor. Kuponun da aynı noktada serbest bırakılması gerekiyor. |
| Admin yetkileri | `admin_permissions` tablosu + `has_admin_permission()`; menü anahtarları `admin-shell.tsx`, yetki listesi `admin-service-server.ts` içinde. |

**Sonuç:** Kupon, mevcut "sunucu tek fiyat otoritesi" mimarisine eklemlenmeli; istemciye hesaplatılmamalı.

## 3. Kapsam

### Dahil
- Yüzde, sabit tutar ve ücretsiz kargo kuponları
- Para birimi: TL; tek kupon / sipariş
- **İki kod modeli:** genel kampanya kodları + kişiye özel kodlar
- **Toplu kişiye özel kod üretimi** (N adet kod, istenirse kullanıcılara atanır)
- **Kota ile otomatik sonlanma:** admin, kotanın **kişi** ya da **kullanım** bazlı sayılmasını seçer; tanımlı sayıya ulaşınca kampanya kendiliğinden kapanır ("Tükendi")
- **Kullanıcı başına kullanım:** tek kullanım / her siparişte / N kez (admin seçer)
- **Geçerlilik:** süresiz / tarih aralığı / oluşturma + N gün (genel ve kişiye özel tüm kodlarda)
- Minimum sepet tutarı, ilk sipariş koşulu, kapsam (tümü / 3D / mağaza)
- **Sepet ve checkout** sayfalarında kupon girişi (tek paylaşılan durum)
- Admin panelden tam CRUD + kullanım istatistiği
- Sipariş oluşturma, ödeme, iptal ve e-posta akışlarına entegrasyon
- Birim testleri + manuel kabul senaryoları

### Hariç (v1)
- Kupon birleştirme (iki kupon aynı siparişte)
- Ürün veya kategori bazlı kupon (v2)
- Sadakat puanı / cüzdan bakiyesi
- Otomatik kampanya (terk edilmiş sepet hatırlatma vb.)

## 4. Tasarım Kararları (öneri)

### 4.1 Hesap sırası

```
A  = 3D kalem toplamı + mağaza kalem toplamı      (kalem indirimleri dahil)
D  = kupon indirimi = min(kupon hesabı, A)         (asla A'yı aşmaz, negatif olamaz)
K  = kargo                                         (ücretsiz kargo kuponu → 0)
KDV = round((A − D + K) × vatRate)
TOPLAM = round(A − D + K + KDV)
```

- Kupon indirimi **KDV matrahını düşürür** (mali mevzuat gereği).
- Ücretsiz kargo eşiği **indirim öncesi A** üzerinden değerlendirilir; kupon müşteriyi ücretsiz kargo hakkından etmez.
- Minimum sipariş tutarı da **indirim öncesi A** üzerinden kontrol edilir.
- Tüm yuvarlamalar `roundMoney` ile kuruş bazında; istemci ve sunucu **aynı saf fonksiyonu** kullanır.

### 4.2 Kupon tipleri

| Tip | Hesap | Ek alan |
| --- | --- | --- |
| `percentage` | `A_kapsam × değer/100`, üst sınır varsa kırpılır | `max_discount_amount` |
| `fixed_amount` | `min(değer, A_kapsam)` | — |
| `free_shipping` | `D = 0`, `K = 0` | — |

`A_kapsam`: kupon `applies_to = service | store` ise ilgili alt toplam, `all` ise `A`.

### 4.3 Doğrulama ve otorite

- **Önizleme:** `POST /api/v1/coupons/validate` yalnızca gösterim amaçlı indirim tutarı döner. İstemcinin gönderdiği ara toplam **fiyatlandırma için kullanılmaz**.
- **Kesin hesap:** Sipariş oluşturulurken kupon kodu sunucuda yeniden doğrulanır ve indirim, sunucunun hesapladığı kalem tutarları üzerinden hesaplanır.
- Mevcut `expectedTotal` sapma kontrolü korunur; istemci indirimli toplamı gönderir, sunucu farklıysa 409 + "Fiyatlar güncellendi" mesajı döner.
- İstemci kuponu uyguladıktan sonra sepet değişirse kupon önizlemesi geçersiz sayılır ve otomatik yeniden doğrulanır.

### 4.4 Kod modelleri

| Model | Alan | Davranış |
| --- | --- | --- |
| Genel kampanya | `owner_user_id = NULL` | Tüm oturum açmış kullanıcılar kullanabilir; kullanım kuralları bölümündeki sınırlara tabidir. |
| Kişiye özel | `owner_user_id = <uuid>` | Yalnızca o kullanıcı kullanabilir. Başka kullanıcı dener → "Kupon bulunamadı" (kod varlığı sızdırılmaz). |
| Toplu kişiye özel | `owner_user_id` + ortak `batch_id` | Admin "N adet kod üret" der; kodlar aynı ayarlarla üretilir, istenirse kullanıcılara atanır, istenirse atanmadan dışa aktarılır (CSV). Kota kampanya (batch) düzeyinde sayılır. |

### 4.5 Kullanım kuralları (admin panelden seçilir)

Her kupon için üç kural bağımsız seçilir:

**1) Kota bazı (`quota_basis`) — ne sayılacak?**

| Ayar | Anlamı | Tipik kullanım |
| --- | --- | --- |
| `distinct_users` (varsayılan) | Farklı **kişi** sayısı. Aynı kişi 5 kez kullansa da 1 sayılır. | "İlk 100 müşteriye %10" |
| `redemptions` | Toplam **kullanım** (sipariş) sayısı. | "Toplam 100 kullanım" |

Kota (`quota_limit`) boş bırakılırsa sınırsız. Kota dolduğunda kampanya **kapanır**: `exhausted_at` yazılır, `is_active = false` olur ve o andan itibaren kimse (daha önce kullanmış olsa bile) kullanamaz. Kişi bazlı sayımda aynı kişinin tekrar kullanımı yeni kişi saymadığı için kotayı tüketmez; ancak kota başka kullanıcılarla dolduğunda kod tamamen kapanır.

**2) Kullanıcı başına kullanım (`per_user_mode`) — tekrar kullanılabilir mi?**

| Ayar | Anlamı |
| --- | --- |
| `single` (varsayılan) | Kullanıcı başına **1 kez**. Kişiye özel kodlarda varsayılan budur. |
| `unlimited` | **Her siparişte** kullanılabilir. |
| `limited` | `per_user_limit = N` ile belirli sayıda. |

**3) Geçerlilik (`validity_mode`) — ne zamana kadar?**

| Ayar | Saklama | Anlamı |
| --- | --- | --- |
| `unlimited` | `starts_at = NULL`, `ends_at = NULL` | Süresiz, admin pasife alana kadar. |
| `date_range` | `starts_at`, `ends_at` | Belirli tarih aralığında geçerli (başlangıç/bitiş ayrı ayrı boş bırakılabilir). |
| `duration` | `ends_at = now() + N gün` | "Oluşturulduktan sonra N gün geçerli" kısayolu; veritabanında mutlak tarihe çevrilir. |

Kişiye özel ve genel kodların **hepsinde** bu üç kural aynı formdan seçilir; toplu üretimde seçim tüm kodlara uygulanır. `ends_at` geçmişte kaldığında kod otomatik "Süresi geçti" durumuna düşer (ek cron gerekmez, okuma anında hesaplanır).

### 4.6 Limitler ve eşzamanlılık

- Ek koşullar: `min_order_amount`, `first_order_only`, `applies_to`, `is_active`.
- Sayaç **türetilir**, ayrı kolonda tutulmaz: kullanım ve kişi sayıları `coupon_redemptions` üzerinden hesaplanır (tek doğru kaynak).
- `redeem_coupon()` kampanya anahtarı (`batch_id` varsa o, yoksa `coupon_id`) üzerinde `pg_advisory_xact_lock` alır; ardından kotayı ve kullanıcı limitini sayıp rezervasyonu yazar. Böylece eşzamanlı iki ödeme aynı kotayı aşamaz.
- Rezervasyon kaydı `coupon_redemptions` tablosunda tutulur; ödeme başarısız/iptal edilirse `release_coupon()` ile **idempotent** şekilde geri bırakılır (kota da geri açılır).
- Aynı kupon kodu için kaba kuvvet denemesine karşı kimlik doğrulama + rate limit (mevcut `createGenericRateLimiter`).

### 4.7 Diğer indirimlerle ilişki

Adet indirimi ve ön sipariş indirimi kalem fiyatına zaten yansımış durumda; kupon bunların **üzerine** uygulanır. Kupon `discount_amount` olarak sipariş düzeyinde ayrıca izlenir (muhasebe ve raporlama için).

### 4.8 Ödeme (iyzico) uyumu

iyzico `sum(basketItems.price) == paidPrice` kuralı nedeniyle indirim, sepet kalemlerine **oransal olarak dağıtılır**:

- Kupon indirimi kalem alt toplamlarına oranlanır, son kalem kuruş farkı ile düzeltilir.
- Hiçbir kalem 0 veya negatif fiyata düşmez; sıfıra düşen kalem sepete eklenmez.
- Bu mantık saf bir yardımcı fonksiyona taşınır (`src/lib/payment/basket.ts`) ve birim testiyle doğrulanır.

## 5. Veri Modeli — `supabase/migrations/100_coupon_system.sql`

```sql
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage','fixed_amount','free_shipping')),
  discount_value numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  max_discount_amount numeric(10,2) CHECK (max_discount_amount > 0),
  min_order_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  applies_to text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all','service','store')),
  -- Geçerlilik penceresi (NULL = sınır yok)
  starts_at timestamptz,
  ends_at timestamptz,
  -- Kota: ne sayılacak ve kaç tane
  quota_basis text NOT NULL DEFAULT 'distinct_users' CHECK (quota_basis IN ('distinct_users','redemptions')),
  quota_limit integer CHECK (quota_limit > 0),          -- NULL = sınırsız
  -- Kullanıcı başına kullanım
  per_user_mode text NOT NULL DEFAULT 'single' CHECK (per_user_mode IN ('single','unlimited','limited')),
  per_user_limit integer CHECK (per_user_limit > 0),    -- yalnızca per_user_mode='limited'
  first_order_only boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  -- Kod modelleri
  owner_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE, -- NULL = genel kampanya
  batch_id uuid,                                                    -- toplu üretim grubu
  batch_label text,
  -- Kota ile otomatik sonlanma
  exhausted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT coupons_window_valid CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
  CONSTRAINT coupons_per_user_limit_valid CHECK (
    (per_user_mode = 'limited' AND per_user_limit IS NOT NULL) OR
    (per_user_mode <> 'limited')
  )
);

-- Aynı kullanıcıya aynı kampanya kodundan ikinci kez üretilmesin
CREATE UNIQUE INDEX coupons_batch_owner_unique ON public.coupons (batch_id, owner_user_id)
  WHERE batch_id IS NOT NULL AND owner_user_id IS NOT NULL;
CREATE INDEX coupons_owner_user_idx ON public.coupons (owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX coupons_batch_idx ON public.coupons (batch_id) WHERE batch_id IS NOT NULL;

-- Kod büyük/küçük harf duyarsız tekil
CREATE UNIQUE INDEX coupons_code_unique ON public.coupons (upper(code));

CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT,
  campaign_key uuid NOT NULL,          -- batch_id varsa o, yoksa coupon_id (kota bu anahtarda sayılır)
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  discount_amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','consumed','released')),
  created_at timestamptz DEFAULT now(),
  consumed_at timestamptz,
  released_at timestamptz,
  UNIQUE (coupon_id, order_id)
);

CREATE INDEX coupon_redemptions_campaign_idx ON public.coupon_redemptions (campaign_key, status);

-- Admin listesi ve kota göstergesi için türetilmiş sayaçlar (tek doğru kaynak)
CREATE VIEW public.coupon_usage AS
SELECT campaign_key,
       count(*) FILTER (WHERE status <> 'released')                        AS redemption_count,
       count(DISTINCT user_id) FILTER (WHERE status <> 'released')         AS user_count
FROM public.coupon_redemptions
GROUP BY campaign_key;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code text;
-- orders.discount_amount zaten var (001_initial_schema.sql)

-- SECURITY DEFINER, search_path = public
CREATE FUNCTION public.redeem_coupon(p_coupon_id uuid, p_user_id uuid, p_order_id uuid, p_discount numeric)
-- 1) kodu ve kuralları doğrula (owner, tarih, min tutar, ilk sipariş)
-- 2) pg_advisory_xact_lock(campaign_key)  → aynı kampanyada eşzamanlılık
-- 3) kota: distinct_users → count(distinct user_id); redemptions → count(*)
-- 4) per_user_mode: single/unlimited/limited kontrolü
-- 5) rezervasyonu yaz, kota dolduysa is_active=false + exhausted_at=now()

CREATE FUNCTION public.release_coupon(p_order_id uuid)  -- idempotent, kotayı geri açar
```

- **RLS:** `coupons` ve `coupon_redemptions` için `ENABLE ROW LEVEL SECURITY`; anon/authenticated için **hiçbir politika yok** (kupon listesi dışarıdan okunamaz). Admin okuması `is_admin()` politikası ile; yazma yalnızca service role (API katmanı).
- **Yetki:** `SECURITY DEFINER` fonksiyonlarda `search_path = public` sabitlenir.
- Migration ileriye dönük uyumlu: mevcut kod kolon yokken çalışmaya devam eder (mevcut `isMissingColumnError` deseni kullanılır).
- `global_settings` içine opsiyonel `coupons_enabled` anahtarı (varsayılan `true`) — acil kapatma için; UI bu bayrağa göre kupon alanını gizler.

## 6. Dosya Bazlı İş Planı

### Faz 1 — Veri modeli ve saf iş mantığı
| Dosya | İş |
| --- | --- |
| `supabase/migrations/100_coupon_system.sql` | Tablolar, indeksler, RLS, `redeem_coupon` / `release_coupon` |
| `src/lib/pricing/coupon.ts` (yeni) | `calculateCouponDiscount()` + `isCouponEligible()` saf fonksiyonları: tür, kapsam, üst sınır, minimum tutar, tarih penceresi, kota ve kullanıcı limiti kuralları |
| `src/lib/pricing/coupon.test.ts` (yeni) | Sınır durumları: üst sınır, `A`'yı aşan sabit indirim, kapsam bazlı hesap, süre penceresi, `single/unlimited/limited`, kota bazları, yuvarlama |
| `src/lib/services/order-totals.ts` | `discountAmount` ve `freeShipping` girdileri; KDV matrahı düzeltmesi |
| `src/lib/services/order-totals.test.ts` | İndirimli toplam, ücretsiz kargo, eşik davranışı testleri |

### Faz 2 — Sunucu tarafı kupon servisi ve sipariş entegrasyonu
| Dosya | İş |
| --- | --- |
| `src/lib/services/coupon-service.ts` (yeni) | `evaluateCoupon()` (kural motoru: kota bazı, kullanıcı limiti, tarih, kapsam, ilk sipariş), `redeemCoupon()`, `releaseCoupon()`, `getUsageStats()`, admin CRUD + toplu üretim yardımcıları |
| `src/app/api/v1/coupons/validate/route.ts` (yeni) | Auth + rate limit + önizleme |
| `src/app/api/v1/orders/create/route.ts` | Şemaya `couponCode` eklenmesi |
| `src/lib/services/order-creation-service.ts` | Kupon doğrulama, indirim hesabı, `orders` insert'ine `coupon_id/coupon_code/discount_amount`, `redeem_coupon` çağrısı ve hata halinde tam geri alma |
| `src/lib/services/order-cancellation-service.ts` | `cancelOrder()` içinde `release_coupon()` çağrısı |
| `src/lib/payment/payment-service.ts` + `src/lib/payment/basket.ts` (yeni) | Sepet kalemlerine oransal indirim dağıtımı |

### Faz 3 — Müşteri arayüzü (sepet + checkout)
| Dosya | İş |
| --- | --- |
| `src/lib/cart/coupon-store.ts` (yeni) | Uygulanan kodun sepet/checkout arasında paylaşımı (localStorage + `coupon-updated` olayı), sepet değişince geçersizleştirme |
| `src/components/checkout/coupon-input.tsx` (yeni) | Tekrar kullanılabilir kupon girişi bileşeni (uygula/kaldır/hata) |
| `src/app/cart/page.tsx` | Kupon alanı + indirimli ara toplam önizlemesi |
| `src/app/checkout/page.tsx` | Aynı kupon durumunu okur, indirim satırı, `couponCode` gönderimi, sepet değişiminde yeniden doğrulama |

### Faz 4 — Admin yönetimi
| Dosya | İş |
| --- | --- |
| `src/app/admin/coupons/page.tsx` (yeni) | Liste, filtre (aktif/tükendi/süresi geçmiş), durum değiştirme, kullanım sayısı ve kota göstergesi |
| `src/app/admin/coupons/_components/coupon-form-dialog.tsx` (yeni) | Oluşturma/düzenleme formu: tür + değer, kapsam, **kota bazı (kişi/kullanım) + kota**, **kullanıcı başına kullanım (tek/sınırsız/N)**, **geçerlilik (süresiz / tarih aralığı / N gün)**, ilk sipariş koşulu, genel/kişiye özel seçimi |
| `src/app/admin/coupons/_components/bulk-generate-dialog.tsx` (yeni) | "N adet kişiye özel kod üret": adet, yukarıdaki kural seti, kullanıcı ataması (isteğe bağlı), üretilen kodları kopyala/CSV indir |
| `src/app/admin/coupons/_components/coupons-table.tsx` (yeni) | Tablo + işlem menüsü; "Tükendi"/"Süresi geçti" durumu, `x/y kişi` veya `x/y kullanım` göstergesi |
| `src/app/api/admin/coupons/route.ts`, `[id]/route.ts`, `bulk/route.ts` (yeni) | `is_admin` kontrollü CRUD + toplu üretim (banka hesabı API deseniyle aynı) |
| `src/components/layout/admin-shell.tsx` | Menüye "Kuponlar" (`Ticket` ikonu, Mağaza grubu) + `NAV_PERMISSION_KEYS['/admin/coupons'] = 'coupons'` |
| `src/lib/services/admin-service-server.ts` | `ADMIN_SECTIONS`'a `{ key: 'coupons', label: 'Kuponlar' }` |
| `src/components/admin/user-actions-section.tsx`, `user-detail-content.tsx` | Yetki etiket listesine "Kuponlar" |
| `src/types/database.ts` | `coupons`, `coupon_redemptions` tipleri ve `orders` yeni kolonları |

### Faz 5 — Görünürlük ve tutarlılık
| Dosya | İş |
| --- | --- |
| `src/emails/order-confirmation.tsx` | İndirim satırı (`discount_amount > 0` ise) |
| `src/app/admin/orders/[orderId]/page.tsx` | Sipariş detayında kupon kodu + indirim |
| `src/app/dashboard/orders/[orderId]/page.tsx` | Müşteri sipariş detayında indirim satırı |
| `src/lib/services/mail-service.ts` | Şablona indirim parametresi geçişi |

### Faz 6 — Test ve kabul
- Birim testleri: `npm run test`
- Tip kontrolü: `npm run type-check`
- Lint: `npm run lint`
- Manuel senaryolar (aşağıda)

## 7. API Sözleşmeleri

### `POST /api/v1/coupons/validate`
```jsonc
// istek
{ "code": "HOSGELDIN10", "itemsSubtotal": 1250.00, "serviceSubtotal": 1000.00, "storeSubtotal": 250.00 }
// yanıt
{
  "valid": true,
  "code": "HOSGELDIN10",
  "discountType": "percentage",
  "discountAmount": 125.00,
  "freeShipping": false,
  "description": "İlk siparişe %10 indirim"
}
```
Hatalar: `400` geçersiz kod formatı, `404` kupon yok, `409` kota doldu, `422` koşullar sağlanmıyor (min tutar, tarih penceresi, ilk sipariş, kullanıcı limiti), `429` rate limit.

### Admin
- `GET /api/admin/coupons?status=&search=` → liste + kullanım/kota durumu
- `POST /api/admin/coupons` → genel veya kişiye özel tek kod
- `POST /api/admin/coupons/bulk` → `{ count, template, assignToUserIds? }` ile toplu kod üretimi
- `PATCH /api/admin/coupons/[id]` → güncelle / aktiflik
- `DELETE /api/admin/coupons/[id]` → kullanımı yoksa sil, varsa pasife al

## 8. UI Akışı

### 8.1 Checkout

```
Sipariş Toplamı
  3D Baskı            1.000,00 TL
  Mağaza                250,00 TL
  Kargo                  49,90 TL
  ─────────────────────────────
  Ara Toplam          1.250,00 TL
  Kupon (HOSGELDIN10)  −125,00 TL   [Kaldır]
  KDV (%20)             224,98 TL
  ─────────────────────────────
  Toplam              1.399,88 TL
```

- Alan boşken: "Kupon kodunuz var mı?" + `Uygula` düğmesi.
- Geçerli kupon: yeşil onay + indirim satırı + `Kaldır`.
- Hata: alan altında kırmızı, tek satır açıklama.
- Kupon uygulanmışken sepet değişirse: "Sepetiniz değişti, kupon yeniden doğrulandı" bilgisi.

### 8.2 Sepet

Sepet özetinde aynı kupon alanı; uygulanan kod `coupon-store` üzerinden checkout'a taşınır. Sepette tutar değiştiğinde (adet artır/azalt, kalem sil) kupon sessizce yeniden doğrulanır; artık geçersizse sarı uyarı ile kaldırılır ve kullanıcı checkout'ta sürprizle karşılaşmaz.

### 8.3 Admin listesi

| Kod | Tür | Değer | Kapsam | Kota | Kullanıcı Kuralı | Geçerlilik | Durum |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HOSGELDIN10 | Yüzde | %10 | Tümü | 42 / 100 kişi | Tek kullanım | 01.12.2026 – 31.12.2026 | Aktif |
| SADIK-MUSTERI | Sabit | 50 TL | 3D | Sınırsız | Her siparişte | Süresiz | Aktif |
| KISIYE-OZEL-7F3A | Sabit | 50 TL | 3D | 1 / 1 kişi | Tek kullanım | Oluşturma + 30 gün | Tükendi |
| KARGO-BEDAVA | Ücretsiz kargo | — | Tümü | 8 / 1000 kullanım | Her siparişte | 01.11.2026 – 15.11.2026 | Süresi geçti |

## 9. Riskler ve Önlemler

| Risk | Önlem |
| --- | --- |
| iyzico sepet toplamı uyuşmazlığı | Oransal dağıtım + saf fonksiyon testi; kalem sıfıra düşerse çıkarılır |
| Eşzamanlı kullanımda kota aşımı | `redeem_coupon` içinde `pg_advisory_xact_lock(campaign_key)` + anlık sayım |
| Sayaç ile gerçek kullanımın ayrışması | Ayrı sayaç kolonu yok; kota `coupon_redemptions` üzerinden türetilir (tek doğru kaynak) |
| "Tek kullanım" kuponun ikinci siparişte denenmesi | `per_user_mode='single'` → kullanıcının rezerve/tüketilmiş kaydı varsa 422 |
| Tarih penceresi dışında kullanım | `starts_at`/`ends_at` hem doğrulamada hem `redeem_coupon` içinde kontrol edilir; okuma anında "Süresi geçti" |
| Kota dolunca tekrar kullanım beklentisi | Ürün kararı: kota dolduğunda kampanya tamamen kapanır; panelde "Tükendi" olarak işaretlenir ve UI'da açıklanır |
| İstemci/sunucu toplam farkı | Tek paylaşılan saf fonksiyon + mevcut `expectedTotal` sapma kontrolü |
| Kupon kodu tahmini / kaba kuvvet | Auth zorunlu, rate limit, min 6 karakter kod, RLS ile liste kapalı |
| Kişiye özel kodun başkasınca denenmesi | `owner_user_id` kontrolü; hata mesajı kodu doğrulamıyor ("Kupon bulunamadı") |
| Toplu üretimde kod çakışması | Kriptografik rastgele üretim + `upper(code)` tekil indeks, çakışmada yeniden deneme |
| Kota dolduktan sonra kalan kodların kullanılması | `redeem_coupon` her çağrıda kotayı yeniden kontrol eder; dolunca `is_active=false` |
| Ödeme başarısızken kupon yanması | `release_coupon()` iptal akışına bağlanır, idempotent |
| KDV/ciro raporu tutarsızlığı | `discount_amount` sipariş düzeyinde saklanır, KDV indirim sonrası matrahtan hesaplanır |
| Migration'ın production'da gecikmesi | Kod kolon yokken çalışacak şekilde savunmacı yazılır; özellik `coupons_enabled` ile kapatılabilir |

## 10. Kabul Kriterleri

1. Admin, yüzde / sabit / ücretsiz kargo kuponu oluşturabiliyor, düzenleyebiliyor, pasife alabiliyor.
2. Geçerli kod hem **sepet** hem **checkout** sayfasında uygulanıyor; indirim ve yeni toplam anında görünüyor, sayfalar arasında korunuyor.
3. Süresi geçmiş, pasif, minimum tutarı karşılamayan, kotası dolmuş kodlar açıklayıcı hata veriyor.
4. Sunucu, istemcinin gönderdiği tutarlara güvenmiyor: kupon ve toplam yeniden hesaplanıyor.
5. `quota_basis = 'distinct_users'` seçilen kuponda aynı kullanıcının 3 siparişi **1 kişi** sayılıyor; `redemptions` seçilende **3 kullanım** sayılıyor.
6. `per_user_mode` üç değeri de panelden seçilebiliyor: tek kullanım, her siparişte, N kez. Tek kullanımda ikinci deneme 422 alıyor.
7. `quota_limit = 1` olan kupon eşzamanlı iki ödemede yalnızca bir kez kullanılıyor.
8. Kota dolduğunda kupon otomatik "Tükendi" durumuna geçiyor; kalan kodlar kullanılamıyor.
9. Süresiz / tarih aralıklı / "oluşturma + N gün" geçerlilik modelleri çalışıyor; pencere dışında kod reddediliyor.
10. Kişiye özel kod yalnızca tanımlı kullanıcıda çalışıyor; başka kullanıcıya "Kupon bulunamadı" dönüyor.
11. Toplu üretimde N adet tekil kod üretiliyor, istenirse kullanıcılara atanıyor ve CSV olarak indirilebiliyor.
12. Ödeme başarısız olursa stok **ve** kupon rezervasyonu iade ediliyor; aynı kupon tekrar kullanılabiliyor.
13. iyzico sandbox'ta indirimli sipariş başarıyla tamamlanıyor (sepet toplamı = çekilen tutar).
14. Sipariş onay e-postası ve sipariş detaylarında indirim satırı görünüyor.
15. `npm run test`, `npm run type-check`, `npm run lint` temiz.
16. Kupon kodu listesi yetkisiz kullanıcıya hiçbir uçtan sızdırılmıyor.

## 11. Efor Tahmini

| Faz | Süre |
| --- | --- |
| Veri modeli + kural motoru + testler | 1 gün |
| Sipariş oluşturma + iptal + ödeme entegrasyonu | 1 gün |
| Sepet + checkout arayüzü | 1 gün |
| Admin CRUD + kural formu + toplu üretim + yetki | 1,5 gün |
| E-posta/sipariş detayı + manuel QA | 0,5–1 gün |
| **Toplam** | **~5–5,5 iş günü** |

## 12. Onaylanan Kararlar

1. **Kupon tipleri:** yüzde + sabit tutar + ücretsiz kargo (üçü birlikte).
2. **Kod dağıtımı:** genel kampanya kodları **ve** kişiye özel kodlar; toplu üretim desteklenir.
3. **Kota:** kişi bazlı sayım varsayılan; admin isterse kullanım bazlıya çevirebilir. Kota dolunca kampanya otomatik sonlanır.
4. **Kullanıcı başına kullanım:** admin seçer — tek kullanım / her siparişte / N kez.
5. **Geçerlilik:** süresiz / tarih aralığı / oluşturma + N gün; genel ve kişiye özel kodların hepsinde.
6. **Uygulama yeri:** sepet + checkout (paylaşılan kupon durumu).
7. **İndirim sırası:** kupon, adet ve ön sipariş indirimlerinin üzerine uygulanır.

Onay sonrası uygulama Faz 1'den başlar; her faz sonunda kısa durum raporu paylaşılır.
