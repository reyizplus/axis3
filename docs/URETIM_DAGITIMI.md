# Üretim Dağıtımı — Uygulama + Dilimleyici (VPS)

Bu runbook, `axis3.com.tr` gibi tek sunuculu (Docker + nginx + Cloudflare) kurulum
içindir. Amaç: Next.js uygulaması ile PrusaSlicer sidecar'ını **aynı Docker ağında**
çalıştırmak. Ayrı ağdaysalar veya sidecar hiç yoksa fiyat üretilmez:

```
POST /api/pricing/slice     → 503  {"code":"slicer_unavailable"}
POST /api/pricing/preview   → 503  {"code":"slicer_unavailable"}
GET  /api/health?deep=1     → {"slicer":{"ok":false}}
```

Kod tarafında uydurma gram/süre üretilmediği için arayüz fiyat göstermez — bu
beklenen davranıştır. Çözüm altyapıdadır.

## 0. Hatırlatma: tek konteyner yetmez

`docker run ... --env-file .env.production` (README'deki eski yöntem) yalnızca
uygulamayı başlatır. `SLICER_URL` tanımlı olmadığında istemci varsayılanı
`http://localhost:8000` olur ve konteyner içinde dinleyen bir dilimleyici yoktur.
Bu yüzden **slicer sidecar zorunludur**.

## 1. Hızlı yol (uygulama imajını yeniden derlemeden)

Mevcut çalışan konteynerin ayarlarını kaybetmemek için önce kaydet:

```bash
docker port axis3-production
docker inspect axis3-production \
  --format '{{.Config.Image}}
{{json .HostConfig.RestartPolicy}}
{{range .Mounts}}{{.Type}} {{.Source}} -> {{.Destination}}{{println}}{{end}}'
```

Sonra sidecar'ı ayağa kaldır:

```bash
cd /var/www/axis3

# 1) Ortak ağ (varsa hata vermez)
docker network create axis3-prod 2>/dev/null || true

# 2) Dilimleyici imajı — ilk derleme PrusaSlicer apt katmanı için birkaç dakika sürer
docker build -t axis3-slicer ./slicer

# 3) Sidecar'ı başlat (host'a port AÇILMAZ)
docker run -d --name axis3-slicer --restart unless-stopped \
  --network axis3-prod --expose 8000 \
  --cpus 2 --memory 2g \
  axis3-slicer

# 4) Sidecar kendi içinden sağlıklı mı?
docker exec axis3-slicer node -e "fetch('http://127.0.0.1:8000/health').then(r=>r.text()).then(console.log)"
docker exec axis3-slicer prusa-slicer --version
```

Uygulamayı aynı ağa, dilimleyici adresiyle yeniden oluştur (birkaç saniye kesinti).
`-v` satırını yukarıda kaydettiğin mount'a göre uyarla (yoksa hiç yazma):

```bash
IMG=$(docker inspect axis3-production --format '{{.Config.Image}}')

docker rm -f axis3-production

docker run -d --name axis3-production --restart unless-stopped \
  --network axis3-prod -p 3000:3000 \
  --env-file /var/www/axis3/.env.production \
  -e NODE_ENV=production \
  -e SLICER_URL=http://axis3-slicer:8000 \
  -e SLICING_ENABLED=true \
  -e PRICING_REQUIRE_SLICING=true \
  -e INTERNAL_API_BASE_URL=http://127.0.0.1:3000 \
  "$IMG"
```

> Not: user-defined ağda **konteyner adı** DNS olarak çözülür, bu yüzden adres
> `http://axis3-slicer:8000`. Compose yolunda servis adı `slicer` olur.

## 2. Kalıcı yol (önerilen): `docker-compose.prod.yml`

Depodaki `docker-compose.prod.yml` yalnızca `app` + `slicer` servislerini tanımlar
(postgres/redis yok; üretimde Supabase kullanılıyor).

```bash
cd /var/www/axis3
git pull

# Elle oluşturulmuş konteyner compose ile isim çakışır; önce kaldır.
docker rm -f axis3-production

docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

Sonraki güncellemeler:

```bash
git pull && docker compose -f docker-compose.prod.yml up -d --build
```

## 3. Doğrulama (zorunlu)

```bash
# Konteyner içinden (adres doğru mu?)
docker exec axis3-production node -e "fetch(process.env.SLICER_URL+'/health').then(async r=>console.log(r.status, await r.text())).catch(e=>console.log('HATA', e.cause?.code||e.message))"

# Dışarıdan
curl -s 'https://axis3.com.tr/api/health?deep=1'
# beklenen: {"status":"healthy", ... "slicer":{"ok":true,"queueDepth":0}}
```

Ardından `/upload/<fileId>` sayfasında malzeme + kalite seçip fiyatın
"Gerçek dilimleme" etiketiyle geldiğini kontrol et. İlk dilimleme (PrusaSlicer
soğuk başlangıç) birkaç saniye sürebilir; sonrakiler önbellekten gelir.

## 4. Sık görülen hatalar

| Belirti | Neden | Çözüm |
| --- | --- | --- |
| `slicer.ok:false`, `responseTime` ~3000 ms | Bağlantı asılı kalıyor: yanlış host/port veya ağ yok | `SLICER_URL` ve ortak ağ; yukarıdaki `docker exec` testi |
| `503` ~14 s sonra | İki deneme × bağlantı zaman aşımı | Aynı: sidecar erişilemiyor |
| `422 slicer_rejected` + `401` | Sidecar'da `SLICER_TOKEN` var, uygulamada yok | İki tarafa aynı token (veya ikisinde de boş) |
| `422 slicer_rejected` (PrusaSlicer) | Model/doluluk deseni reddedildi | `docker compose logs slicer`; modelde onarım gerekebilir |
| `504 slicer_timeout` | Model `SLICER_TIMEOUT_MS` (180 s) içinde bitmedi | Daha güçlü CPU veya basitleştirilmiş model |
| `503 queue_full` | `SLICER_MAX_CONCURRENCY` dolu | Eşzamanlılığı/kaynakları artır |

## 5. Geri dönüş

Sorun çıkarsa eski tek konteyner düzenine dönmek için sidecar'ı durdurmak yeterli
değildir; uygulamanın eski konteynerini geri getir:

```bash
docker rm -f axis3-production && docker rm -f axis3-slicer
docker run -d --name axis3-production --restart unless-stopped \
  -p 3000:3000 --env-file /var/www/axis3/.env.production "$IMG"
```

Bu durumda fiyat önizlemesi yine çalışmaz (503) — dilimleyici olmadan FDM fiyatı
üretilmiyor. Uzun süreli kesinti gerekiyorsa `SLICING_ENABLED=false` kill switch'i
ve arayüz tarafındaki hacim tahmini geri dönüşü ayrıca ele alınmalı.
