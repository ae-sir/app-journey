-- Run this in the Supabase SQL Editor (https://app.supabase.com → your project → SQL Editor)

CREATE TABLE IF NOT EXISTS expenses (
  id          UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT           NOT NULL,
  amount      NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  category    TEXT           NOT NULL,
  subcategory TEXT,
  created_at  TIMESTAMPTZ    DEFAULT NOW()
);

-- If the table already exists without subcategory, run this line to add the column:
-- ALTER TABLE expenses ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Allow all operations using the public anon key.
-- This is fine for a learning project. In a real app you would
-- scope policies to authenticated users (auth.uid()).
CREATE POLICY "public_full_access" ON expenses
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant table-level privileges to the anon and authenticated roles.
-- RLS controls which rows they can access; GRANT controls whether they
-- can touch the table at all. Both layers must be present.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.expenses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.expenses TO authenticated;
