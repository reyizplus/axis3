-- ============================================
-- 063: ORDER ITEMS - ADD CUSTOM PARAMS & NOZZLE
-- ============================================

ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS nozzle_size_id UUID REFERENCES nozzle_sizes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS nozzle_size_mm DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS custom_layer_height DECIMAL(5,3),
    ADD COLUMN IF NOT EXISTS custom_infill_percentage INTEGER,
    ADD COLUMN IF NOT EXISTS custom_time_multiplier DECIMAL(4,2),
    ADD COLUMN IF NOT EXISTS estimated_restock_days INTEGER DEFAULT NULL;
