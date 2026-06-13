-- Pilly base Supabase schema.
-- Run this in Supabase Dashboard > SQL Editor before using auth/reminders.
-- The policies below stay intentionally permissive for a class/demo prototype.

create sequence if not exists public.patient_id_seq start 1;
create sequence if not exists public.queue_no_seq start 1;

create or replace function public.next_patient_id()
returns text
language sql
as $$
  select 'P' || lpad(nextval('public.patient_id_seq')::text, 3, '0');
$$;

create or replace function public.next_queue_no()
returns text
language sql
as $$
  select 'C' || lpad(nextval('public.queue_no_seq')::text, 3, '0');
$$;

create table if not exists public.patients (
  id text primary key default public.next_patient_id(),
  queue_no text not null default public.next_queue_no(),
  name text not null,
  nric text,
  urgency text not null default 'C' check (urgency in ('A', 'B', 'C')),
  status text not null default 'pending'
    check (status in ('pending', 'on_hold', 'ready', 'collected')),
  wait_min integer not null default 0,
  elapsed_label text not null default 'Just now',
  created_at timestamptz not null default now()
);

alter table public.patients
  alter column id set default public.next_patient_id(),
  alter column queue_no set default public.next_queue_no(),
  alter column queue_no set not null,
  alter column name set not null,
  alter column urgency set default 'C',
  alter column status set default 'pending',
  alter column wait_min set default 0,
  alter column elapsed_label set default 'Just now';

alter table public.patients
  alter column nric drop not null;

create table if not exists public.patient_medications (
  id bigint generated always as identity primary key,
  patient_id text not null references public.patients(id) on delete cascade,
  name text not null,
  quantity integer not null check (quantity >= 0),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.hold_reasons (
  id bigint generated always as identity primary key,
  patient_id text not null references public.patients(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.patient_reminders (
  id bigint generated always as identity primary key,
  patient_id text not null references public.patients(id) on delete cascade,
  medication_name text not null,
  reminder_time text not null,
  taken boolean not null default false,
  created_by_user_id uuid,
  created_by_name text,
  created_by_role text check (created_by_role in ('patient', 'pharmacist')),
  created_at timestamptz not null default now()
);

alter table public.patient_reminders
  add column if not exists created_by_user_id uuid,
  add column if not exists created_by_name text,
  add column if not exists created_by_role text;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('patient', 'pharmacist')),
  patient_id text references public.patients(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.user_profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists role text,
  add column if not exists patient_id text,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_profiles_patient_id_fkey'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_patient_id_fkey
      foreign key (patient_id) references public.patients(id) on delete set null;
  end if;
end $$;

do $$
declare
  patient_seq_value bigint;
  queue_seq_value bigint;
begin
  select coalesce(max((regexp_match(id, '([0-9]+)$'))[1]::bigint), 0)
    into patient_seq_value
  from public.patients
  where id ~ '[0-9]+$';

  if patient_seq_value = 0 then
    perform setval('public.patient_id_seq', 1, false);
  else
    perform setval('public.patient_id_seq', patient_seq_value, true);
  end if;

  select coalesce(max((regexp_match(queue_no, '([0-9]+)$'))[1]::bigint), 0)
    into queue_seq_value
  from public.patients
  where queue_no ~ '[0-9]+$';

  if queue_seq_value = 0 then
    perform setval('public.queue_no_seq', 1, false);
  else
    perform setval('public.queue_no_seq', queue_seq_value, true);
  end if;
end $$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_name text := trim(coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  profile_role text := lower(coalesce(new.raw_user_meta_data ->> 'role', 'patient'));
  linked_patient_id text;
begin
  if profile_name is null or profile_name = '' then
    profile_name := split_part(new.email, '@', 1);
  end if;

  if profile_role not in ('patient', 'pharmacist') then
    profile_role := 'patient';
  end if;

  if profile_role = 'patient' then
    insert into public.patients (name, urgency, status, wait_min, elapsed_label)
    values (profile_name, 'C', 'pending', 0, 'Just now')
    returning id into linked_patient_id;
  end if;

  insert into public.user_profiles (id, email, full_name, role, patient_id)
  values (new.id, new.email, profile_name, profile_role, linked_patient_id)
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role = excluded.role,
        patient_id = coalesce(public.user_profiles.patient_id, excluded.patient_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.patients enable row level security;
alter table public.patient_medications enable row level security;
alter table public.hold_reasons enable row level security;
alter table public.patient_reminders enable row level security;
alter table public.user_profiles enable row level security;

drop policy if exists "demo read patients" on public.patients;
drop policy if exists "demo update patients" on public.patients;
drop policy if exists "demo insert patients" on public.patients;
drop policy if exists "demo read medications" on public.patient_medications;
drop policy if exists "demo update medications" on public.patient_medications;
drop policy if exists "demo insert hold reasons" on public.hold_reasons;
drop policy if exists "demo read hold reasons" on public.hold_reasons;
drop policy if exists "demo read reminders" on public.patient_reminders;
drop policy if exists "demo insert reminders" on public.patient_reminders;
drop policy if exists "demo update reminders" on public.patient_reminders;
drop policy if exists "users read own profile" on public.user_profiles;
drop policy if exists "users insert own profile" on public.user_profiles;
drop policy if exists "users update own profile" on public.user_profiles;

create policy "demo read patients"
on public.patients for select to anon, authenticated using (true);

create policy "demo update patients"
on public.patients for update to anon, authenticated using (true) with check (true);

create policy "demo insert patients"
on public.patients for insert to anon, authenticated with check (true);

create policy "demo read medications"
on public.patient_medications for select to anon, authenticated using (true);

create policy "demo update medications"
on public.patient_medications for update to anon, authenticated using (true) with check (true);

create policy "demo insert hold reasons"
on public.hold_reasons for insert to anon, authenticated with check (true);

create policy "demo read hold reasons"
on public.hold_reasons for select to anon, authenticated using (true);

create policy "demo read reminders"
on public.patient_reminders for select to anon, authenticated using (true);

create policy "demo insert reminders"
on public.patient_reminders for insert to anon, authenticated with check (true);

create policy "demo update reminders"
on public.patient_reminders for update to anon, authenticated using (true) with check (true);

create policy "users read own profile"
on public.user_profiles for select to authenticated using (auth.uid() = id);

create policy "users insert own profile"
on public.user_profiles for insert to authenticated with check (auth.uid() = id);

create policy "users update own profile"
on public.user_profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

grant select, insert, update on public.patients to anon, authenticated;
grant select, update on public.patient_medications to anon, authenticated;
grant select, insert on public.hold_reasons to anon, authenticated;
grant select, insert, update on public.patient_reminders to anon, authenticated;
grant select, insert, update on public.user_profiles to authenticated;

grant usage on sequence public.patient_id_seq to anon, authenticated;
grant usage on sequence public.queue_no_seq to anon, authenticated;
grant usage on sequence public.patient_medications_id_seq to anon, authenticated;
grant usage on sequence public.hold_reasons_id_seq to anon, authenticated;
grant usage on sequence public.patient_reminders_id_seq to anon, authenticated;

alter table public.patients replica identity full;
alter table public.patient_medications replica identity full;
alter table public.patient_reminders replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'patients'
  ) then
    alter publication supabase_realtime add table public.patients;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'patient_medications'
  ) then
    alter publication supabase_realtime add table public.patient_medications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'patient_reminders'
  ) then
    alter publication supabase_realtime add table public.patient_reminders;
  end if;
end $$;
