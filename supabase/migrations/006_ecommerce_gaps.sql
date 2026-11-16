-- ============================================================
-- Migration 006: Fill eCommerce gaps
-- ============================================================

-- 1. push_token column on profiles (for Expo push notifications)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_token TEXT;

-- 2. app_settings table (key-value store for admin-configurable settings)
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default support contacts
INSERT INTO app_settings (key, value)
VALUES
  ('support_phone',    '+254754008271'),
  ('support_whatsapp', '254754008271')
ON CONFLICT (key) DO NOTHING;

-- RLS: anyone can read, only admins can write
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_read_all"
  ON app_settings FOR SELECT
  USING (true);

CREATE POLICY "app_settings_admin_write"
  ON app_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. decrement_stock RPC — atomically reduces stock, floors at 0
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_quantity INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products
  SET stock_quantity = GREATEST(0, stock_quantity - p_quantity)
  WHERE id = p_product_id;
END;
$$;

-- 4. Notifications: ensure index on user_id + is_read for fast badge queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read)
  WHERE is_read = false;

-- 5. Payments: index on checkout_request_id for fast callback lookups
CREATE INDEX IF NOT EXISTS idx_payments_checkout_request_id
  ON payments (checkout_request_id);

-- 6. Orders: index on customer_id + status for customer order history
CREATE INDEX IF NOT EXISTS idx_orders_customer_status
  ON orders (customer_id, status);

-- 7. Products: index on seller_id for seller product listings
CREATE INDEX IF NOT EXISTS idx_products_seller_id
  ON products (seller_id);

-- 8. Delivery assignments: index on rider_id + status for rider dashboard
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_rider_status
  ON delivery_assignments (rider_id, status);
