# Axis3 - Optimized Production Dockerfile
# Multi-stage build with size optimization

# Stage 1: Dependencies (Production only)
FROM node:26-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy patch scripts and apply next-themes patch
COPY scripts scripts/
RUN node scripts/patch-next-themes.js

# Stage 2: Builder
FROM node:26-alpine AS builder
WORKDIR /app

# Copy package files and install all dependencies (including devDependencies)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and patch scripts
COPY . .
COPY scripts scripts/

# Apply next-themes patch before build so client bundle is patched
RUN node scripts/patch-next-themes.js

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build argument for site URL (required for robots.txt generation)
ARG NEXT_PUBLIC_SITE_URL=https://axis3.com.tr
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# Build the application
RUN npm run build

# Stage 3: Runner (Minimal)
FROM node:26-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security and logs directory
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/logs && \
    chown nextjs:nodejs /app/logs

# Copy only production dependencies
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Uygulama loglari (logs/app.log) dogrudan `appendLog` tarafindan yazilir.
# Konsol cikisi Docker loglarina gider; dosyaya tee ile karistirilmaz
# (aksi halde ayni satirlar iki kez ve rotation bozuk sekilde yaziliyordu).
CMD ["node", "server.js"]
