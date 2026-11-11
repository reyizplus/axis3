-- ============================================
-- AXIS3 - ADD COLORS ARRAY TO MATERIALS
-- Version: 1.0
-- Date: 2026-04-22
-- Description: Add colors JSONB array column to materials table
-- ============================================

-- Add colors column as JSONB array
ALTER TABLE materials
ADD COLUMN colors JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN materials.colors IS 'Available colors for this material as JSON array (e.g., ["Natural", "Black", "White"])';

-- Migrate existing color data to colors array
UPDATE materials
SET colors = jsonb_build_array(color)
WHERE color IS NOT NULL AND color != '';

-- Update materials without color to have empty array
UPDATE materials
SET colors = '[]'::jsonb
WHERE colors IS NULL;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Columns Added: 1 (colors JSONB)
-- Data Migration: Existing color values migrated to colors array
-- ============================================
