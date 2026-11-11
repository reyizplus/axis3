-- Migration: Add missing order_items columns for checkout
-- Description: Adds columns that checkout page tries to insert but are missing from the schema
-- Date: 2026-06-10

ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS print_setting_id UUID REFERENCES print_settings(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS volume_cm3 DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS estimated_print_hours DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS custom_layer_thickness DECIMAL(6,3),
    ADD COLUMN IF NOT EXISTS custom_exposure_time DECIMAL(6,2);

CREATE INDEX IF NOT EXISTS idx_order_items_material_id ON order_items(material_id);
CREATE INDEX IF NOT EXISTS idx_order_items_print_setting_id ON order_items(print_setting_id);
