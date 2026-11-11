-- ============================================
-- PAYMENT GATEWAYS DIAGNOSTIC & FIX SCRIPT
-- Date: 2026-04-26
-- Purpose: Check and fix payment gateway configuration
-- ============================================

-- STEP 1: Check if payment_gateways table exists
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_name = 'payment_gateways';

-- Expected: 1 row with table_name = 'payment_gateways'
-- If empty: Migration 051 not applied

-- ============================================
-- STEP 2: Check current gateway status
-- ============================================

SELECT 
  id,
  gateway_type,
  display_name,
  is_enabled,
  display_order,
  created_at
FROM payment_gateways
ORDER BY display_order;

-- Expected: 2 rows (iyzico, bank_transfer)
-- If empty: Seed data not loaded
-- If is_enabled = false: Gateways disabled

-- ============================================
-- STEP 3: Check RPC functions
-- ============================================

-- Check if get_enabled_payment_gateways function exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'get_enabled_payment_gateways';

-- Check if has_enabled_payment_gateways function exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'has_enabled_payment_gateways';

-- Expected: 2 rows (both functions should exist)

-- ============================================
-- STEP 4: Test RPC functions
-- ============================================

-- Test get_enabled_payment_gateways
SELECT * FROM get_enabled_payment_gateways();

-- Test has_enabled_payment_gateways
SELECT has_enabled_payment_gateways();

-- Expected: Should return enabled gateways and true/false

-- ============================================
-- STEP 5: Check RLS policies
-- ============================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'payment_gateways'
ORDER BY policyname;

-- Expected: 5 policies (SELECT for public/admin, INSERT/UPDATE/DELETE for admin)

-- ============================================
-- FIX 1: Enable payment gateways if disabled
-- ============================================

-- Enable iyzico
UPDATE payment_gateways
SET is_enabled = true,
    updated_at = NOW()
WHERE gateway_type = 'iyzico';

-- Enable bank_transfer
UPDATE payment_gateways
SET is_enabled = true,
    updated_at = NOW()
WHERE gateway_type = 'bank_transfer';

-- Verify
SELECT 
  gateway_type,
  display_name,
  is_enabled,
  updated_at
FROM payment_gateways
ORDER BY display_order;

-- ============================================
-- FIX 2: Re-insert seed data if missing
-- ============================================

-- Only run if table is empty
INSERT INTO payment_gateways (
  gateway_type,
  display_name,
  description,
  is_enabled,
  display_order,
  icon_name,
  configuration,
  metadata
) VALUES (
  'iyzico',
  'Kredi Kartı / Banka Kartı',
  'iyzico güvenli ödeme sistemi ile anında ödeme yapın',
  true,
  1,
  'CreditCard',
  '{
    "supports_3d_secure": true,
    "supports_installments": true,
    "max_installments": 12,
    "supported_cards": ["Visa", "Mastercard", "Troy"]
  }'::jsonb,
  '{
    "badge": "Hızlı",
    "badge_color": "green",
    "processing_time": "instant",
    "features": ["3D Secure", "Taksit Seçenekleri", "Anında Onay"]
  }'::jsonb
)
ON CONFLICT (gateway_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  configuration = EXCLUDED.configuration,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO payment_gateways (
  gateway_type,
  display_name,
  description,
  is_enabled,
  display_order,
  icon_name,
  configuration,
  metadata
) VALUES (
  'bank_transfer',
  'EFT / Havale',
  'Banka hesabımıza havale/EFT yaparak ödeme yapın',
  true,
  2,
  'Building2',
  '{
    "requires_manual_verification": true,
    "verification_time_hours": 24
  }'::jsonb,
  '{
    "badge": "Manuel",
    "badge_color": "blue",
    "processing_time": "1-2 iş günü",
    "features": ["Güvenli", "Banka Havalesi", "Manuel Onay"]
  }'::jsonb
)
ON CONFLICT (gateway_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  configuration = EXCLUDED.configuration,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- ============================================
-- VERIFICATION: Final check
-- ============================================

-- Should return 2 enabled gateways
SELECT * FROM get_enabled_payment_gateways();

-- Should return true
SELECT has_enabled_payment_gateways();

-- Should show both gateways enabled
SELECT 
  gateway_type,
  display_name,
  is_enabled,
  display_order
FROM payment_gateways
ORDER BY display_order;

-- ============================================
-- SUMMARY
-- ============================================

-- If all checks pass:
-- ✅ payment_gateways table exists
-- ✅ 2 gateways configured (iyzico, bank_transfer)
-- ✅ Both gateways enabled (is_enabled = true)
-- ✅ RPC functions working
-- ✅ RLS policies in place

-- If issues persist:
-- 1. Check Supabase logs for errors
-- 2. Verify RLS policies allow public SELECT on enabled gateways
-- 3. Check if migration 051 was fully applied
-- 4. Verify service role key has proper permissions
