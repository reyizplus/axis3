-- Migration: Add quantity discount tiers to global_settings
-- Allows admin to configure volume discount rules from admin panel

INSERT INTO public.global_settings (key, value, description, category)
VALUES (
  'quantity_discounts',
  jsonb_build_object(
    'tiers', jsonb_build_array(
      jsonb_build_object('minQty', 5, 'discountPercent', 5),
      jsonb_build_object('minQty', 10, 'discountPercent', 10),
      jsonb_build_object('minQty', 20, 'discountPercent', 15)
    )
  ),
  'Adet indirim kademeleri. Her kademe: minQty (minimum adet) ve discountPercent (yüzde indirim)',
  'pricing'
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description;
