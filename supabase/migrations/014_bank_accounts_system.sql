-- ============================================
-- MIGRATION 014: Bank Accounts System
-- Date: 2026-04-20
-- Description: Dynamic bank account management system with multi-account support
-- ============================================

-- Create bank_accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_name VARCHAR(100) NOT NULL,
  account_holder VARCHAR(255) NOT NULL,
  iban VARCHAR(34) NOT NULL,
  branch_name VARCHAR(100),
  branch_code VARCHAR(20),
  account_number VARCHAR(50),
  swift_code VARCHAR(11),
  currency VARCHAR(3) DEFAULT 'TRY',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE bank_accounts IS 'Bank accounts for EFT/Havale payments. Supports multiple accounts with ordering.';
COMMENT ON COLUMN bank_accounts.bank_name IS 'Name of the bank (e.g., Ziraat Bankası, Garanti BBVA)';
COMMENT ON COLUMN bank_accounts.account_holder IS 'Account holder name (company or individual)';
COMMENT ON COLUMN bank_accounts.iban IS 'International Bank Account Number (IBAN)';
COMMENT ON COLUMN bank_accounts.is_active IS 'Whether this account is currently active and should be displayed to users';
COMMENT ON COLUMN bank_accounts.display_order IS 'Order in which accounts should be displayed (lower numbers first)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_display_order ON bank_accounts(display_order);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_created_at ON bank_accounts(created_at DESC);

-- Enable RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public can view active bank accounts (for payment pages)
DROP POLICY IF EXISTS "Anyone can view active bank accounts" ON bank_accounts;
CREATE POLICY "Anyone can view active bank accounts"
ON bank_accounts FOR SELECT
USING (is_active = true);

-- Admins can view all bank accounts (including inactive)
DROP POLICY IF EXISTS "Admins can view all bank accounts" ON bank_accounts;
CREATE POLICY "Admins can view all bank accounts"
ON bank_accounts FOR SELECT
USING (is_admin());

-- Admins can insert bank accounts
DROP POLICY IF EXISTS "Admins can insert bank accounts" ON bank_accounts;
CREATE POLICY "Admins can insert bank accounts"
ON bank_accounts FOR INSERT
WITH CHECK (is_admin());

-- Admins can update bank accounts
DROP POLICY IF EXISTS "Admins can update bank accounts" ON bank_accounts;
CREATE POLICY "Admins can update bank accounts"
ON bank_accounts FOR UPDATE
USING (is_admin());

-- Admins can delete bank accounts
DROP POLICY IF EXISTS "Admins can delete bank accounts" ON bank_accounts;
CREATE POLICY "Admins can delete bank accounts"
ON bank_accounts FOR DELETE
USING (is_admin());

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER update_bank_accounts_updated_at 
BEFORE UPDATE ON bank_accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed data: Insert default bank account
INSERT INTO bank_accounts (
  bank_name, 
  account_holder, 
  iban,
  currency,
  is_active,
  display_order,
  notes
) VALUES (
  'Ziraat Bankası',
  'AXIS3 TEKNOLOJİ A.Ş.',
  'TR33 0001 0000 0000 0000 0000 01',
  'TRY',
  true,
  1,
  'Primary business account for customer payments'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get active bank accounts ordered by display_order
CREATE OR REPLACE FUNCTION get_active_bank_accounts()
RETURNS TABLE (
  id UUID,
  bank_name VARCHAR(100),
  account_holder VARCHAR(255),
  iban VARCHAR(34),
  branch_name VARCHAR(100),
  branch_code VARCHAR(20),
  account_number VARCHAR(50),
  swift_code VARCHAR(11),
  currency VARCHAR(3),
  display_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ba.id,
    ba.bank_name,
    ba.account_holder,
    ba.iban,
    ba.branch_name,
    ba.branch_code,
    ba.account_number,
    ba.swift_code,
    ba.currency,
    ba.display_order
  FROM bank_accounts ba
  WHERE ba.is_active = true
  ORDER BY ba.display_order ASC, ba.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_active_bank_accounts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_bank_accounts() TO anon;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify table exists
-- SELECT table_name, table_type 
-- FROM information_schema.tables 
-- WHERE table_name = 'bank_accounts';

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'bank_accounts';

-- Verify policies exist
-- SELECT policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'bank_accounts';

-- Verify seed data
-- SELECT * FROM bank_accounts ORDER BY display_order;

-- Test helper function
-- SELECT * FROM get_active_bank_accounts();
