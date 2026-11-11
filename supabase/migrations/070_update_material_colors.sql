-- Migration: Update material colors arrays
-- Description: Populates colors[] JSONB for all seed materials with proper color options
-- Date: 2026-06-10

-- Update FDM materials with proper color arrays
UPDATE materials SET colors = '["Beyaz","Siyah","Kırmızı","Mavi","Yeşil","Sarı","Turuncu","Mor","Gri","Şeffaf","Doğal"]'::jsonb WHERE code = 'PLA' AND (colors IS NULL OR colors = '[]'::jsonb OR jsonb_array_length(colors) <= 1);

UPDATE materials SET colors = '["Siyah","Beyaz","Gri","Kırmızı","Mavi"]'::jsonb WHERE code = 'ABS' AND (colors IS NULL OR colors = '[]'::jsonb OR jsonb_array_length(colors) <= 1);

UPDATE materials SET colors = '["Şeffaf","Beyaz","Siyah","Mavi","Kırmızı"]'::jsonb WHERE code = 'PETG' AND (colors IS NULL OR colors = '[]'::jsonb OR jsonb_array_length(colors) <= 1);

UPDATE materials SET colors = '["Kırmızı","Beyaz","Siyah","Mavi","Yeşil"]'::jsonb WHERE code = 'TPU' AND (colors IS NULL OR colors = '[]'::jsonb OR jsonb_array_length(colors) <= 1);

UPDATE materials SET colors = '["Gri","Beyaz","Siyah"]'::jsonb WHERE code = 'ASA' AND (colors IS NULL OR colors = '[]'::jsonb OR jsonb_array_length(colors) <= 1);

-- Update SLA materials with proper color arrays
UPDATE materials SET colors = '["Beyaz","Gri","Siyah"]'::jsonb WHERE code = 'RESIN_STANDARD' AND (colors IS NULL OR colors = '[]'::jsonb OR jsonb_array_length(colors) <= 1);

UPDATE materials SET colors = '["Şeffaf"]'::jsonb WHERE code = 'RESIN_CLEAR' AND (colors IS NULL OR colors = '[]'::jsonb OR jsonb_array_length(colors) <= 1);

UPDATE materials SET colors = '["Gri","Siyah"]'::jsonb WHERE code = 'RESIN_TOUGH' AND (colors IS NULL OR colors = '[]'::jsonb OR jsonb_array_length(colors) <= 1);

UPDATE materials SET colors = '["Siyah","Gri"]'::jsonb WHERE code = 'RESIN_ENGINEERING' AND (colors IS NULL OR colors = '[]'::jsonb OR jsonb_array_length(colors) <= 1);
