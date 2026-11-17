#!/usr/bin/env bash
# AXIS3 - production deploy helper.
#
# Sunucuda (VPS) calistirilir; depo kokunde (/var/www/axis3) olmalidir.
# Yaptigi isler:
#   1) depoyu origin/main ile esitler (kirli calisma agaci varsa durur)
#   2) port 3000'i tutan dev konteynerini durdurur
#   3) app-prod imajini yeniden insa eder ve baslatir
#   4) YENI KODUN IMAJDA OLDUGUNU konteyner icinde grep ile dogrular
#
# Kullanim:
#   bash scripts/deploy-prod.sh            # temiz agac sart
#   bash scripts/deploy-prod.sh --force    # yerel degisiklikleri silerek devam et
#
# Not: Dogrulama adimi kritiktir. Cloudflare varsayilan HSTS basligini
# (max-age=15552000) dondurdugu icin basliklardan surum anlasilmaz; tek
# guvenilir kanit imajin icindeki kod parcasidir.

set -euo pipefail

BRANCH="main"
SERVICE="app-prod"
CONTAINER="axis3-app-prod"
# Bu dizge sadece e7b8dca ve sonrasi build'lerde bulunur (checkout 409 akisi).
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

say "YENI KOD IMAJDA MI? (asil dogrulama)"
# NOT: `... | grep -q` KULLANILMAZ. grep -q ilk satirda cikip boruyu kapatinca
# docker exec SIGPIPE alir; `set -o pipefail` yuzunden boru hatali sayilir ve
# kod imajda OLSA BILE kontrol "bulunamadi" der. Cikti degiskene alinir.
FOUND=$(docker exec "$CONTAINER" sh -c "grep -rl '$MARKER' /app/.next 2>/dev/null | head -5" || true)
if [ -n "$FOUND" ]; then
  echo "OK - '$MARKER' imajin icinde bulundu; yeni kod yayinda."
  printf '     %s\n' $FOUND
else
  echo "BASARISIZ - '$MARKER' imajda YOK. Build cache'e takildi ya da git guncellenmedi." >&2
  echo "Konteynerdeki imaj: $(docker inspect -f '{{.Image}}' "$CONTAINER" 2>/dev/null)" >&2
  echo "Tekrar deneyin: docker compose --profile production build --no-cache $SERVICE && docker compose --profile production up -d $SERVICE" >&2
  exit 2
fi

say "Canli kontrol"
HEALTH_JSON=$(curl -fsS http://127.0.0.1:3000/api/health || true)
printf '%s\n' "$HEALTH_JSON"
if printf '%s' "$HEALTH_JSON" | grep -q "\"build\":\"$GIT_SHA\""; then
  echo "OK - /api/health build=$GIT_SHA (yayindaki surum bu commit)"
else
  echo "UYARI - /api/health icinde build=$GIT_SHA gorunmuyor. Eski imaj ayakta olabilir." >&2
  echo "        Uygulama eski imajla derlendiyse: docker compose --profile production up -d --force-recreate $SERVICE" >&2
fi

say "Durum"
docker compose --profile production ps

printf '\n'
echo "Tamamlandi. Tarayicida sabit yenileme (Ctrl+F5) yapin."
echo "DIKKAT: 'docker compose up -d' (profil belirtmeden) dev 'app' servisini tekrar baslatir ve 3000 portunu kapar."
echo "Bundan sonra her zaman: docker compose --profile production up -d $SERVICE"
