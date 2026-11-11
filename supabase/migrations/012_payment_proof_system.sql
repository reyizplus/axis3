-- Migration: Payment Proof System
-- Description: Add payment proof upload functionality for bank transfer orders
-- Date: 2026-04-19

-- Add payment proof columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_confirmed_by UUID REFERENCES auth.users(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_proof ON orders(payment_proof_url) WHERE payment_proof_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_payment_confirmed ON orders(payment_confirmed_at) WHERE payment_confirmed_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN orders.payment_proof_url IS 'URL to uploaded payment proof document (dekont) for bank transfer payments';
COMMENT ON COLUMN orders.payment_confirmed_at IS 'Timestamp when admin confirmed the payment';
COMMENT ON COLUMN orders.payment_confirmed_by IS 'Admin user ID who confirmed the payment';
