-- Run this in the Supabase SQL editor for the Envelope Budget Pilot project.
-- It uses Supabase Auth for credentials and row level security for user data.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default 'Budget user',
  household text not null default 'Personal workspace',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_income numeric not null default 0,
  filled_amount numeric not null default 0,
  preferences jsonb not null default '{}'::jsonb,
  envelopes jsonb not null default '[]'::jsonb,
  transactions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.budget_snapshots enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "budget_snapshots_select_own" on public.budget_snapshots;
create policy "budget_snapshots_select_own"
  on public.budget_snapshots for select
  using (auth.uid() = user_id);

drop policy if exists "budget_snapshots_insert_own" on public.budget_snapshots;
create policy "budget_snapshots_insert_own"
  on public.budget_snapshots for insert
  with check (auth.uid() = user_id);

drop policy if exists "budget_snapshots_update_own" on public.budget_snapshots;
create policy "budget_snapshots_update_own"
  on public.budget_snapshots for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
