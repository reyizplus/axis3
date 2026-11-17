# Axis3 - Professional 3D Printing Platform

Enterprise-grade online 3D printing order management platform built with Next.js 16, Supabase, and modern web technologies.

## 🎯 Features

- **STL File Processing**: Advanced 3D model analysis with Three.js
- **Dynamic Pricing Engine**: Database-driven pricing with material and quality parameters
- **Order Management**: Complete order lifecycle from upload to delivery
- **Payment Integration**: iyzico payment gateway with EFT/Havale support
- **Admin Dashboard**: Comprehensive management panel for orders, materials, and settings
- **Email Notifications**: Automated email system with Resend
- **Multi-tenant Architecture**: User isolation with Row Level Security (RLS)
- **Production Capacity Management**: Dynamic delivery estimation based on workload

## 🏗️ Tech Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- **Backend**: Next.js API Routes + Supabase
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth with 2FA support
- **Storage**: Supabase Storage for STL files
- **3D Processing**: Three.js (Vanilla - no React wrapper)
- **Payment**: iyzico Payment Gateway
- **Email**: Resend
- **Deployment**: Docker + Vercel/VPS

## 📋 Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose (for local development)
- Supabase account (or self-hosted Supabase)
- Domain name (for production)
- SSL certificate (Let's Encrypt recommended)

## 🚀 Quick Start (Development)

### 1. Clone Repository

```bash
git clone <repository-url>
cd axis3-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Payment (iyzico)
IYZICO_API_KEY=your-api-key
IYZICO_SECRET_KEY=your-secret-key
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
```

### 4. Run Development Server

```bash
npm run dev
```

Application will be available at [http://localhost:3000](http://localhost:3000)

## 🐳 Docker Deployment (Development)..

```bash
docker-compose up --build
```

## 🌐 Production Deployment

### Option 1: VDS/VPS Deployment (Recommended for Full Control)

#### Prerequisites

- Ubuntu 22.04 LTS or newer
- Minimum 2GB RAM, 2 CPU cores
- 20GB storage
- Root or sudo access
- Domain name pointed to server IP

#### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Install Nginx
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

#### Step 2: Clone and Configure

```bash
# Clone repository
git clone <repository-url> /var/www/axis3
cd /var/www/axis3

# Create production environment file
cp .env.example .env.production
nano .env.production
```

Configure production environment variables:

```env
NODE_ENV=production

# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# Application URLs
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Email (Resend)
RESEND_API_KEY=your-production-resend-key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Payment (iyzico Production)
IYZICO_API_KEY=your-production-api-key
IYZICO_SECRET_KEY=your-production-secret-key
IYZICO_BASE_URL=https://api.iyzipay.com

# Security
NEXT_PUBLIC_RATE_LIMIT_REQUESTS=100
NEXT_PUBLIC_RATE_LIMIT_WINDOW=900000
```

#### Step 3: Build and Run with Docker

> **Guncelleme (deploy) icin:** depo kokunde `bash scripts/deploy-prod.sh` calistirin.
> Betik depoyu `origin/main` ile esitler, port 3000'i tutan dev konteynerini durdurur,
> `app-prod` imajini yeniden insa eder ve **yeni kodun imaja girdigini konteyner icinde
> `grep` ile dogrular**. Basliklardan (ornegin HSTS) surum anlasilamaz; Cloudflare kendi
> varsayilan HSTS basligini dondurur.

```bash
# Build production image
docker build -t axis3-production -f Dockerfile .

# Run container
docker run -d \
  --name axis3-app \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.production \
  axis3-production
```

Or use Docker Compose:

```bash
# Create docker-compose.prod.yml
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: axis3-production
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
    networks:
      - axis3-network

networks:
  axis3-network:
    driver: bridge
EOF

# Start production
docker-compose -f docker-compose.prod.yml up -d
```

#### Step 4: Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/axis3
```

Add configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # File upload size limit (100MB for STL files)
    client_max_body_size 100M;
}
```

Enable site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/axis3 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 5: Cloudflare DNS Configuration (Optional but Recommended)

If using Cloudflare for DNS and CDN, configure it before SSL setup:

##### 5.1: Add DNS Records

Login to Cloudflare Dashboard and add DNS records:

| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| A | @ | YOUR_SERVER_IP | Proxied | Auto |
| A | www | YOUR_SERVER_IP | Proxied | Auto |

##### 5.2: SSL/TLS Settings

**SSL/TLS → Overview:**
- Encryption mode: **Full (strict)**

**SSL/TLS → Edge Certificates:**
- Always Use HTTPS: **ON**
- HTTP Strict Transport Security (HSTS): **ON**
  - Max Age: 6 months
  - Include subdomains: ON
  - Preload: ON
- Minimum TLS Version: **TLS 1.2**
- TLS 1.3: **ON**
- Automatic HTTPS Rewrites: **ON**

##### 5.3: Security Settings

**Security → Settings:**
- Security Level: **Medium** or **High**
- Bot Fight Mode: **ON**

**Security → WAF (Firewall Rules):**

Create custom rules:

1. **Block Bad Bots:**
   ```
   (cf.client.bot) and not (cf.verified_bot_category in {"Search Engine Crawler"})
   Action: Block
   ```

2. **Rate Limit API:**
   ```
   (http.request.uri.path contains "/api/") and (rate.requests.10s > 100)
   Action: Challenge
   ```

3. **Protect Admin Panel:**
   ```
   (http.request.uri.path contains "/admin") and (ip.geoip.country ne "TR")
   Action: Challenge
   ```

##### 5.4: Speed Optimization

**Speed → Optimization:**
- Auto Minify: Enable JS, CSS, HTML
- Brotli: **ON**
- Rocket Loader: **OFF** (can break Next.js)

**Caching → Configuration:**
- Caching Level: **Standard**
- Browser Cache TTL: **4 hours**

##### 5.5: Page Rules

Create these page rules:

1. **Cache Static Assets:**
   - URL: `yourdomain.com/_next/static/*`
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month

2. **Bypass API Cache:**
   - URL: `yourdomain.com/api/*`
   - Cache Level: Bypass

3. **Secure Admin:**
   - URL: `yourdomain.com/admin/*`
   - Cache Level: Bypass
   - Security Level: High

##### 5.6: Configure Nginx for Cloudflare

Create Cloudflare IP whitelist:

```bash
sudo nano /etc/nginx/snippets/cloudflare-ips.conf
```

Add Cloudflare IP ranges:

```nginx
# Cloudflare IPv4
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 131.0.72.0/22;

# Use CF-Connecting-IP header
real_ip_header CF-Connecting-IP;
```

Update Nginx site config to include Cloudflare IPs:

```bash
sudo nano /etc/nginx/sites-available/axis3
```

Add at top of server block:

```nginx
server {
    # Include Cloudflare IPs
    include snippets/cloudflare-ips.conf;
    
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    # ... rest of config
}
```

##### 5.7: Cloudflare Origin Certificate

For "Full (strict)" SSL mode, use Cloudflare Origin Certificate:

1. Cloudflare Dashboard → **SSL/TLS** → **Origin Server**
2. Click **Create Certificate**
3. Settings:
   - Private key: RSA (2048)
   - Hostnames: `yourdomain.com`, `*.yourdomain.com`
   - Validity: 15 years
4. Save certificate and key:

```bash
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/cert.pem  # Paste certificate
sudo nano /etc/ssl/cloudflare/key.pem   # Paste private key
sudo chmod 600 /etc/ssl/cloudflare/key.pem
sudo chmod 644 /etc/ssl/cloudflare/cert.pem
```

Update Nginx SSL config:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/ssl/cloudflare/cert.pem;
    ssl_certificate_key /etc/ssl/cloudflare/key.pem;
    
    # ... rest of config
}
```

Restart Nginx:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

##### 5.8: Verify Cloudflare Setup

```bash
# Check Cloudflare headers
curl -I https://yourdomain.com | grep -i "cf-"

# Should see: cf-ray, cf-cache-status, server: cloudflare
```

#### Step 6: Setup SSL with Let's Encrypt (Alternative to Cloudflare Origin Certificate)

If not using Cloudflare or prefer Let's Encrypt:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow prompts and select option 2 (redirect HTTP to HTTPS).

**Note:** If using Cloudflare proxy, temporarily set DNS to "DNS only" (not proxied) before running certbot, then re-enable proxy after certificate is issued.

#### Step 8: Setup Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

#### Step 9: Database Migrations

```bash
# Run Supabase migrations
cd /var/www/axis3
node scripts/apply-migrations.js
```

#### Step 10: Verify Deployment

```bash
# Check Docker container
docker ps
docker logs axis3-app

# Check Nginx
sudo systemctl status nginx

# Test application
curl -I https://yourdomain.com
```

### Option 2: Vercel Deployment (Easiest)

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

### Option 3: Railway Deployment

1. Push code to GitHub
2. Create new project in Railway
3. Connect GitHub repository
4. Add environment variables
5. Deploy

## 🔧 Configuration

### Supabase Setup

1. Create new Supabase project
2. Run migrations from `supabase/migrations/` directory
3. Configure Storage bucket for STL files
4. Set up Row Level Security (RLS) policies
5. Create admin user manually in database

### Email Configuration (Resend)

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain
3. Create API key
4. Add to environment variables

### Payment Gateway (iyzico)

1. Register at [iyzico.com](https://www.iyzico.com)
2. Get API credentials
3. For production: Use production API URL
4. For development: Use sandbox API URL

## 📁 Project Structure

```
axis3-app/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── (auth)/       # Authentication pages
│   │   ├── admin/        # Admin dashboard
│   │   ├── api/          # API routes
│   │   ├── blog/         # Blog system
│   │   ├── cart/         # Shopping cart
│   │   ├── checkout/     # Checkout flow
│   │   ├── dashboard/    # User dashboard
│   │   └── upload/       # STL upload
│   ├── components/       # React components
│   │   ├── admin/        # Admin components
│   │   ├── layout/       # Layout components
│   │   ├── pricing/      # Pricing components
│   │   ├── settings/     # Settings components
│   │   ├── ui/           # UI components
│   │   └── upload/       # Upload components
│   ├── lib/              # Core libraries
│   │   ├── actions/      # Server actions
│   │   ├── cart/         # Cart logic
│   │   ├── email/        # Email utilities
│   │   ├── payment/      # Payment integration
│   │   ├── pricing/      # Pricing engine
│   │   ├── services/     # Business logic services
│   │   ├── supabase/     # Supabase clients
│   │   ├── three/        # Three.js STL analyzer
│   │   ├── upload/       # Upload utilities
│   │   └── utils/        # Helper functions
│   ├── types/            # TypeScript types
│   └── emails/           # Email templates
├── public/               # Static assets
├── supabase/
│   └── migrations/       # Database migrations (54 files)
├── scripts/              # Utility scripts
│   ├── apply-migrations.js
│   └── sanitize-blog-content.js
├── docker/               # Docker configuration
├── .env.example          # Environment variables template
├── Dockerfile            # Production Docker image
├── docker-compose.yml    # Docker Compose configuration
└── README.md             # This file
```

## 🔐 Security

- Row Level Security (RLS) on all database tables
- JWT-based authentication with Supabase
- 2FA support for admin accounts
- Rate limiting on API endpoints
- CORS configuration
- Input validation with Zod
- SQL injection protection
- XSS protection
- CSRF protection

## 🧪 Testing

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build test
npm run build
```

## 📊 Monitoring

### Application Logs

```bash
# Docker logs
docker logs -f axis3-app

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Health Check

Application exposes health check endpoint:

```bash
curl https://yourdomain.com/api/health
```

## 🔄 Updates and Maintenance

### Update Application

```bash
cd /var/www/axis3
git pull origin main
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

### Database Backup

```bash
# Backup Supabase database
# Use Supabase dashboard or pg_dump
```

### SSL Certificate Renewal

Certbot auto-renews certificates. Test renewal:

```bash
sudo certbot renew --dry-run
```

## 🐛 Troubleshooting

### Application won't start

```bash
# Check Docker logs
docker logs axis3-app

# Check environment variables
docker exec axis3-app env | grep NEXT_PUBLIC
```

### Database connection issues

- Verify Supabase credentials in `.env.production`
- Check Supabase project status
- Verify network connectivity

### File upload issues

- Check Supabase Storage bucket configuration
- Verify file size limits in Nginx (`client_max_body_size`)
- Check storage quota

### Payment gateway issues

- Verify iyzico credentials
- Check API URL (sandbox vs production)
- Review iyzico dashboard for errors

## 📞 Support

For issues and questions:
- Email: support@axis3.com.tr
- Documentation: [Internal Wiki]
- GitHub Issues: [Repository Issues]

## 📝 License

Proprietary - All rights reserved

## 🙏 Credits

Built with:
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Three.js](https://threejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [iyzico](https://www.iyzico.com/)
- [Resend](https://resend.com/)

---

**Version**: 1.0.0  
**Last Updated**: April 2026  
**Status**: Production Ready ✅
