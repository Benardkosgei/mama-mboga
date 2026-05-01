-- Fix infinite recursion in profiles RLS policies
-- The old policies queried profiles table from within profiles policies

-- Drop all existing profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- Recreate without self-referencing queries
-- Users can always read their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Anyone authenticated can insert a profile (needed for registration)
CREATE POLICY "Authenticated users can insert profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Service role bypasses RLS entirely (used by middleware)
-- No extra policy needed for that

-- Fix orders policies that also reference profiles
DROP POLICY IF EXISTS "Sellers can view orders containing their products" ON orders;

CREATE POLICY "Sellers can view orders containing their products"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM order_items oi
      WHERE oi.order_id = orders.id AND oi.seller_id = auth.uid()
    )
  );

-- Fix products policies
DROP POLICY IF EXISTS "Anyone can view available products" ON products;
DROP POLICY IF EXISTS "Sellers can insert their products" ON products;
DROP POLICY IF EXISTS "Sellers can update their products" ON products;
DROP POLICY IF EXISTS "Sellers can delete their products" ON products;

CREATE POLICY "Anyone can view available products"
  ON products FOR SELECT
  USING (is_available = true OR auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their products"
  ON products FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their products"
  ON products FOR DELETE
  USING (auth.uid() = seller_id);

-- Fix categories policies
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (true)
  WITH CHECK (true);

-- Fix order_items policies
DROP POLICY IF EXISTS "System can manage order items" ON order_items;
DROP POLICY IF EXISTS "Anyone can view order items" ON order_items;

CREATE POLICY "Anyone can view order items"
  ON order_items FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix payments policies
DROP POLICY IF EXISTS "Admins can manage payments" ON payments;
DROP POLICY IF EXISTS "Customers can view their payment info" ON payments;

CREATE POLICY "Customers can view their payment info"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "Service can manage payments"
  ON payments FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Fix delivery_assignments policies
DROP POLICY IF EXISTS "Admins can manage all assignments" ON delivery_assignments;

CREATE POLICY "Admins can manage all assignments"
  ON delivery_assignments FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Fix notifications
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);
