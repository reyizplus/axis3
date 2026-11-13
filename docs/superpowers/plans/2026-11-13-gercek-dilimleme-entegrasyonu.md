# Gerçek Dilimleme (PrusaSlicer) Entegrasyonu — Uygulama Planı

**Tarih:** 2026-11-13
**Durum:** Onaylandı — uygulama başlıyor
**Öncelik:** P0 — fiyat hatası müşteri kaybettiriyor

**Onaylanan kararlar (2026-11-13):**
- **K1 = Sipariş engellenir.** Dilimleme başarısızsa sipariş oluşturulmaz (`PRICING_REQUIRE_SLICING=true`).
- **K2 = Misafir dilimleyemez.** Oturum zorunlu.
- **K3 = SLA hacim tahmininde kalır**, arayüzde "tahmini" etiketlenir.
- **Uygulama yöntemi:** Paralel alt ajanlar, dosya sahipliği ayrık; commit'ler dalga sonlarında tek elden.

---

## 1. Hedef

Fiyatlandırma, hacim tahmini yerine **gerçek dilimlenmiş G-Code**'dan gelen gram ve süre
verisini kullansın. Müşterinin gördüğü fiyat ile sunucunun sipariş anında hesapladığı fiyat
**birebir aynı** olsun; hiçbir adımda sessiz fiyat sapması olmasın.

**Başarı tanımı**

1. 20 mm PLA küp, 0.2 mm katman, %20 doluluk → fiyat `4.49 g` ve `19m 11s` üzerinden hesaplanır
   (hacim tahmini `4.86 g` / `14m 29s` veriyordu).
2. Kalite/doluluk/nozul değiştiğinde eski analiz **kullanılmaz** (profil hash'i ile ayrılır).
3. Dilimleyici kapalıyken sistem çökmez; önizleme "tahmini" olarak etiketlenir ve sipariş
   politikası net biçimde uygulanır.
4. SLA tarafı bilinçli olarak hacim tahmininde kalır ve bu kullanıcıya söylenir.

---

## 2. Doğrulanmış teknik temel (spike yapıldı)

Bugün gerçekten çalıştırıldı, sonuçlar aşağıda. Plan bu kanıtların üzerine kurulu.

| Deney | Sonuç |
|---|---|
| `debian:bookworm-slim` + `apt-get install prusa-slicer` | ✅ `2.5.0+dfsg-4`, headless çalışıyor |
| 20 mm küp STL, `--layer-height 0.2 --fill-density 20%` | ✅ `4.49 g`, `19m 11s`, G-Code 179 KB |
| Çıktı başlıkları | `; filament used [g] = 4.49`, `; estimated printing time (normal mode) = 19m 11s` |
| Katman sayısı | `;LAYER_CHANGE` sayısı **+ 1** (99 + 1 = 100) |
| `debian:bookworm-slim` + `apt-get install cura-engine` | ⚠️ `4.13.0` kuruluyor ama `.def.json` olmadan çalışmıyor: `[ERROR] Trying to retrieve setting with no value given: 'mesh_rotation_matrix'` |
| Mevcut app imajı | `node:26-alpine` (musl) → native dilimleyici doğrudan kurulamaz |

**Karar: ayrı `slicer` servisi (Debian sidecar) + PrusaSlicer 2.5.0.**

Gerekçe:
- CuraEngine, Debian'da tanım dosyası istiyor → ekstra bakım yükü. PrusaSlicer sıfır konfigürasyonla çalıştı.
- Alpine app imajı bozulmuyor; dilimleyici CPU-yoğun işi izole ediliyor (`cpus`/`mem_limit`).
- Dilimleyici çökerse site ayakta kalır.
- `cura-wasm` **reddedildi**: 2021'den beri bakımsız (deprecated) ve in-process AGPL bağlantısı
  yaratıyor. Ayrı servis, lisans açısından da temiz (ayrı program, HTTP üzerinden).

---

## 3. Mimari

```
Tarayıcı (upload/[fileId])
   │  POST /api/pricing/slice  { fileId, materialId, printSettingId | custom{...} }
   ▼
Next.js (alpine, node:26)  ← fiyat otoritesi
   │  1. Seçimleri DB'den çöz (print_settings, materials, nozzle_sizes)
   │  2. buildSlicerProfile() → profileHash = sha256(profil)
   │  3. gcode_analysis_results(file_id, profile_hash) → HIT ise dön
   │  4. MISS → STL'i `stl-files` bucket'ından indir (service role)
   │  5. POST http://slicer:8000/slice  (multipart: model + profile json)
   ▼
slicer (node:26-bookworm-slim + prusa-slicer 2.5.0)   [yalnız iç ağ, host portu YOK]
   │  6. prusa-slicer --export-gcode ... -o /tmp/x.gcode
   │  7. G-Code başlığını parse et → grams / printSeconds / layerCount
   ▼
{ ok: true, grams: 4.49, printSeconds: 1151, ... }
   │  8. upsert gcode_analysis_results (file_id, profile_hash)
   ▼
engine.calculatePrice({ ..., slicerProfileHash }) → gerçek fiyat
```

**Kritik kural:** `gcode_analysis_results` artık **yalnızca (file_id, profile_hash) çiftiyle**
okunur. Profil hash'i olmadan yapılan G-Code okuması tamamen kaldırılır — mevcut kod "dosyanın
en son analizi"ni okuduğu için kalite değişince eski veriyle fiyat veriyordu (sessiz sapma).

---

## 4. Kapsam dışı (YAGNI)

- SLA için gerçek dilimleme (PrusaSlicer SLA profilleri CLI'da kırılgan) → hacim tahmini kalır.
- Destek malzemesinin ayrı gram olarak G-Code'dan çıkarılması → toplam gram zaten desteği içeriyor;
  `support_grams` kırılımda 0 görünür (fiyatı etkilemez, `core.ts` satır 12-13).
- Kuyruk altyapısı (BullMQ/Redis job) → ilk sürümde senkron + önbellek yeterli.
- Çoklu dilimleyici motoru soyutlaması.

---

## 5. Kararlar

| # | Karar | Sonuç |
|---|---|---|
| K1 | Dilimleme başarısızsa sipariş verilebilsin mi? | **Hayır** — `PRICING_REQUIRE_SLICING=true`. Tahmini fiyatla sipariş alınmaz; 503 + "fiyat doğrulanamadı" mesajı. |
| K2 | Misafir kullanıcı dilimleyebilsin mi? | **Hayır** — oturum zorunlu (`/api/pricing/slice` 401). |
| K3 | SLA fiyatı | **Hacim tahmininde kalır**, arayüzde "reçine — tahmini" etiketi. |

Ek operasyonel zorunluluk (K1'in sonucu): `slicer` servisi düşerse sipariş akışı durur. Bu yüzden
Görev 11'de sağlık izleme ve Görev 12'de alarm eşiği tanımlanır; servis `restart: unless-stopped`
ve healthcheck ile korunur.

---

## 6. Görevler

Her görev bağımsız commit'lenebilir. TDD: test önce, sonra kod.

### Görev 1 — `slicer` sidecar servisi

**Dosyalar**
- `slicer/Dockerfile`
- `slicer/package.json` (tek bağımlılık: `busboy`)
- `slicer/server.mjs`
- `slicer/gcode-summary.mjs` (saf parser)
- `slicer/gcode-summary.test.mjs` (node:test)

**Dockerfile**
```dockerfile
FROM node:26-bookworm-slim
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      prusa-slicer ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /slicer
COPY package.json ./
RUN npm ci --omit=dev
COPY server.mjs gcode-summary.mjs ./
ENV PORT=8000 SLICER_MAX_CONCURRENCY=2 SLICER_TIMEOUT_MS=180000
USER node
EXPOSE 8000
CMD ["node", "server.mjs"]
```

**`gcode-summary.mjs` — saf fonksiyon (test edilebilir)**
```js
export function parseGcodeSummary(text) // → { grams, printSeconds, layerCount, filamentMm }
```
- `grams`: `/^; filament used \[g\] = ([\d.]+)$/m` (4.49)
- `filamentMm`: `/^; filament used \[mm\] = ([\d.]+)$/m`
- `printSeconds`: `/^; estimated printing time \(normal mode\) = (.+)$/m` → `parseDuration("19m 11s")`
- `layerCount`: `count(/^;LAYER_CHANGE$/gm) + 1`
- `parseDuration`: `2d 3h 4m 5s` / `1h 2m` / `45s` biçimlerini destekler
- Hiçbir alan bulunamazsa `null` döner (sessiz 0 üretmez)

**`server.mjs`**
- `GET /health` → `{ ok, engine: 'prusaslicer-2.5.0', queueDepth }`
- `POST /slice` (multipart: `model` = STL buffer, `profile` = JSON string)
- `x-slicer-token` başlığı `SLICER_TOKEN` ile eşleşmezse `401`
- Eşzamanlılık semaforu `SLICER_MAX_CONCURRENCY`; kuyruk > 20 → `503` + `Retry-After: 2`
- Çocuk süreç `SLICER_TIMEOUT_MS` aşarsa `SIGKILL` → `504`
- PrusaSlicer çıkış kodu ≠ 0 → `422` + `stderr` ilk 500 karakter
- Geçici dosyalar `finally` içinde silinir (STL + G-Code)
- Geçerli profil → argümanlar `buildArgs(profile)`:

```
--export-gcode
--layer-height <layerHeight>
--fill-density <infill>%
--fill-pattern grid|gyroid
--perimeter-speed / --infill-speed / --solid-infill-speed <printSpeed>
--external-perimeter-speed <printSpeed*0.5>
--nozzle-diameter <nozzleMm>
--filament-diameter 1.75
--filament-density <materialDensity>
--temperature <nozzleTemp>
--bed-temperature <bedTemp>
--bed-shape 0x0,220x0,220x220,0x220
--skirts 0
--gcode-flavor marlin2
[--support-material --support-material-angle 50]  (supportEnabled ise)
--output /tmp/<uuid>.gcode <model>
```

**Testler**
- `parseGcodeSummary` için 6 birim test (gerçek PrusaSlicer başlığı dahil; bozuk/eksik başlık → `null`).
- `SLICER_INTEGRATION=1` iken: küp STL gönder, `grams` 4.49 ± %5, `printSeconds` 1000–1300, `layerCount=100`.

**Commit:** `feat(slicer): PrusaSlicer sidecar servisi ve G-Code özet parser'ı`

---

### Görev 2 — Compose ve ortam değişkenleri

**Dosyalar:** `docker-compose.yml`, `.env.example`

```yaml
  slicer:
    build: ./slicer
    container_name: axis3-slicer
    restart: unless-stopped
    expose: ["8000"]          # host'a açılmaz
    environment:
      SLICER_TOKEN: ${SLICER_TOKEN:-dev-token}
    cpus: "2.0"
    mem_limit: 2g
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:8000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 15s
      timeout: 5s
      retries: 5
```

App servisine: `SLICER_URL=http://slicer:8000`, `SLICER_TOKEN`, `PRICING_REQUIRE_SLICING=false`
(başlangıçta `false`, Görev 10'da `true`).

**Doğrulama:** `docker compose up -d slicer` → `curl http://localhost:8000/health` **beklenmez**
(port açık değil); `docker exec axis3-app node -e "fetch('http://slicer:8000/health').then(r=>r.text()).then(console.log)"`.

**Commit:** `chore(slicer): compose servisi, CPU/bellek limitleri ve env değişkenleri`

---

### Görev 3 — Profil eşlemesi ve hash (saf, TDD)

**Dosya:** `src/lib/pricing/server/slicer-profile.ts` + `.test.ts`

```ts
export interface SliceProfileInput {
  technology: 'FDM' | 'SLA';
  layerHeight: number;       // mm
  infillPercentage: number;  // 0..100
  printSpeed: number;        // mm/s
  nozzleMm: number;
  materialType: string;      // PLA | ABS | PETG | TPU | ASA
  materialDensity: number;   // g/cm3
  supportEnabled: boolean;
}

export interface SliceProfileV1 {
  v: 1;
  engine: 'prusaslicer-2.5.0';
  layerHeight: number;
  infillPercentage: number;
  printSpeed: number;
  nozzleMm: number;
  filamentDiameter: 1.75;
  materialType: string;
  materialDensity: number;
  nozzleTemp: number;
  bedTemp: number;
  supportEnabled: boolean;
}

export const SLICE_PROFILE_VERSION = 1;

export function buildSlicerProfile(input: SliceProfileInput): SliceProfileV1 | null; // SLA → null
export function profileHash(profile: SliceProfileV1): string;                      // sha256 hex, 32 char
export function stableStringify(v: unknown): string;                               // anahtar sıralı
```

Sıcaklık tablosu (tek kaynak, testle sabitlenir):

| Malzeme | Nozzle | Bed |
|---|---|---|
| PLA | 210 | 60 |
| ABS | 240 | 100 |
| PETG | 240 | 80 |
| TPU | 225 | 50 |
| ASA | 250 | 100 |

Bilinmeyen malzeme → PLA varsayılanı + `warnings` (sessizce 0 sıcaklık yok).

**Testler (önce yazılır)**
1. Aynı girdi → aynı hash (10 kez).
2. `layerHeight` 0.2 → 0.1 hash'i değiştirir.
3. `infillPercentage`, `nozzleMm`, `materialType`, `materialDensity`, `supportEnabled` her biri hash'i değiştirir.
4. Anahtar sırası farklı ama değerler aynı nesne → **aynı** hash (`stableStringify`).
5. `technology: 'SLA'` → `buildSlicerProfile` `null` döner.
6. Hash 32 karakter hex (DB unique index uyumu).

**Commit:** `feat(pricing): dilimleme profili eşlemesi ve kararlı profil hash'i`

---

### Görev 4 — Uygulama tarafı dilimleyici istemcisi

**Dosya:** `src/lib/pricing/server/slicer-client.ts` + `.test.ts` (fetch mock)

```ts
export interface SliceStats {
  grams: number;
  printSeconds: number;
  layerCount: number;
  filamentMm: number;
  durationMs: number;
  engine: string;
}

export class SlicerUnavailableError extends Error {}
export class SlicerTimeoutError extends Error {}
export class SlicerRejectedError extends Error {}

export async function sliceModel(
  stl: Buffer,
  filename: string,
  profile: SliceProfileV1,
  opts?: { timeoutMs?: number }
): Promise<SliceStats>;

export async function slicerHealth(): Promise<{ ok: boolean; queueDepth: number }>;
```

- `FormData` + `Blob` ile multipart (Node 26'da yerleşik).
- `AbortSignal.timeout(200_000)`.
- `503`/`ECONNREFUSED` → 300 ms sonra **bir kez** retry.
- Yanıt şeması `zod` benzeri elle doğrulanır; `grams <= 0` → `SlicerRejectedError`.

**Testler:** 200 mutlu yol, 401 token hatası, 503 retry, timeout (abort), bozuk JSON.

**Commit:** `feat(pricing): sidecar dilimleyici HTTP istemcisi`

---

### Görev 5 — Migration 095 + analiz önbelleği

**Dosya:** `supabase/migrations/095_gcode_profile_cache.sql`

```sql
ALTER TABLE public.gcode_analysis_results
  ADD COLUMN IF NOT EXISTS profile_hash TEXT,
  ADD COLUMN IF NOT EXISTS profile_json JSONB,
  ADD COLUMN IF NOT EXISTS engine TEXT,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

-- Aynı dosya + aynı profil için tek satır. NULL'lar birbirinden farklı sayılır,
-- eski (hash'siz) satırlar etkilenmez.
CREATE UNIQUE INDEX IF NOT EXISTS idx_gcode_file_profile_unique
  ON public.gcode_analysis_results (file_id, profile_hash);

ALTER TABLE public.slicing_jobs
  ADD COLUMN IF NOT EXISTS profile_hash TEXT,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

NOTIFY pgrst, 'reload schema';
```

**Dosya:** `src/lib/pricing/server/analysis-cache.ts`

```ts
export interface CachedAnalysis {
  grams: number; printSeconds: number; layerCount: number; profileHash: string;
}
export async function getCachedAnalysis(
  client: SupabaseClient, fileId: string, hash: string
): Promise<CachedAnalysis | null>;   // SIMULATED satırları reddeder

export async function saveAnalysis(
  client: SupabaseClient, row: { fileId: string; profileHash: string; profileJson: unknown;
  stats: SliceStats }
): Promise<void>;                    // upsert onConflict: 'file_id,profile_hash'
```

**Testler:** eşleşmeyen hash → `null`; `raw_header` içinde `SIMULATED` → `null`; `grams=0` → `null`;
upsert çağrısında `onConflict` doğru.

**Commit:** `feat(pricing): profil hash'li G-Code önbelleği (migration 095)`

---

### Görev 6 — `/api/pricing/slice` rotasının yeniden yazımı

**Dosya:** `src/app/api/pricing/slice/route.ts`

**Girdi (istemciden yalnızca ID ve özel değerler; sayısal ayarlar DB'den çözülür)**
```ts
{
  fileId: string;
  materialId: string;
  nozzleSizeId?: string;
  printSettingId?: string | 'custom';
  custom?: { layerHeight?: number; infillPercentage?: number; printSpeed?: number; supportEnabled?: boolean };
}
```

**Akış**
1. Oturum zorunlu (K2) → 401.
2. `files` satırı sahibi kontrolü → 403.
3. Malzeme + `print_settings` + nozul DB'den okunur; özel değerler `assertRange` ile doğrulanır
   (`order-creation-service.ts` içindeki sınırların **aynısı** — kopyalamak yerine export edilecek).
4. `buildSlicerProfile` → SLA ise `{ source: 'volume', reason: 'sla' }` döner (200).
5. `profileHash` → `getCachedAnalysis` HIT → `{ source: 'slicing', cached: true, stats }`.
6. MISS → STL indir (`stl-files`, service role) → `sliceModel` → `saveAnalysis` →
   `{ source: 'slicing', cached: false, stats, durationMs }`.
7. Hatalar: `SlicerUnavailableError` → `503 { code: 'slicer_unavailable' }`,
   timeout → `504`, red → `422`. **Hiçbir durumda uydurma sayı dönmez.**

**Ek:** Aynı `(fileId, hash)` için eşzamanlı istekleri tekilleştiren in-process `Map<key, Promise>`
(ikinci istek ilkini bekler). Unique index son savunma hattı.

**Testler:** 401, 403, SLA kısa yolu, cache hit (dilimleyici çağrılmamalı), cache miss akışı,
503/504 eşlemesi, aynı anda 2 istek → tek dilimleme.

**Commit:** `feat(api): dilimleme rotası profil hash'li gerçek dilimleme yapar`

---

### Görev 7 — Fiyat motoru yalnızca hash'li analizi kullanır

**Dosyalar:** `src/lib/pricing/types.ts`, `src/lib/pricing/engine.ts`

```ts
// PricingInput
slicerProfileHash?: string;
```

`getGCodeAnalysis(fileId, hash)`:
```ts
if (!hash) return null;                        // hash yoksa hacim tahmini
.eq('profile_hash', hash)
.limit(1).maybeSingle()
```
- "Dosyanın en son analizi" sorgusu **tamamen kaldırılır**.
- `estimationSource` yalnızca gerçekten kullanıldığında `'gcode'` olur.
- `pricingResult.warnings`'a `'gcode_missing_for_profile'` eklenir (gözlemlenebilirlik).

**Testler:** hash verilmezse önbellek sorgusu **hiç yapılmaz**; eşleşen hash → gram/süre kullanılır;
eşleşmeyen hash → `estimationSource: 'volume'`.

**Commit:** `fix(pricing): G-Code analizi profil hash'i ile eşleşmeli`

---

### Görev 8 — Sipariş anında sunucu paritesi (asıl düzeltme)

**Dosya:** `src/lib/services/order-creation-service.ts`

`calculatePrice` çağrısından **önce**:
```ts
const profile = buildSlicerProfile({
  technology,
  layerHeight: customs.layerHeight ?? printSettings.layerHeight,
  infillPercentage: printSettings.infillPercentage,
  printSpeed: printSettings.printSpeed,
  nozzleMm: item.nozzleSizeMm ?? 0.4,
  materialType: material.name,
  materialDensity: material.density,
  supportEnabled: printSettings.supportEnabled ?? true,
});
const slicerProfileHash = profile ? profileHash(profile) : undefined;
```

`resolvePrintSettings` genişletilir: `layerHeight`, `printSpeed`, `supportEnabled` de döner
(şu an yalnızca `timeMultiplier` + `infillPercentage` dönüyor — dilimleme için yetersiz).

**Kritik:** Özel modda istemci `timeMultiplier = 1 / customSpeed` gönderiyor, sunucu da aynı
dönüşümü yapmalı; aksi halde hash ve fiyat ayrışır. Bu bir **parite testiyle** sabitlenir.

`PRICING_REQUIRE_SLICING=true` ise ve önbellek boşsa:
- Sunucu STL'i indirip **senkron dilimler** (200 s timeout), sonra fiyatlar.
- Dilimleme başarısız → `OrderCreationError('Fiyat doğrulanamadı, lütfen tekrar deneyin', 503)`.
  Sipariş **oluşturulmaz**.

**Testler (yeni `order-parity.test.ts`)**
1. Aynı seçimlerle istemci girdisi ve sunucu çözümü → **aynı `profileHash`**.
2. Kalite değişince hash değişir, eski analiz kullanılmaz.
3. `PRICING_REQUIRE_SLICING=true` + dilimleyici kapalı → sipariş reddedilir (503).
4. `false` + dilimleyici kapalı → hacim tahmini ile sipariş oluşur, `warnings` dolu.

**Commit:** `feat(orders): sipariş fiyatı gerçek dilimleme profiliyle doğrulanır`

---

### Görev 9 — Arayüz: tahmini → kesin geçişi

**Dosya:** `src/app/upload/[fileId]/page.tsx`

- Seçimler değiştiğinde 400 ms debounce → `POST /api/pricing/slice`.
- Fiyat kartında kaynak etiketi:
  - `source: 'slicing'` → **"Gerçek dilimleme"** (yeşil, `Calculator` ikonu)
  - `source: 'volume'` → **"Tahmini"** (amber, `TriangleAlert` + tooltip: "Dilimleme hazırlanıyor")
- Dilimleme sonucu gelince fiyat **yeniden** hesaplanır (aynı `profileHash` ile, `engine` üzerinden)
  ve gösterilir. Eski kesin fiyat, yeni seçim yapıldığı anda **gizlenir** (bayat fiyat gösterilmez).
- `PRICING_REQUIRE_SLICING=true` ve kaynak `volume` ise "Siparişi Onayla" **devre dışı** +
  "Fiyat doğrulanıyor…" mesajı.

**Manuel kabul:** kaliteyi 3 kez değiştir; her seferinde önce "Tahmini", sonra "Gerçek dilimleme"
görünmeli; gram değeri seçime göre değişmeli.

**Commit:** `feat(ui): fiyat kaynağı etiketi ve tahmini→kesin geçişi`

---

### Görev 10 — Ölü kodu kaldır, politikayı aç

**Dosyalar:** `src/lib/pricing/server/slicer.ts`, `.env.example`

- `simulateSlice()` ve `ALLOW_SIMULATED_SLICING` **silinir** (uydurma G-Code üretiyordu).
- `CuraSlicer` sınıfı yalnızca `slicing_jobs` kaydı tutan ince katmana dönüşür; yürütme
  `sliceModel()` üzerinden gider. `curaSlicer` export'u korunur (kırılma olmasın).
- `SLICING_ENABLED` (kill switch) ve `PRICING_REQUIRE_SLICING` `.env.example`'a eklenir.

**Commit:** `refactor(slicer): simülasyon yolunu kaldır, sidecar'a devret`

---

### Görev 11 — Gözlemlenebilirlik ve doğrulama betiği

**Dosya:** `scripts/slicing-check.mjs` + `package.json` → `npm run check:slicing`

Kontroller:
1. `SLICER_URL/health` → 200.
2. Kanonik 20 mm küp gönderilir → `grams` 4.49 ± %5, `printSeconds` 1000–1300, `layerCount` 100.
3. Ölçülen süre yazdırılır (p95 hedefi < 20 s).
4. `/api/pricing/slice` uçtan uca (oturum çerezi varsa) → `source: 'slicing'`.

Ayrıca `slicing_jobs` satırlarına `profile_hash` + `duration_ms` yazılır; log satırı:
`[slicing] file=… profile=… source=cache|live durationMs=…`.

**Commit:** `chore(slicer): check:slicing canlı doğrulama betiği`

---

### Görev 12 — Devreye alma sırası

1. Migration 095 uygula → `npm run check:stock` (regresyon yok) + `notice` doğrula.
2. `docker compose up -d --build slicer` → `npm run check:slicing` PASS.
3. `SLICING_ENABLED=true` + **`PRICING_REQUIRE_SLICING=true`** (K1 kararı) → canlı.
   `slicer` servisi düşerse siparişler 503 alır; bu bilinçli tercih, izleme zorunlu.
4. 1 gün gözlem: `gcode_analysis_results` satır sayısı artıyor mu, 503 oranı %1'in altında mı,
   ortalama dilimleme süresi kaç ms?
5. 24 saat sonra: hacim tahminiyle gerçek dilimleme farkının dağılımı raporlanır
   (ortalama sapma ve p95). Fiyatlandırma kalibrasyonu bu veriyle yapılır.

---

## 7. Test matrisi

| Katman | Test | Dosya |
|---|---|---|
| Parser | G-Code başlık ayrıştırma, bozuk girdi | `slicer/gcode-summary.test.mjs` |
| Profil | Hash kararlılığı, alan duyarlılığı, SLA reddi | `src/lib/pricing/server/slicer-profile.test.ts` |
| İstemci | 200/401/503-retry/timeout/bozuk JSON | `src/lib/pricing/server/slicer-client.test.ts` |
| Önbellek | Hash eşleşmesi, SIMULATED reddi, upsert | `src/lib/pricing/server/analysis-cache.test.ts` |
| API | 401/403/SLA/hit/miss/503/504/tekilleştirme | `src/app/api/pricing/slice/route.test.ts` |
| Motor | Hash'siz sorgu yok, eşleşme, sapma etiketi | `src/lib/pricing/engine.test.ts` |
| Parite | İstemci ↔ sunucu aynı hash, zorunlu dilimleme politikası | `src/lib/services/order-parity.test.ts` |
| Entegrasyon | Gerçek küp dilimleme (docker) | `npm run check:slicing` |

Mevcut 34 test + bu ~28 test. Hedef: `docker exec axis3-app npx vitest run` tamamı yeşil.

---

## 8. Kabul kriterleri

1. ✅ 20 mm küp için `4.49 g ± %5` ve `100` katman; fiyat bu değerlerden hesaplanıyor.
2. ✅ `gcode_analysis_results` satırı `profile_hash` içeriyor; aynı dosya için farklı kalite =
   farklı satır.
3. ✅ Kalite değiştirilip eski analizle fiyat verilmesi **imkânsız** (hash zorunlu).
4. ✅ Aynı seçimlerle önizleme fiyatı = sipariş fiyatı (parite testi).
5. ✅ Dilimleyici kapalıyken: `PRICING_REQUIRE_SLICING=true` → sipariş engellenir; `false` →
   tahmini fiyat + görünür uyarı.
6. ✅ SLA akışı bozulmadı; "tahmini" olarak etiketli.
7. ✅ `docker compose up` sonrası `slicer` healthy, app healthy, tüm testler yeşil.
8. ✅ Hiçbir yerde uydurma G-Code/simülasyon yolu kalmadı.

---

## 9. Riskler

| Risk | Etki | Azaltma |
|---|---|---|
| PrusaSlicer argümanı sürümle değişir | Dilimleme 422 döner | Sürüm Dockerfile'da pinli (`2.5.0+dfsg-4`); entegrasyon testi argümanları doğrular |
| Dilimleme yavaş (karmaşık model) | Kullanıcı bekler | Önbellek + `cpus: 2` + 180 s timeout + "tahmini" ile ilk fiyat gösterimi |
| İki eşzamanlı istek aynı işi dilimler | CPU israfı | In-process promise map + unique index |
| STL indirme başarısız | Fiyat yok | 3 deneme, sonra `503` + tahmini fiyat etiketi |
| Migration 095 canlıyı kilitler | Kısa kesinti | Sadece `ADD COLUMN` + index; `CONCURRENTLY` gerekmez (tablo boş) |
| AGPL yükümlülüğü | Hukuki | Dilimleyici ayrı servis, kaynak kodu iç ağda tutulur; dışarıya dağıtım yok |
| Destek kırılımı 0 görünür | Kozmetik | `supportGrams: 0` bilinçli; toplam gram desteği içeriyor (YAGNI notu) |

---

## 10. Süre ve teslim sırası

| Gün | Teslim | Değer |
|---|---|---|
| 1 | Görev 1–3 | Gerçek sayılar üretiliyor, profiller hash'leniyor |
| 2 | Görev 4–7 | Uçtan uca dilimleme + önbellek + doğru fiyat okuma |
| 3 | Görev 8–9 | Sipariş paritesi + arayüz etiketi |
| 4 | Görev 10–12 + testler | Devreye alma, gözlem, kill switch |

**Acil minimum (2 gün):** Görev 1, 2, 3, 4, 5, 6, 7, 8 → sipariş anında gerçek dilimleme ile
fiyat. Arayüz etiketi (Görev 9) 3. güne kayabilir; bu durumda önizleme tahmini kalır ama
**sipariş fiyatı gerçek** olur ve kullanıcıya "fiyat sipariş anında doğrulanır" notu gösterilir.

---

## 11. Rollback

- `SLICING_ENABLED=false` → motor hash'i yok sayar, hacim tahminine döner (eski davranış).
- `docker compose stop slicer` → `/api/pricing/slice` 503; `PRICING_REQUIRE_SLICING=false` ise
  siparişler tahmini fiyatla devam eder.
- Migration 095 geri alınabilir: `DROP INDEX`, `ALTER TABLE ... DROP COLUMN` (veri kaybı yok,
  sadece önbellek).
