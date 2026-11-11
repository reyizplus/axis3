-- ============================================
-- MIGRATION 051: Payment Gateway Management System
-- Date: 2026-04-23
-- Description: Dynamic payment gateway configuration with admin controls
-- ============================================

-- Create payment_gateways table
CREATE TABLE IF NOT EXISTS payment_gateways (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gateway_type TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  icon_name TEXT,
  configuration JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE payment_gateways IS 'Payment gateway configuration for dynamic payment method management';
COMMENT ON COLUMN payment_gateways.gateway_type IS 'Unique identifier for gateway type (iyzico, bank_transfer, etc.)';
COMMENT ON COLUMN payment_gateways.display_name IS 'User-facing name displayed in checkout';
COMMENT ON COLUMN payment_gateways.is_enabled IS 'Whether this gateway is currently active and available to users';
COMMENT ON COLUMN payment_gateways.display_order IS 'Order in which gateways are displayed (lower numbers first)';
COMMENT ON COLUMN payment_gateways.configuration IS 'Gateway-specific configuration (API keys, settings, etc.)';
COMMENT ON COLUMN payment_gateways.metadata IS 'Additional metadata (supported features, limits, etc.)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_gateways_enabled ON payment_gateways(is_enabled);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_display_order ON payment_gateways(display_order);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_type ON payment_gateways(gateway_type);

-- Enable RLS
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public can view enabled gateways (for checkout page)
DROP POLICY IF EXISTS "Anyone can view enabled payment gateways" ON payment_gateways;
CREATE POLICY "Anyone can view enabled payment gateways"
ON payment_gateways FOR SELECT
USING (is_enabled = true);

-- Admins can view all gateways
DROP POLICY IF EXISTS "Admins can view all payment gateways" ON payment_gateways;
CREATE POLICY "Admins can view all payment gateways"
ON payment_gateways FOR SELECT
USING (is_admin());

-- Admins can insert gateways
DROP POLICY IF EXISTS "Admins can insert payment gateways" ON payment_gateways;
CREATE POLICY "Admins can insert payment gateways"
ON payment_gateways FOR INSERT
WITH CHECK (is_admin());

-- Admins can update gateways
DROP POLICY IF EXISTS "Admins can update payment gateways" ON payment_gateways;
CREATE POLICY "Admins can update payment gateways"
ON payment_gateways FOR UPDATE
USING (is_admin());

-- Admins can delete gateways
DROP POLICY IF EXISTS "Admins can delete payment gateways" ON payment_gateways;
CREATE POLICY "Admins can delete payment gateways"
ON payment_gateways FOR DELETE
USING (is_admin());

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_payment_gateways_updated_at ON payment_gateways;
CREATE TRIGGER update_payment_gateways_updated_at 
BEFORE UPDATE ON payment_gateways
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA: Default Payment Gateways
-- ============================================

-- Insert iyzico gateway
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
  configuration = EXCLUDED.configuration,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- Insert bank_transfer gateway
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
  configuration = EXCLUDED.configuration,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- ============================================
-- PAYMENT GATEWAY AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS payment_gateway_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gateway_id UUID REFERENCES payment_gateways(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE payment_gateway_logs IS 'Audit trail for payment gateway configuration changes';
COMMENT ON COLUMN payment_gateway_logs.action IS 'Action performed (enabled, disabled, updated, etc.)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_gateway_logs_gateway_id ON payment_gateway_logs(gateway_id);
CREATE INDEX IF NOT EXISTS idx_payment_gateway_logs_created_at ON payment_gateway_logs(created_at DESC);

-- Enable RLS
ALTER TABLE payment_gateway_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can view logs
DROP POLICY IF EXISTS "Admins can view payment gateway logs" ON payment_gateway_logs;
CREATE POLICY "Admins can view payment gateway logs"
ON payment_gateway_logs FOR SELECT
USING (is_admin());

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get enabled payment gateways ordered by display_order
CREATE OR REPLACE FUNCTION get_enabled_payment_gateways()
RETURNS TABLE (
  id UUID,
  gateway_type TEXT,
  display_name TEXT,
  description TEXT,
  display_order INTEGER,
  icon_name TEXT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg.id,
    pg.gateway_type,
    pg.display_name,
    pg.description,
    pg.display_order,
    pg.icon_name,
    pg.metadata
  FROM payment_gateways pg
  WHERE pg.is_enabled = true
  ORDER BY pg.display_order ASC, pg.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_enabled_payment_gateways() TO authenticated;
GRANT EXECUTE ON FUNCTION get_enabled_payment_gateways() TO anon;

-- Function to check if any payment gateway is enabled
CREATE OR REPLACE FUNCTION has_enabled_payment_gateways()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM payment_gateways WHERE is_enabled = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION has_enabled_payment_gateways() TO authenticated;
GRANT EXECUTE ON FUNCTION has_enabled_payment_gateways() TO anon;

-- Function to log gateway changes
CREATE OR REPLACE FUNCTION log_payment_gateway_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log only if is_enabled changed
    IF OLD.is_enabled != NEW.is_enabled THEN
      INSERT INTO payment_gateway_logs (
        gateway_id,
        action,
        performed_by,
        old_value,
        new_value
      ) VALUES (
        NEW.id,
        CASE WHEN NEW.is_enabled THEN 'enabled' ELSE 'disabled' END,
        auth.uid(),
        jsonb_build_object('is_enabled', OLD.is_enabled),
        jsonb_build_object('is_enabled', NEW.is_enabled)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for logging
DROP TRIGGER IF EXISTS payment_gateway_change_log ON payment_gateways;
CREATE TRIGGER payment_gateway_change_log
AFTER UPDATE ON payment_gateways
FOR EACH ROW
EXECUTE FUNCTION log_payment_gateway_change();

-- ============================================
-- UPDATE ORDERS TABLE
-- ============================================

-- Add index for payment method queries (no constraint to allow flexibility)
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);

-- Note: We intentionally do NOT add a CHECK constraint on payment_method
-- to allow backward compatibility and flexibility for future payment methods

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify payment_gateways table exists
-- SELECT table_name, table_type FROM information_schema.tables WHERE table_name = 'payment_gateways';

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'payment_gateways';

-- Verify seed data
-- SELECT * FROM payment_gateways ORDER BY display_order;

-- Test helper functions
-- SELECT * FROM get_enabled_payment_gateways();
-- SELECT has_enabled_payment_gateways();

-- Verify audit log table
-- SELECT * FROM payment_gateway_logs ORDER BY created_at DESC LIMIT 10;
