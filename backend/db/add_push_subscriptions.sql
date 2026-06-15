-- Run this in Supabase Dashboard > SQL Editor before testing PWA push notifications.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  patient_id text references public.patients(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "users read own push subscriptions" on public.push_subscriptions;
drop policy if exists "users insert own push subscriptions" on public.push_subscriptions;
drop policy if exists "users update own push subscriptions" on public.push_subscriptions;
drop policy if exists "users delete own push subscriptions" on public.push_subscriptions;

create policy "users read own push subscriptions"
on public.push_subscriptions for select to authenticated using (auth.uid() = user_id);

create policy "users insert own push subscriptions"
on public.push_subscriptions for insert to authenticated with check (auth.uid() = user_id);

create policy "users update own push subscriptions"
on public.push_subscriptions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users delete own push subscriptions"
on public.push_subscriptions for delete to authenticated using (auth.uid() = user_id);

grant select, insert, update, delete on public.push_subscriptions to authenticated;

alter table public.push_subscriptions replica identity full;
