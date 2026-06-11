-- Brew Library initial Supabase foundation.
-- Scope:
--   1. Extensions
--   2. profiles
--   3. user_roles
--   4. grinder reference tables
--   5. espresso machine reference tables
--   6. user_suggested_entries
--   7. Row Level Security on all tables above
--   8. Initial RLS policies only

begin;

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- Shared timestamp helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles and roles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  handle text unique,
  bio text,
  city text,
  region text,
  country text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'moderator')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Admin helper used by RLS policies.
-- SECURITY DEFINER lets policies check roles without recursive RLS failures.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'moderator')
  );
$$;

-- Espresso machine reference data
create table if not exists public.machine_manufacturers (
  id text primary key,
  canonical_name text not null,
  normalized_canonical_name text not null,
  slug text unique,
  country text,
  category_focus text,
  website_url text,
  model_count_from_source integer,
  notes text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint machine_manufacturers_canonical_not_blank check (btrim(canonical_name) <> ''),
  constraint machine_manufacturers_normalized_not_blank check (btrim(normalized_canonical_name) <> '')
);

create trigger set_machine_manufacturers_updated_at
before update on public.machine_manufacturers
for each row
execute function public.set_updated_at();

create table if not exists public.machine_models (
  id text primary key,
  manufacturer_id text not null references public.machine_manufacturers(id) on delete restrict,
  canonical_name text not null,
  display_name text,
  normalized_canonical_name text not null,
  normalized_display_name text,
  slug text,
  category text,
  machine_type text,
  country text,
  lifecycle text,
  home_relevance text,
  is_home_machine boolean not null default true,
  notes text,
  manufacturer_website text,
  source_url text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint machine_models_canonical_not_blank check (btrim(canonical_name) <> ''),
  constraint machine_models_normalized_not_blank check (btrim(normalized_canonical_name) <> ''),
  constraint machine_models_manufacturer_model_unique unique (manufacturer_id, normalized_canonical_name)
);

create trigger set_machine_models_updated_at
before update on public.machine_models
for each row
execute function public.set_updated_at();

create table if not exists public.machine_aliases (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('manufacturer', 'machine_model')),
  entity_id text not null,
  alias_text text not null,
  normalized_alias_text text not null,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint machine_aliases_alias_not_blank check (btrim(alias_text) <> ''),
  constraint machine_aliases_normalized_not_blank check (btrim(normalized_alias_text) <> ''),
  constraint machine_aliases_unique unique (entity_type, entity_id, normalized_alias_text)
);

create trigger set_machine_aliases_updated_at
before update on public.machine_aliases
for each row
execute function public.set_updated_at();

-- Grinder reference data
create table if not exists public.grinder_manufacturers (
  id text primary key,
  canonical_name text not null,
  normalized_canonical_name text not null,
  slug text unique,
  source_url text,
  model_count integer,
  hand_grinder_models integer,
  electric_models integer,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grinder_manufacturers_canonical_not_blank check (btrim(canonical_name) <> ''),
  constraint grinder_manufacturers_normalized_not_blank check (btrim(normalized_canonical_name) <> '')
);

create trigger set_grinder_manufacturers_updated_at
before update on public.grinder_manufacturers
for each row
execute function public.set_updated_at();

create table if not exists public.grinder_models (
  id text primary key,
  manufacturer_id text not null references public.grinder_manufacturers(id) on delete restrict,
  manufacturer_name text,
  canonical_name text not null,
  display_name text,
  normalized_canonical_name text not null,
  normalized_display_name text,
  slug text,
  category text,
  burr_or_burr_size text,
  power_type text,
  primary_use text,
  status text,
  source_url text,
  backend_notes text,
  is_hand_grinder boolean,
  is_electric_grinder boolean,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grinder_models_canonical_not_blank check (btrim(canonical_name) <> ''),
  constraint grinder_models_normalized_not_blank check (btrim(normalized_canonical_name) <> ''),
  constraint grinder_models_manufacturer_model_unique unique (manufacturer_id, normalized_canonical_name)
);

create trigger set_grinder_models_updated_at
before update on public.grinder_models
for each row
execute function public.set_updated_at();

create table if not exists public.grinder_aliases (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('manufacturer', 'grinder_model')),
  entity_id text not null,
  alias_text text not null,
  normalized_alias_text text not null,
  alias_type text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grinder_aliases_alias_not_blank check (btrim(alias_text) <> ''),
  constraint grinder_aliases_normalized_not_blank check (btrim(normalized_alias_text) <> ''),
  constraint grinder_aliases_unique unique (entity_type, entity_id, normalized_alias_text)
);

create trigger set_grinder_aliases_updated_at
before update on public.grinder_aliases
for each row
execute function public.set_updated_at();

-- User/admin suggestion queue for unmatched reference data.
create table if not exists public.user_suggested_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  entity_domain text not null check (entity_domain in ('machine', 'grinder', 'brewer', 'roaster', 'brand')),
  raw_manufacturer_input text,
  raw_model_input text,
  display_name text,
  normalized_text text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'merged', 'rejected')),
  resolution jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_suggested_entries_normalized_not_blank check (btrim(normalized_text) <> '')
);

create trigger set_user_suggested_entries_updated_at
before update on public.user_suggested_entries
for each row
execute function public.set_updated_at();

-- Indexes
create index if not exists profiles_handle_idx on public.profiles (handle);

create index if not exists machine_manufacturers_normalized_trgm_idx
on public.machine_manufacturers using gin (normalized_canonical_name gin_trgm_ops);

create index if not exists machine_models_manufacturer_idx
on public.machine_models (manufacturer_id);

create index if not exists machine_models_normalized_trgm_idx
on public.machine_models using gin (normalized_canonical_name gin_trgm_ops);

create index if not exists machine_models_display_trgm_idx
on public.machine_models using gin (normalized_display_name gin_trgm_ops);

create index if not exists machine_aliases_entity_idx
on public.machine_aliases (entity_type, entity_id);

create index if not exists machine_aliases_normalized_trgm_idx
on public.machine_aliases using gin (normalized_alias_text gin_trgm_ops);

create index if not exists grinder_manufacturers_normalized_trgm_idx
on public.grinder_manufacturers using gin (normalized_canonical_name gin_trgm_ops);

create index if not exists grinder_models_manufacturer_idx
on public.grinder_models (manufacturer_id);

create index if not exists grinder_models_normalized_trgm_idx
on public.grinder_models using gin (normalized_canonical_name gin_trgm_ops);

create index if not exists grinder_models_display_trgm_idx
on public.grinder_models using gin (normalized_display_name gin_trgm_ops);

create index if not exists grinder_aliases_entity_idx
on public.grinder_aliases (entity_type, entity_id);

create index if not exists grinder_aliases_normalized_trgm_idx
on public.grinder_aliases using gin (normalized_alias_text gin_trgm_ops);

create index if not exists user_suggested_entries_user_idx
on public.user_suggested_entries (user_id);

create index if not exists user_suggested_entries_status_idx
on public.user_suggested_entries (status);

create index if not exists user_suggested_entries_domain_status_idx
on public.user_suggested_entries (entity_domain, status);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.machine_manufacturers enable row level security;
alter table public.machine_models enable row level security;
alter table public.machine_aliases enable row level security;
alter table public.grinder_manufacturers enable row level security;
alter table public.grinder_models enable row level security;
alter table public.grinder_aliases enable row level security;
alter table public.user_suggested_entries enable row level security;

-- Profiles policies
create policy "profiles can be read by everyone"
on public.profiles
for select
using (true);

create policy "users can insert their own profile"
on public.profiles
for insert
with check (id = auth.uid());

create policy "users can update their own profile"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

-- User role policies
create policy "users can read their own roles"
on public.user_roles
for select
using (user_id = auth.uid() or public.is_admin());

create policy "admins can manage user roles"
on public.user_roles
for all
using (public.is_admin())
with check (public.is_admin());

-- Public reference data read policies
create policy "public read machine manufacturers"
on public.machine_manufacturers
for select
using (true);

create policy "public read machine models"
on public.machine_models
for select
using (true);

create policy "public read machine aliases"
on public.machine_aliases
for select
using (true);

create policy "public read grinder manufacturers"
on public.grinder_manufacturers
for select
using (true);

create policy "public read grinder models"
on public.grinder_models
for select
using (true);

create policy "public read grinder aliases"
on public.grinder_aliases
for select
using (true);

-- Admin-only reference data write policies
create policy "admins can write machine manufacturers"
on public.machine_manufacturers
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins can write machine models"
on public.machine_models
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins can write machine aliases"
on public.machine_aliases
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins can write grinder manufacturers"
on public.grinder_manufacturers
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins can write grinder models"
on public.grinder_models
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins can write grinder aliases"
on public.grinder_aliases
for all
using (public.is_admin())
with check (public.is_admin());

-- Suggestion queue policies
create policy "users can create their own suggestions"
on public.user_suggested_entries
for insert
with check (user_id = auth.uid());

create policy "users can read their own suggestions"
on public.user_suggested_entries
for select
using (user_id = auth.uid() or public.is_admin());

create policy "admins can manage suggestions"
on public.user_suggested_entries
for all
using (public.is_admin())
with check (public.is_admin());

commit;
