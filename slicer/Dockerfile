# Axis3 dilimleyici sidecar — PrusaSlicer 2.5.0 (Debian headless)
#
# Alpine (musl) app imajindan ayri tutulur: PrusaSlicer yalnizca glibc icin
# paketleniyor ve CPU-yogun isi ana uygulamadan izole edilmek isteniyor.
FROM node:26-bookworm-slim

# PrusaSlicer Debian bookworm deposundan kurulur (2.5.0+dfsg-4). Ek profil
# dosyasi gerekmez; CLI dogrudan --export-gcode ile calisir.
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      prusa-slicer ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /slicer

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.mjs gcode-summary.mjs gcode-preview.mjs ./

# Varsayilanlar compose tarafindan da verilir; burada yalnizca guvenli taban.
ENV PORT=8000 SLICER_MAX_CONCURRENCY=2 SLICER_TIMEOUT_MS=180000

USER node
EXPOSE 8000

CMD ["node", "server.mjs"]
