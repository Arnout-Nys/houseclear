create extension if not exists pgcrypto;

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  floor text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  title text not null,
  description text,
  photo_url text,
  destination text not null default 'undecided'
    check (destination in ('undecided','family','sell','donate','clearance','recycle','trash')),
  assigned_member_id uuid references members(id) on delete set null,
  status text not null default 'open' check (status in ('open','decided','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists votes (
  item_id uuid not null references items(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  level text not null check (level in ('want','maybe','no')),
  updated_at timestamptz not null default now(),
  primary key (item_id, member_id)
);

create index if not exists idx_items_room on items(room_id);
create index if not exists idx_items_destination on items(destination);
create index if not exists idx_votes_item on votes(item_id);

insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do update set public = true;

-- The MVP accesses Supabase only through Vercel server routes using the service role key.
-- Browser clients never receive the service role key.
