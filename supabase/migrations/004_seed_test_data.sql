-- ============================================
-- SEED TEST DATA - Run in Supabase SQL Editor
-- Creates test users with password auth (no SMS needed)
-- Password for all accounts: Test1234!
-- ============================================

-- Create test auth users using email format: {phone_without_plus}@mamamboga.test
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  phone,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '254700000001@mamamboga.test',
    crypt('Test1234!', gen_salt('bf')),
    NOW(), '+254700000001', NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, 'authenticated', 'authenticated'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '254700000002@mamamboga.test',
    crypt('Test1234!', gen_salt('bf')),
    NOW(), '+254700000002', NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, 'authenticated', 'authenticated'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '254700000003@mamamboga.test',
    crypt('Test1234!', gen_salt('bf')),
    NOW(), '+254700000003', NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, 'authenticated', 'authenticated'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    '254700000004@mamamboga.test',
    crypt('Test1234!', gen_salt('bf')),
    NOW(), '+254700000004', NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, 'authenticated', 'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- Create identities for each user
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at
) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   '{"sub":"00000000-0000-0000-0000-000000000001","email":"254700000001@mamamboga.test"}',
   'email', '254700000001@mamamboga.test', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
   '{"sub":"00000000-0000-0000-0000-000000000002","email":"254700000002@mamamboga.test"}',
   'email', '254700000002@mamamboga.test', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003',
   '{"sub":"00000000-0000-0000-0000-000000000003","email":"254700000003@mamamboga.test"}',
   'email', '254700000003@mamamboga.test', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004',
   '{"sub":"00000000-0000-0000-0000-000000000004","email":"254700000004@mamamboga.test"}',
   'email', '254700000004@mamamboga.test', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create profiles
INSERT INTO profiles (id, phone, full_name, role, is_approved) VALUES
  ('00000000-0000-0000-0000-000000000001', '+254700000001', 'Admin User',    'admin',    true),
  ('00000000-0000-0000-0000-000000000002', '+254700000002', 'Jane Seller',   'seller',   true),
  ('00000000-0000-0000-0000-000000000003', '+254700000003', 'John Customer', 'customer', true),
  ('00000000-0000-0000-0000-000000000004', '+254700000004', 'Mike Rider',    'rider',    true)
ON CONFLICT (id) DO NOTHING;

-- Seed categories
INSERT INTO categories (name, description, icon, is_active) VALUES
  ('Fresh Produce',       'Vegetables and greens',       'carrot', true),
  ('Fruits',              'Fresh fruits',                'apple',  true),
  ('Dairy',               'Milk and dairy products',     'milk',   true),
  ('Meat & Poultry',      'Fresh meat and poultry',      'beef',   true),
  ('Grains & Cereals',    'Rice, maize, wheat products', 'wheat',  true),
  ('Spices & Condiments', 'Herbs, spices and sauces',    'flame',  true),
  ('Root Crops',          'Potatoes, sweet potatoes',    'root',   true),
  ('Legumes',             'Beans, peas, lentils',        'seed',   true)
ON CONFLICT DO NOTHING;

-- Seed products
DO $$
DECLARE
  seller_id UUID := '00000000-0000-0000-0000-000000000002';
  cat_produce UUID; cat_fruits UUID; cat_dairy UUID; cat_grains UUID;
BEGIN
  SELECT id INTO cat_produce FROM categories WHERE name = 'Fresh Produce'   LIMIT 1;
  SELECT id INTO cat_fruits  FROM categories WHERE name = 'Fruits'          LIMIT 1;
  SELECT id INTO cat_dairy   FROM categories WHERE name = 'Dairy'           LIMIT 1;
  SELECT id INTO cat_grains  FROM categories WHERE name = 'Grains & Cereals' LIMIT 1;

  INSERT INTO products (seller_id, category_id, name, description, price, discount_price, unit_type, stock_quantity, is_available) VALUES
    (seller_id, cat_produce, 'Fresh Tomatoes',  'Ripe red tomatoes',        150, 120, 'kg',    50, true),
    (seller_id, cat_produce, 'Sukuma Wiki',      'Fresh kale',               60,  NULL,'bunch', 80, true),
    (seller_id, cat_produce, 'Spinach',          'Tender baby spinach',      50,  NULL,'bunch', 60, true),
    (seller_id, cat_produce, 'Onions',           'Red onions',              120,  NULL,'kg',    40, true),
    (seller_id, cat_produce, 'Cabbage',          'Fresh green cabbage',      80,  NULL,'piece', 30, true),
    (seller_id, cat_fruits,  'Bananas',          'Sweet ripe bananas',       80,  60,  'bunch', 25, true),
    (seller_id, cat_fruits,  'Mangoes',          'Juicy Ngowe mangoes',     200, 160, 'kg',    20, true),
    (seller_id, cat_fruits,  'Avocados',         'Creamy Hass avocados',    250,  NULL,'kg',    15, true),
    (seller_id, cat_dairy,   'Fresh Milk',       'Farm fresh whole milk',   100,  NULL,'litre', 40, true),
    (seller_id, cat_grains,  'Unga wa Ugali',    'Finely ground maize flour',130, NULL,'kg',   100, true),
    (seller_id, cat_grains,  'Rice (Pishori)',   'Premium Pishori rice',    220, 200, 'kg',    60, true)
  ON CONFLICT DO NOTHING;
END $$;

-- Delivery address for test customer
INSERT INTO addresses (user_id, name, phone, street_address, landmark, is_default)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'Home', '+254700000003', 'Umoja Estate, Nairobi', 'Near Umoja Market', true
) ON CONFLICT DO NOTHING;
