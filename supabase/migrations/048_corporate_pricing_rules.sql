-- ============================================
-- MIGRATION 048: CORPORATE PRICING RULES
-- Date: 2026-04-23
-- Description: Corporate user pricing discounts and rules
-- Features:
--   - Base discount percentage (default 5%)
--   - Volume tier multiplier (1.5x on quantity discounts)
--   - Minimum order value threshold
--   - Monthly volume bonus tracking
--   - Custom rules per corporate user
-- ============================================

-- ============================================
-- TABLE: corporate_pricing_rules
-- ============================================
CREATE TABLE IF NOT EXISTS corporate_pricing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Discount Configuration
    base_discount_percentage DECIMAL(5, 2) DEFAULT 5.0 CHECK (base_discount_percentage >= 0 AND base_discount_percentage <= 50),
    volume_tier_multiplier DECIMAL(5, 2) DEFAULT 1.5 CHECK (volume_tier_multiplier >= 1.0 AND volume_tier_multiplier <= 3.0),
    minimum_order_value DECIMAL(10, 2) DEFAULT 500.0,
    
    -- Bonus Features
    monthly_volume_bonus BOOLEAN DEFAULT TRUE,
    monthly_volume_threshold INTEGER DEFAULT 10, -- Orders per month for bonus
    monthly_bonus_percentage DECIMAL(5, 2) DEFAULT 3.0,
    
    -- Custom Rules (JSONB for flexibility)
    custom_rules JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_pricing UNIQUE(user_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_corporate_pricing_user_id ON corporate_pricing_rules(user_id);
CREATE INDEX idx_corporate_pricing_active ON corporate_pricing_rules(is_active) WHERE is_active = TRUE;

-- ============================================
-- TRIGGER: Auto-create pricing rules for corporate users
-- ============================================
CREATE OR REPLACE FUNCTION create_corporate_pricing_rules()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create if user is corporate and rules don't exist
    IF NEW.is_corporate = TRUE THEN
        INSERT INTO corporate_pricing_rules (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_corporate_user_created ON users;

-- Create trigger
CREATE TRIGGER on_corporate_user_created
    AFTER INSERT OR UPDATE OF is_corporate ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_corporate_pricing_rules();

-- ============================================
-- FUNCTION: Get corporate discount for user
-- ============================================
CREATE OR REPLACE FUNCTION get_corporate_discount(
    p_user_id UUID,
    p_base_price DECIMAL
)
RETURNS TABLE(
    discount_amount DECIMAL,
    discount_percentage DECIMAL,
    has_volume_bonus BOOLEAN
) AS $$
DECLARE
    v_rules RECORD;
    v_monthly_orders INTEGER;
    v_discount DECIMAL := 0;
    v_percentage DECIMAL := 0;
    v_has_bonus BOOLEAN := FALSE;
BEGIN
    -- Get pricing rules
    SELECT * INTO v_rules
    FROM corporate_pricing_rules
    WHERE user_id = p_user_id
    AND is_active = TRUE;
    
    -- If no rules found, return zero discount
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0::DECIMAL, 0::DECIMAL, FALSE;
        RETURN;
    END IF;
    
    -- Calculate base discount
    v_discount := p_base_price * (v_rules.base_discount_percentage / 100);
    v_percentage := v_rules.base_discount_percentage;
    
    -- Check monthly volume bonus
    IF v_rules.monthly_volume_bonus THEN
        -- Count orders in current month
        SELECT COUNT(*) INTO v_monthly_orders
        FROM orders
        WHERE user_id = p_user_id
        AND status IN ('payment_received', 'preparing', 'printing', 'quality_check', 'packaging', 'shipped', 'delivered')
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE);
        
        -- Apply bonus if threshold met
        IF v_monthly_orders >= v_rules.monthly_volume_threshold THEN
            v_discount := v_discount + (p_base_price * (v_rules.monthly_bonus_percentage / 100));
            v_percentage := v_percentage + v_rules.monthly_bonus_percentage;
            v_has_bonus := TRUE;
        END IF;
    END IF;
    
    RETURN QUERY SELECT v_discount, v_percentage, v_has_bonus;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get corporate stats for dashboard
-- ============================================
CREATE OR REPLACE FUNCTION get_corporate_stats(p_user_id UUID)
RETURNS TABLE(
    total_orders INTEGER,
    monthly_orders INTEGER,
    total_spending DECIMAL,
    monthly_spending DECIMAL,
    total_savings DECIMAL,
    average_order_value DECIMAL,
    volume_bonus_active BOOLEAN
) AS $$
DECLARE
    v_rules RECORD;
BEGIN
    -- Get pricing rules
    SELECT * INTO v_rules
    FROM corporate_pricing_rules
    WHERE user_id = p_user_id
    AND is_active = TRUE;
    
    RETURN QUERY
    SELECT
        -- Total orders
        COUNT(*)::INTEGER,
        
        -- Monthly orders
        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE))::INTEGER,
        
        -- Total spending
        COALESCE(SUM(total_amount), 0),
        
        -- Monthly spending
        COALESCE(SUM(total_amount) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)), 0),
        
        -- Total savings (estimated from discount_amount)
        COALESCE(SUM(discount_amount), 0),
        
        -- Average order value
        COALESCE(AVG(total_amount), 0),
        
        -- Volume bonus active
        CASE 
            WHEN v_rules.monthly_volume_bonus 
                AND COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) >= v_rules.monthly_volume_threshold
            THEN TRUE
            ELSE FALSE
        END
    FROM orders
    WHERE user_id = p_user_id
    AND status NOT IN ('cancelled', 'refunded');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON corporate_pricing_rules TO authenticated;
GRANT EXECUTE ON FUNCTION get_corporate_discount(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_corporate_stats(UUID) TO authenticated;

-- Admin can manage all rules
GRANT ALL ON corporate_pricing_rules TO service_role;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE corporate_pricing_rules IS 'Pricing rules and discounts for corporate users';
COMMENT ON COLUMN corporate_pricing_rules.base_discount_percentage IS 'Base discount percentage (default 5%)';
COMMENT ON COLUMN corporate_pricing_rules.volume_tier_multiplier IS 'Multiplier for quantity discounts (default 1.5x)';
COMMENT ON COLUMN corporate_pricing_rules.monthly_volume_bonus IS 'Enable monthly volume bonus (default TRUE)';
COMMENT ON FUNCTION get_corporate_discount(UUID, DECIMAL) IS 'Calculate corporate discount for a given price';
COMMENT ON FUNCTION get_corporate_stats(UUID) IS 'Get corporate user statistics for dashboard';

-- ============================================
-- SEED DATA: Default rules for existing corporate users
-- ============================================
INSERT INTO corporate_pricing_rules (user_id)
SELECT id FROM users WHERE is_corporate = TRUE
ON CONFLICT (user_id) DO NOTHING;
