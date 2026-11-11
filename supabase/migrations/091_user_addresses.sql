-- ============================================
-- MIGRATION 091: User Addresses (Saved Addresses)
-- ============================================
-- Creates the addresses table for saved user addresses
-- Used by checkout saved-address-selector and /dashboard/addresses

-- 1. CREATE ADDRESSES TABLE (if not exists)
CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10),
    country VARCHAR(2) DEFAULT 'TR',
    is_default BOOLEAN DEFAULT FALSE,
    address_type VARCHAR(20) DEFAULT 'shipping' CHECK (address_type IN ('shipping', 'billing', 'both')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_default ON addresses(is_default);

-- 3. ENABLE RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES
DO $$
BEGIN
    -- Drop existing policies if any (for idempotency)
    DROP POLICY IF EXISTS "Users can view own addresses" ON addresses;
    DROP POLICY IF EXISTS "Users can insert own addresses" ON addresses;
    DROP POLICY IF EXISTS "Users can update own addresses" ON addresses;
    DROP POLICY IF EXISTS "Users can delete own addresses" ON addresses;
    DROP POLICY IF EXISTS "Admins can view all addresses" ON addresses;

    -- Users can view their own addresses
    CREATE POLICY "Users can view own addresses"
    ON addresses FOR SELECT
    USING (auth.uid() = user_id);

    -- Users can insert their own addresses
    CREATE POLICY "Users can insert own addresses"
    ON addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

    -- Users can update their own addresses
    CREATE POLICY "Users can update own addresses"
    ON addresses FOR UPDATE
    USING (auth.uid() = user_id);

    -- Users can delete their own addresses
    CREATE POLICY "Users can delete own addresses"
    ON addresses FOR DELETE
    USING (auth.uid() = user_id);
END $$;

-- 5. AUTO-UPDATE TRIGGER FOR updated_at
CREATE OR REPLACE FUNCTION update_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_addresses_updated_at ON addresses;
CREATE TRIGGER update_addresses_updated_at
    BEFORE UPDATE ON addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_addresses_updated_at();

-- 6. VERIFICATION
SELECT 'Migration 091: User Addresses' as migration_name,
       CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'addresses')
         THEN '✓ addresses table exists'
         ELSE '✗ addresses table missing'
       END as table_status,
       CASE WHEN EXISTS (SELECT FROM pg_policies WHERE tablename = 'addresses')
         THEN '✓ RLS policies enabled'
         ELSE '✗ RLS policies missing'
       END as rls_status;
