#!/usr/bin/env bash
# AXIS3 - production deploy helper.
#
# Sunucuda (VPS) calistirilir; depo kokunde (/var/www/axis3) olmalidir.
# Yaptigi isler:
#   1) depoyu origin/main ile esitler (kirli calisma agaci varsa durur)
#   2) port 3000'i tutan dev konteynerini durdurur
#   3) slicer'i saglikli hale getirir (Once bu: app-prod bunsuz baslamaz)
#   4) app-prod imajini yeniden insa eder ve baslatir
#   5) YENI KODUN IMAJDA OLDUGUNU konteyner icinde GIT_SHA ile dogrular
#   6) /api/health `build` = GIT_SHA ve app-prod -> slicer erisimini dogrular
#
# Kullanim:
#   bash scripts/deploy-prod.sh            # temiz agac sart
#   bash scripts/deploy-prod.sh --force    # yerel degisiklikleri silerek devam et
#
# Not: Dogrulama adimlari FATAL'dir. "Deploy basarili" deyip eski imaji
# birakmak (veya slicer'i olu birakmak) bu projede en pahali hata oldu.

set -euo pipefail

BRANCH="main"
SERVICE="app-prod"
CONTAINER="axis3-app-prod"
SLICER_CONTAINER="axis3-slicer"
# Eski kontrol: imajda e7b8dca ve sonrasinda bulunan bir dizge. Artik asil
# dogrulama /api/health icindeki `build` alani ve imaja gomulen GIT_SHA.
MARKER="coupon_invalid"

say() { printf '\n=== %s\n' "$*"; }
die() { printf '\n!!! %s\n' "$*" >&2; exit 1; }

cd "$(dirname "${BASH_SOURCE[0]}")/.."
say "Depo: $(pwd)"

[ -f docker-compose.yml ] || die "docker-compose.yml bulunamadi; bu betik depo kokunden calismali."
[ -f .env.production ] || die ".env.production yok. Uretim ortam dosyasi olmadan app-prod baslatilamaz."

say "Calisma agaci durumu"
git status --short || true

# DIKKAT: burada yalnizca IZLENEN dosyalardaki degisiklikler engelleyici.
# Izlenmeyen dosya/klasorler `git reset --hard` tarafindan SILINMEZ; bu yuzden
# (orn. sunucuda kalmis eski bir `axis3/` kopyasi) deploy'u kilitlememeli.
TRACKED_DIRTY=$(git status --porcelain --untracked-files=no || true)
UNTRACKED=$(git status --porcelain --untracked-files=normal | grep '^??' || true)

if [ -n "$UNTRACKED" ]; then
  echo "not: izlenmeyen dosyalar korunacak (dokunulmuyor):"
  printf '     %s\n' $UNTRACKED
fi

if [ -n "$TRACKED_DIRTY" ] && [ "${1:-}" != "--force" ]; then
  die "Izlenen dosyalarda commit edilmemis degisiklik var (yukarida ' M ...' satirlari). Once commit/stash edin ya da --force ile devam edin (bu degisiklikler SILINIR)."
fi

say "origin/$BRANCH guncelleniyor"
git fetch --prune origin
echo "uzak : $(git log -1 --oneline "origin/$BRANCH")"
git reset --hard "origin/$BRANCH"
echo "yerel: $(git log -1 --oneline HEAD)"

# Imaja gomulecek surum etiketi (/api/health -> build)
export GIT_SHA="$(git rev-parse --short HEAD)"
echo "GIT_SHA=$GIT_SHA"

say "Port 3000'i tutan konteynerler"
docker ps --filter publish=3000 --format '{{.Names}}  {{.Image}}  {{.Status}}' || true

say "Port 3000'i tutan konteynerler durduruluyor (bu surumun kendisi haric)"
docker compose stop app >/dev/null 2>&1 || true
HOLDERS=$(docker ps --filter publish=3000 --format '{{.Names}}' | grep -v "^${CONTAINER}$" || true)
for c in $HOLDERS; do
  echo "durduruluyor: $c"
  docker stop "$c" >/dev/null
done

# ---------------------------------------------------------------
# DILIMLEYICI KAPISI (build'den ONCE)
# app-prod, `depends_on: slicer: service_healthy` ile basliyor. Slicer
# bozuksa `up app-prod` hata verir. Bu yuzden once slicer ayaga kaldirilir,
# saglikli olmazsa HICBIR SEY insa edilmeden durulur: 5 dakikalik build'i
# bosa harcamayalim ve calisan siteye dokunmayalim.
# ---------------------------------------------------------------
say "Dilimleyici (slicer) hazir mi?"
slicer_health() {
  docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$SLICER_CONTAINER" 2>/dev/null || echo missing
}
echo "slicer durumu: $(docker inspect -f '{{.State.Status}} / restart {{.RestartCount}} / exit {{.State.ExitCode}}' "$SLICER_CONTAINER" 2>/dev/null || echo missing)"

if [ "$(slicer_health)" != "healthy" ]; then
  echo "slicer saglikli degil; yeniden olusturuluyor"
  docker compose --profile production up -d --force-recreate slicer \
    || die "slicer baslatilamadi. Loglar: docker compose --profile production logs --tail=120 slicer"
fi

SLICER_HEALTH="unknown"
for _ in $(seq 1 40); do
  SLICER_HEALTH=$(slicer_health)
  [ "$SLICER_HEALTH" = "healthy" ] && break
  sleep 3
done
echo "slicer saglik: $SLICER_HEALTH"

if [ "$SLICER_HEALTH" != "healthy" ]; then
  # Teshis: konteyner ici ve app-prod -> slicer yolu ayri ayri denenir.
  echo "--- slicer loglari (son 60) ---" >&2
  docker compose --profile production logs --tail=60 slicer >&2 || true
  echo "--- slicer konteyner ici /health ---" >&2
  docker exec "$SLICER_CONTAINER" node -e "fetch('http://127.0.0.1:8000/health').then(r=>r.text()).then(t=>console.log('IC',r.status,t)).catch(e=>console.log('IC HATA',e.message))" >&2 || true
  echo "--- app-prod -> slicer /health ---" >&2
  docker exec "$CONTAINER" node -e "fetch('http://slicer:8000/health').then(r=>r.text()).then(t=>console.log('APP',r.status,t)).catch(e=>console.log('APP HATA',e.message))" >&2 || true
  die "Dilimleyici saglikli olmadan deploy tamamlanmaz (hicbir sey insa edilmedi, site eski imajla ayakta). Onarim: docker compose --profile production build --no-cache slicer && docker compose --profile production up -d --force-recreate slicer"
fi

say "Uretim imaji insa ediliyor (birkac dakika surer; 1 saniyede bitiyorsa cache'e takilmistir)"
docker image inspect -f 'onceki app-prod imaji: {{.Created}}' axis3-app-prod:latest 2>/dev/null || echo "onceki app-prod imaji: yok"
BUILD_START=$(date +%s)
docker compose --profile production build "$SERVICE"
echo "insa suresi: $(( $(date +%s) - BUILD_START )) sn"

say "Servisler baslatiliyor (yeni imaj zorla devreye alinir)"
docker compose --profile production up -d --force-recreate "$SERVICE"
echo "konteyner imaj id: $(docker inspect -f '{{.Image}}' "$CONTAINER" 2>/dev/null || echo '?')"
echo "konteynerin imaji: $(docker image inspect -f '{{.Created}}' "$(docker inspect -f '{{.Image}}' "$CONTAINER" 2>/dev/null)" 2>/dev/null || echo '?')"

say "Saglik kontrolu bekleniyor"
HEALTH="unknown"
for _ in $(seq 1 60); do
  HEALTH=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$CONTAINER" 2>/dev/null || echo missing)
  [ "$HEALTH" = "healthy" ] && break
  sleep 3
done
echo "saglik: $HEALTH"
[ "$HEALTH" = "healthy" ] || die "Konteyner saglikli olmadi. Loglar: docker compose --profile production logs --tail=100 $SERVICE"

say "YENI KOD IMAJDA MI? (imaj ici kanit)"
# NOT: `... | grep -q` KULLANILMAZ. grep -q ilk satirda cikip boruyu kapatinca
# docker exec SIGPIPE alir; `set -o pipefail` yuzunden boru hatali sayilir ve
# kod imajda OLSA BILE kontrol "bulunamadi" der. Cikti degiskene alinir.
# GIT_SHA derleme aninda NEXT_PUBLIC_BUILD_SHA olarak paketlere gomulur.
FOUND=$(docker exec "$CONTAINER" sh -c "grep -rl '$GIT_SHA' /app/.next 2>/dev/null | head -5" || true)
if [ -n "$FOUND" ]; then
  echo "OK - $GIT_SHA imajin icindeki derlemeye gomulmus; yeni kod yayinda."
  printf '     %s\n' $FOUND
else
  echo "UYARI - $GIT_SHA imajda bulunamadi; kesin karar /api/health kontrolunde verilecek." >&2
  FALLBACK=$(docker exec "$CONTAINER" sh -c "grep -rl '$MARKER' /app/.next 2>/dev/null | head -3" || true)
  [ -n "$FALLBACK" ] && printf '     (eski isaret bulundu: %s)\n' $FALLBACK >&2
fi

say "Canli kontrol"
# /api/health, imaja gomulen build etiketini doner. BURASI FATAL: "deploy
# basarili" deyip eski imaji birakmak, bu projede yasanan en pahali hata.
HEALTH_JSON=$(curl -fsS http://127.0.0.1:3000/api/health || true)
printf '%s\n' "$HEALTH_JSON"
if printf '%s' "$HEALTH_JSON" | grep -q "\"build\":\"$GIT_SHA\""; then
  echo "OK - /api/health build=$GIT_SHA (yayindaki surum bu commit)"
else
  echo "BASARISIZ - yayindaki surum $GIT_SHA degil." >&2
  echo "        build arg imaja gecmemis olabilir. Tekrar deneyin:" >&2
  echo "        docker compose --profile production build --no-cache $SERVICE && docker compose --profile production up -d --force-recreate $SERVICE" >&2
  exit 3
fi

say "Uygulama dilimleyiciye ulasiyor mu?"
# Fiyat ve siparis akisi bu yol olmadan calismaz (PRICING_REQUIRE_SLICING=true).
DEEP_JSON=$(curl -fsS 'http://127.0.0.1:3000/api/health?deep=1' || true)
printf '%s\n' "$DEEP_JSON"
if printf '%s' "$DEEP_JSON" | grep -q '"ok":true'; then
  echo "OK - app-prod -> slicer saglikli."
else
  echo "BASARISIZ - uygulama dilimleyiciye ULASAMIYOR (fiyat/siparis 503 doner)." >&2
  docker compose --profile production logs --tail=40 slicer >&2 || true
  exit 4
fi

say "Durum"
docker compose --profile production ps

printf '\n'
echo "Tamamlandi. Tarayicida sabit yenileme (Ctrl+F5) yapin."
echo "DIKKAT: 'docker compose up -d' (profil belirtmeden) dev 'app' servisini tekrar baslatir ve 3000 portunu kapar."
echo "Bundan sonra her zaman: docker compose --profile production up -d $SERVICE"
