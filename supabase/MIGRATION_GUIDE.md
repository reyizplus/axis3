# AXIS3 - SUPABASE MIGRATION GUIDE

**Version:** 1.0  
**Date:** 2026-04-17  
**Status:** Ready for Execution

---

## 📋 MIGRATION OVERVIEW

This guide provides step-by-step instructions for migrating the Axis3 database schema to Supabase Cloud.

### Migration Files

1. **001_initial_schema.sql** - Database schema (14 tables)
2. **002_rls_policies.sql** - Row Level Security policies (30+ policies)
3. **003_seed_data.sql** - Initial data (materials, settings)
4. **004_storage_config.sql** - Storage buckets and policies

---

## 🚀 STEP 1: CREATE SUPABASE PROJECT

### 1.1 Sign Up / Login
```
URL: https://supabase.com
Action: Create account or login
```

### 1.2 Create New Project
```
Project Name: axis3-production
Database Password: [STRONG_PASSWORD]
Region: Europe (Frankfurt) - eu-central-1
Pricing Plan: Free (or Pro for production)
```

### 1.3 Get Credentials
After project creation, navigate to **Settings > API**:

```
Project URL: https://[PROJECT_ID].supabase.co
anon (public) key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🗄️ STEP 2: RUN DATABASE MIGRATIONS

### 2.1 Access SQL Editor
```
Supabase Dashboard > SQL Editor > New Query
```

### 2.2 Execute Migration 001 (Schema)
```sql
-- Copy entire content from:
-- axis3-app/supabase/migrations/001_initial_schema.sql

-- Paste into SQL Editor and click "Run"
-- Expected: 14 tables created, 50+ indexes, 11 triggers
```

**Verification:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected output: 14 tables
-- addresses, audit_logs, blog_categories, blog_posts, files,
-- materials, order_items, order_status_history, orders, payments,
-- price_calculations, print_settings, system_settings, users
```

### 2.3 Execute Migration 002 (RLS Policies)
```sql
-- Copy entire content from:
-- axis3-app/supabase/migrations/002_rls_policies.sql

-- Paste into SQL Editor and click "Run"
-- Expected: 30+ RLS policies created
```

**Verification:**
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Expected: 30+ policies across all tables
```

### 2.4 Execute Migration 003 (Seed Data)
```sql
-- Copy entire content from:
-- axis3-app/supabase/migrations/003_seed_data.sql

-- Paste into SQL Editor and click "Run"
-- Expected: Materials, print settings, system settings inserted
```

**Verification:**
```sql
-- Check materials
SELECT code, name, technology FROM materials ORDER BY sort_order;
-- Expected: 9 materials (5 FDM + 4 SLA)

-- Check print settings
SELECT code, name, technology FROM print_settings ORDER BY sort_order;
-- Expected: 7 settings (4 FDM + 3 SLA)

-- Check system settings
SELECT key FROM system_settings ORDER BY key;
-- Expected: 10 settings
```

---

## 📦 STEP 3: CONFIGURE STORAGE

### 3.1 Create STL Files Bucket
```
Supabase Dashboard > Storage > Create Bucket

Bucket Name: stl-files
Public: No (Private)
File size limit: 100 MB
Allowed MIME types: model/stl, application/sla, application/octet-stream
```

### 3.2 Create Thumbnails Bucket
```
Supabase Dashboard > Storage > Create Bucket

Bucket Name: thumbnails
Public: Yes (Public)
File size limit: 5 MB
Allowed MIME types: image/png, image/jpeg, image/webp
```

### 3.3 Apply Storage Policies
```sql
-- Copy entire content from:
-- axis3-app/supabase/migrations/004_storage_config.sql

-- Paste into SQL Editor and click "Run"
-- Expected: 8 storage policies created
```

**Verification:**
```sql
SELECT * FROM storage.buckets;
-- Expected: 2 buckets (stl-files, thumbnails)
```

---

## 🔐 STEP 4: CONFIGURE ENVIRONMENT VARIABLES

### 4.1 Update .env.local
```bash
cd axis3-app
cp .env.local.example .env.local
```

### 4.2 Add Supabase Credentials
```env
# Supabase (Cloud - REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Local PostgreSQL (Docker - for development)
DATABASE_URL=postgresql://axis3_user:axis3_dev_password@postgres:5432/axis3_dev

# Redis (Docker - for development)
REDIS_URL=redis://redis:6379
```

---

## ✅ STEP 5: VERIFICATION

### 5.1 Test Supabase Connection
```bash
# Start Next.js app
npm run dev

# Test health endpoint
curl http://localhost:3000/api/health

# Expected: Supabase connection successful
```

### 5.2 Verify Tables
```sql
-- In Supabase SQL Editor
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected: 14 tables owned by postgres
```

### 5.3 Verify RLS
```sql
-- Check RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected: All tables have rowsecurity = true
```

### 5.4 Verify Seed Data
```sql
-- Materials count
SELECT technology, COUNT(*) as count
FROM materials
WHERE is_active = true
GROUP BY technology;

-- Expected:
-- FDM: 5
-- SLA: 4

-- Print settings count
SELECT technology, COUNT(*) as count
FROM print_settings
WHERE is_active = true
GROUP BY technology;

-- Expected:
-- FDM: 4
-- SLA: 3
```

---

## 🔄 STEP 6: DUAL DATABASE STRATEGY

### Development (Local Docker)
```yaml
Database: PostgreSQL (Docker)
Connection: postgresql://axis3_user:axis3_dev_password@postgres:5432/axis3_dev
Purpose: Local development, fast iteration
```

### Production/Testing (Supabase Cloud)
```yaml
Database: Supabase PostgreSQL
Connection: Via Supabase client (env.ts)
Purpose: Production, testing, collaboration
```

### Switching Between Databases
```typescript
// src/lib/supabase/client.ts
// Automatically uses Supabase based on env.ts configuration

// For local PostgreSQL (direct connection):
// Use pg client with DATABASE_URL

// For Supabase (cloud):
// Use Supabase client with NEXT_PUBLIC_SUPABASE_URL
```

---

## 🚨 TROUBLESHOOTING

### Issue: Migration fails with "relation already exists"
```sql
-- Solution: Drop existing tables
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then re-run migrations
```

### Issue: RLS policies block all access
```sql
-- Solution: Check auth.uid() is set
SELECT auth.uid();

-- If null, you're not authenticated
-- Login via Supabase Auth first
```

### Issue: Storage bucket creation fails
```
Solution: Create buckets via Supabase Dashboard
Storage > New Bucket > Configure settings
Then run storage policies SQL
```

---

## 📊 MIGRATION CHECKLIST

- [ ] Supabase project created
- [ ] Project credentials obtained
- [ ] Migration 001 executed (schema)
- [ ] Migration 002 executed (RLS)
- [ ] Migration 003 executed (seed data)
- [ ] Storage buckets created
- [ ] Migration 004 executed (storage policies)
- [ ] .env.local updated with credentials
- [ ] Connection tested
- [ ] Tables verified (14 tables)
- [ ] RLS verified (enabled on all tables)
- [ ] Seed data verified (9 materials, 7 settings)
- [ ] Storage buckets verified (2 buckets)

---

## 📚 REFERENCES

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Storage](https://supabase.com/docs/guides/storage)

---

**Migration Guide Version:** 1.0  
**Last Updated:** 2026-04-17  
**Status:** Ready for Execution
