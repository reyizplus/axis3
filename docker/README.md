# Axis3 - Docker Development Guide

## 🐳 Full Docker-Native Development

Tüm geliştirme ortamı Docker üzerinde izole çalışır. `npm run dev` yerine Docker Compose kullanılır.

---

## 📋 Gereksinimler

- Docker Desktop 4.0+ (Windows/Mac)
- Docker Engine 20.10+ (Linux)
- Docker Compose 2.0+

---

## 🚀 Hızlı Başlangıç

### 1. Environment Variables

```bash
# .env.local dosyasını oluştur
cp .env.local.example .env.local

# Gerekli değerleri doldur (Supabase, iyzico, vb.)
```

### 2. Development Ortamını Başlat

```bash
# İlk kez çalıştırma (build + start)
npm run docker:dev:build

# Sonraki çalıştırmalar (sadece start)
npm run docker:dev
```

### 3. Servisleri Kontrol Et

```bash
# Tüm servislerin durumunu kontrol et
docker-compose ps

# Logları izle
npm run docker:logs

# Health check
curl http://localhost:3000/api/health
```

---

## 🛠️ Docker Komutları

### Temel Komutlar

```bash
# Development ortamını başlat
npm run docker:dev

# Development ortamını build + başlat
npm run docker:dev:build

# Production build'i test et
npm run docker:prod

# Tüm servisleri durdur
npm run docker:down

# Tüm servisleri durdur + volume'leri temizle
npm run docker:clean
```

### Debug Komutları

```bash
# App container'a shell ile bağlan
npm run docker:shell

# PostgreSQL'e bağlan
npm run docker:db

# Redis CLI'ye bağlan
npm run docker:redis

# Logları izle
npm run docker:logs
```

---

## 🌐 Servis Portları

| Servis | Port | URL |
|--------|------|-----|
| Next.js (Dev) | 3000 | http://localhost:3000 |
| Next.js (Prod) | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | postgresql://localhost:5432 |
| Redis | 6379 | redis://localhost:6379 |

---

## 📁 Volume Mapping

### Hot-Reload Desteklenen Dizinler

```yaml
- ./src:/app/src                    # Kaynak kodlar
- ./public:/app/public              # Statik dosyalar
- ./.env.local:/app/.env.local      # Environment variables
- ./next.config.ts:/app/next.config.ts
- ./tailwind.config.ts:/app/tailwind.config.ts
- ./tsconfig.json:/app/tsconfig.json
```

### Anonymous Volumes (Çakışma Önleme)

```yaml
- /app/node_modules    # Host'taki node_modules ile çakışmayı önler
- /app/.next           # Build cache'i izole eder
```

---

## 🔧 Troubleshooting

### Problem: node_modules çakışması

```bash
# Çözüm: Anonymous volume kullanılıyor, ancak sorun devam ederse:
npm run docker:clean
npm run docker:dev:build
```

### Problem: Port zaten kullanımda

```bash
# Çözüm: Çalışan servisleri durdur
npm run docker:down

# Veya port'u değiştir (docker-compose.yml)
ports:
  - "3001:3000"  # 3000 yerine 3001 kullan
```

### Problem: Database bağlantı hatası

```bash
# Çözüm: PostgreSQL'in healthy olmasını bekle
docker-compose ps

# Veya manuel restart
docker-compose restart postgres
docker-compose restart app
```

### Problem: Hot-reload çalışmıyor

```bash
# Çözüm: Volume mapping'i kontrol et
docker-compose down
docker-compose up app postgres redis
```

---

## 🏗️ Mimari

```
┌─────────────────────────────────────────┐
│  Host Machine (Windows/Mac/Linux)       │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Docker Network: axis3-network     │ │
│  │                                    │ │
│  │  ┌──────────┐  ┌──────────┐      │ │
│  │  │ Next.js  │  │PostgreSQL│      │ │
│  │  │  :3000   │←→│  :5432   │      │ │
│  │  └──────────┘  └──────────┘      │ │
│  │       ↕                            │ │
│  │  ┌──────────┐                     │ │
│  │  │  Redis   │                     │ │
│  │  │  :6379   │                     │ │
│  │  └──────────┘                     │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Volumes:                                │
│  - postgres_data (persistent)            │
│  - redis_data (persistent)               │
│  - ./src (hot-reload)                    │
└─────────────────────────────────────────┘
```

---

## 🔐 Güvenlik

### Development

- PostgreSQL: Trust authentication (local only)
- Redis: No password (local only)
- Ports: Localhost'a bind edilmiş

### Production

- Environment variables: `.env.local` kullan
- Secrets: Docker secrets veya external secret manager
- Network: Internal network, sadece gerekli portlar expose

---

## 📊 Health Checks

Tüm servisler health check ile izlenir:

```yaml
# PostgreSQL
healthcheck:
  test: pg_isready -U axis3_user -d axis3_dev
  interval: 10s

# Redis
healthcheck:
  test: redis-cli ping
  interval: 10s

# Next.js
healthcheck:
  test: curl http://localhost:3000/api/health
  interval: 30s
```

---

## 🎯 Best Practices

1. **Her zaman Docker kullan:** `npm run dev` yerine `npm run docker:dev`
2. **Volume'leri temizle:** Sorun yaşarsan `npm run docker:clean`
3. **Logları izle:** `npm run docker:logs` ile debug yap
4. **Health check'leri kontrol et:** `docker-compose ps` ile durum gör
5. **Production test:** Deploy öncesi `npm run docker:prod` ile test et

---

## 📚 Referanslar

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Redis Docker Hub](https://hub.docker.com/_/redis)

---

**Son Güncelleme:** 17 Nisan 2026  
**Durum:** Production-Ready Docker Environment
