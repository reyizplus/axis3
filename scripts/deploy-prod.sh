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

if [ -n "$(git status --porcelain)" ] && [ "${1:-}" != "--force" ]; then
  die "Calisma agacinda commit edilmemis degisiklik var. Once commit/stash edin ya da --force ile devam edin (yerel degisiklikler SILINIR)."
fi

say "origin/$BRANCH guncelleniyor"
git fetch --prune origin
echo "uzak : $(git log -1 --oneline "origin/$BRANCH")"
git reset --hard "origin/$BRANCH"
echo "yerel: $(git log -1 --oneline HEAD)"

say "Port 3000'i tutan konteynerler"
docker ps --filter publish=3000 --format '{{.Names}}  {{.Image}}  {{.Status}}' || true

say "Dev uygulamasi durduruluyor (port cakismasi)"
docker compose stop app >/dev/null 2>&1 || true
docker stop axis3-app >/dev/null 2>&1 || true

say "Uretim imaji insa ediliyor (birkac dakika surer; 1 saniyede bitiyorsa cache'e takilmistir)"
BUILD_START=$(date +%s)
docker compose --profile production build "$SERVICE"
echo "insa suresi: $(( $(date +%s) - BUILD_START )) sn"

say "Servisler baslatiliyor"
docker compose --profile production up -d "$SERVICE"

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
if docker exec "$CONTAINER" sh -c "grep -rl '$MARKER' /app/.next 2>/dev/null | head -3" | grep -q .; then
  echo "OK - '$MARKER' imajin icinde bulundu; yeni kod yayinda."
else
  echo "BASARISIZ - '$MARKER' imajda YOK. Build cache'e takildi ya da git guncellenmedi." >&2
  echo "Tekrar deneyin: docker compose --profile production build --no-cache $SERVICE && docker compose --profile production up -d $SERVICE" >&2
  exit 2
fi

say "Canli kontrol"
curl -fsS -o /dev/null -w 'http://127.0.0.1:3000/api/health -> %{http_code}\n' http://127.0.0.1:3000/api/health || true

say "Durum"
docker compose --profile production ps

printf '\n'
echo "Tamamlandi. Tarayicida sabit yenileme (Ctrl+F5) yapin."
echo "DIKKAT: 'docker compose up -d' (profil belirtmeden) dev 'app' servisini tekrar baslatir ve 3000 portunu kapar."
echo "Bundan sonra her zaman: docker compose --profile production up -d $SERVICE"
