-- Migration: Create store_cart_items table
-- Persists store cart items per user for admin panel visibility

CREATE TABLE IF NOT EXISTS public.store_cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    product_name TEXT NOT NULL,
    product_slug TEXT NOT NULL,
    image_url TEXT,
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_cart_items_user_id ON public.store_cart_items(user_id);

ALTER TABLE public.store_cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own store cart items"
    ON public.store_cart_items FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read store cart items"
    ON public.store_cart_items FOR SELECT
    USING (public.is_admin());
