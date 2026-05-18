-- Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor)

create table wardrobe_items (
  id          uuid        default gen_random_uuid() primary key,
  filename    text        not null,
  item_type   text        not null,
  colour      text,
  tags        text[]      default '{}',
  created_at  timestamptz default now()
);

-- Grant the anon and authenticated roles access to the table
grant all on table wardrobe_items to anon;
grant all on table wardrobe_items to authenticated;
