-- ============================================
-- Migration 078: Cart System
-- Creates carts and cart_items tables for
-- database-backed shopping cart
-- ============================================

-- ============================================
-- 1. CARTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One active cart per user constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);

COMMENT ON TABLE public.carts IS 'Shopping carts - one active cart per user';
COMMENT ON COLUMN public.carts.user_id IS 'Owner of the cart';
COMMENT ON COLUMN public.carts.updated_at IS 'Last modification time';

-- ============================================
-- 2. CART_ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  volume_cm3 NUMERIC,
  material_id TEXT NOT NULL,
  material_name TEXT NOT NULL,
  print_setting_id TEXT NOT NULL,
  print_setting_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  estimated_time NUMERIC DEFAULT 0,
  technology TEXT CHECK (technology IN ('FDM', 'SLA')),
  color TEXT DEFAULT 'Natural',
  nozzle_size_id TEXT,
  nozzle_size_mm NUMERIC,
  is_preorder BOOLEAN DEFAULT FALSE,
  preorder_discount_percent NUMERIC,
  estimated_restock_days INTEGER DEFAULT 0,
  custom_layer_height NUMERIC,
  custom_infill_percentage NUMERIC,
  custom_time_multiplier NUMERIC,
  custom_layer_thickness NUMERIC,
  custom_exposure_time NUMERIC,
  delivery_days INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for cart_items
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_file_id ON public.cart_items(file_id);

COMMENT ON TABLE public.cart_items IS 'Individual items within a shopping cart';
COMMENT ON COLUMN public.cart_items.file_id IS 'Reference to the uploaded 3D model file';
COMMENT ON COLUMN public.cart_items.cart_id IS 'Parent cart reference';

-- ============================================
-- 3. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can insert own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can update own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can delete own cart" ON public.carts;
DROP POLICY IF EXISTS "Admins can view all carts" ON public.carts;

DROP POLICY IF EXISTS "Users can view own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can insert own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Admins can view all cart items" ON public.cart_items;

-- Carts policies
CREATE POLICY "Users can view own cart"
  ON public.carts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart"
  ON public.carts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart"
  ON public.carts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart"
  ON public.carts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all carts"
  ON public.carts FOR SELECT
  USING (is_admin());

-- Cart items policies
CREATE POLICY "Users can view own cart items"
  ON public.cart_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.carts WHERE id = cart_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert own cart items"
  ON public.cart_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.carts WHERE id = cart_id AND user_id = auth.uid()));

CREATE POLICY "Users can update own cart items"
  ON public.cart_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.carts WHERE id = cart_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete own cart items"
  ON public.cart_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.carts WHERE id = cart_id AND user_id = auth.uid()));

CREATE POLICY "Admins can view all cart items"
  ON public.cart_items FOR SELECT
  USING (is_admin());

-- ============================================
-- 4. TRIGGER: Ensure one cart per user
-- ============================================
CREATE OR REPLACE FUNCTION public.ensure_single_cart()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- If the user already has a cart, return existing one instead of creating new
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM public.carts WHERE user_id = NEW.user_id AND id != NEW.id) THEN
      -- Delete the duplicate we're about to insert
      -- Actually let's just update the existing cart's timestamp and return that
      UPDATE public.carts SET updated_at = NOW() WHERE user_id = NEW.user_id AND id != NEW.id;
      RETURN NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_single_cart ON public.carts;
CREATE TRIGGER trg_ensure_single_cart
  BEFORE INSERT ON public.carts
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_cart();

-- ============================================
-- 5. TRIGGER: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_cart_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.carts SET updated_at = NOW() WHERE id = NEW.cart_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_cart_timestamp ON public.cart_items;
CREATE TRIGGER trg_update_cart_timestamp
  AFTER INSERT OR UPDATE OR DELETE ON public.cart_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cart_timestamp();
