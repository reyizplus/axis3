-- Migration: Payment Integration
-- Description: Add payment-related columns to orders table for iyzico integration
-- Date: 2026-04-19

-- Add payment columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_token TEXT,
ADD COLUMN IF NOT EXISTS payment_error TEXT;

-- Add check constraint for payment_status (drop first if exists)
ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE orders
ADD CONSTRAINT orders_payment_status_check
CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- Create index for payment queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);

-- Add comment
COMMENT ON COLUMN orders.payment_status IS 'Payment status: pending, paid, failed, refunded';
COMMENT ON COLUMN orders.payment_id IS 'iyzico payment ID';
COMMENT ON COLUMN orders.payment_method IS 'Payment method used (credit_card, debit_card, etc)';
COMMENT ON COLUMN orders.payment_date IS 'Date when payment was completed';
COMMENT ON COLUMN orders.payment_token IS 'iyzico payment token for callback';
COMMENT ON COLUMN orders.payment_error IS 'Error message if payment failed';
