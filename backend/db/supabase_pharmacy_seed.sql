-- Pilly pharmacy demo schema + seed data for Supabase.
-- Run this in Supabase Dashboard > SQL Editor.
-- These policies are intentionally permissive for a class/demo prototype.
-- Tighten RLS before using real patient data.

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
  add column if not exists name text,
  add column if not exists role text,
  add column if not exists patient_id text,
  add column if not exists created_at timestamptz not null default now();

update public.user_profiles
set full_name = nullif(trim(name), '')
where (full_name is null or trim(full_name) = '')
  and name is not null
  and trim(name) <> '';

update public.user_profiles as up
set email = au.email
from auth.users as au
where up.id = au.id
  and (up.email is null or trim(up.email) = '');

update public.user_profiles
set full_name = split_part(coalesce(email, cast(id as text)), '@', 1)
where full_name is null or trim(full_name) = '';

update public.user_profiles
set role = 'patient'
where role is null or role not in ('patient', 'pharmacist');

alter table public.user_profiles
  alter column email set not null,
  alter column full_name set not null,
  alter column role set not null;

create unique index if not exists user_profiles_email_key
  on public.user_profiles (email);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_profiles_role_check'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_role_check
      check (role in ('patient', 'pharmacist'));
  end if;
end $$;

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
exception
  when others then
    -- Keep auth signup successful even if profile sync is temporarily misconfigured.
    raise warning 'handle_new_auth_user failed for %: %', new.id, sqlerrm;
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

truncate table public.hold_reasons, public.patient_reminders, public.patient_medications, public.user_profiles, public.patients restart identity cascade;

insert into public.patients (id, queue_no, name, nric, urgency, status, wait_min, elapsed_label) values
  ('P001', 'A127', 'Tan Wei Ming', 'S1234567A', 'A', 'pending', 8, '8 min ago'),
  ('P002', 'B291', 'Siti Rahmah', 'T2345678B', 'B', 'on_hold', 15, '15 min ago'),
  ('P003', 'A342', 'David Lim', 'S3456789C', 'A', 'ready', 22, '22 min ago'),
  ('P004', 'C103', 'Priya Nair', 'T4567890D', 'C', 'pending', 31, '31 min ago'),
  ('P005', 'B667', 'Mohammad Faiz', 'S5678901E', 'B', 'collected', 45, '45 min ago'),
  ('P006', 'A518', 'Chen Li Hua', 'T6789012F', 'A', 'pending', 52, '52 min ago'),
  ('P007', 'C745', 'Kavitha Raj', 'S7890123G', 'C', 'on_hold', 68, '1 hr ago'),
  ('P008', 'B184', 'James Tan', 'T8901234H', 'B', 'ready', 90, '1.5 hr ago');

insert into public.patient_medications (patient_id, name, quantity, verified) values
  ('P001', 'Paracetamol 500mg', 20, false),
  ('P001', 'Amoxicillin 250mg', 15, false),
  ('P001', 'Cetirizine 10mg', 10, false),
  ('P001', 'Omeprazole 20mg', 7, false),
  ('P002', 'Metformin 500mg', 30, false),
  ('P002', 'Amlodipine 5mg', 14, false),
  ('P003', 'Atorvastatin 20mg', 28, true),
  ('P003', 'Losartan 50mg', 28, true),
  ('P003', 'Aspirin 100mg', 30, true),
  ('P003', 'Vitamin D3', 10, true),
  ('P003', 'Ibuprofen 400mg', 12, true),
  ('P003', 'Loratadine 10mg', 10, true),
  ('P004', 'Salbutamol Inhaler', 1, false),
  ('P005', 'Simvastatin 20mg', 28, true),
  ('P005', 'Glipizide 5mg', 20, true),
  ('P005', 'Pantoprazole 40mg', 14, true),
  ('P006', 'Clopidogrel 75mg', 30, false),
  ('P006', 'Bisoprolol 2.5mg', 28, false),
  ('P006', 'Furosemide 40mg', 14, false),
  ('P006', 'Potassium Chloride', 14, false),
  ('P006', 'Famotidine 20mg', 10, false),
  ('P007', 'Fluoxetine 20mg', 28, false),
  ('P007', 'Melatonin 3mg', 10, false),
  ('P008', 'Dapagliflozin 10mg', 30, true),
  ('P008', 'Enalapril 10mg', 28, true),
  ('P008', 'Calcium Carbonate', 20, true);

insert into public.patient_reminders (patient_id, medication_name, reminder_time, taken, created_by_name, created_by_role) values
  ('P001', 'Metformin 500mg', '8:00 AM', true, 'Pharmacy Team', 'pharmacist'),
  ('P001', 'Lisinopril 10mg', '9:00 AM', true, 'Pharmacy Team', 'pharmacist'),
  ('P001', 'Metformin 500mg', '8:00 PM', false, 'Pharmacy Team', 'pharmacist'),
  ('P001', 'Atorvastatin 20mg', '10:00 PM', false, 'Pharmacy Team', 'pharmacist');

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
