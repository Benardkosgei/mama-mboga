-- ============================================================
-- Migration 007: Product reviews (idempotent)
-- ============================================================

-- Table: one review per customer per product
CREATE TABLE IF NOT EXISTS product_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, customer_id)
);

-- If the table was created with the old 3-column unique constraint, drop it
-- and add the correct 2-column one (safe to run multiple times).
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_reviews_product_id_customer_id_order_id_key'
      AND conrelid = 'product_reviews'::regclass
  ) THEN
    ALTER TABLE product_reviews
      DROP CONSTRAINT product_reviews_product_id_customer_id_order_id_key;
  END IF;

  -- Add correct constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_reviews_product_id_customer_id_key'
      AND conrelid = 'product_reviews'::regclass
  ) THEN
    ALTER TABLE product_reviews
      ADD CONSTRAINT product_reviews_product_id_customer_id_key
      UNIQUE (product_id, customer_id);
  END IF;
END $$;

-- RLS
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent via DO blocks)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'product_reviews' AND policyname = 'reviews_read_all'
  ) THEN
    CREATE POLICY "reviews_read_all" ON product_reviews FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'product_reviews' AND policyname = 'reviews_insert_own'
  ) THEN
    CREATE POLICY "reviews_insert_own" ON product_reviews FOR INSERT
      WITH CHECK (auth.uid() = customer_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'product_reviews' AND policyname = 'reviews_update_own'
  ) THEN
    CREATE POLICY "reviews_update_own" ON product_reviews FOR UPDATE
      USING (auth.uid() = customer_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'product_reviews' AND policyname = 'reviews_delete_own'
  ) THEN
    CREATE POLICY "reviews_delete_own" ON product_reviews FOR DELETE
      USING (auth.uid() = customer_id);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id
  ON product_reviews (product_id);

CREATE INDEX IF NOT EXISTS idx_product_reviews_customer_product
  ON product_reviews (customer_id, product_id);

-- Rating summary view
CREATE OR REPLACE VIEW product_rating_summary AS
SELECT
  product_id,
  ROUND(AVG(rating)::NUMERIC, 1) AS avg_rating,
  COUNT(*)                        AS review_count
FROM product_reviews
GROUP BY product_id;
