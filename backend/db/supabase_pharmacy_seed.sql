-- Pilly pharmacy demo tables for Supabase.
-- Run this in Supabase Dashboard > SQL Editor.
-- These policies are intentionally permissive for a class/demo prototype.
-- Tighten RLS before using real patient data.

create table if not exists public.patients (
  id text primary key,
  queue_no text not null,
  name text not null,
  nric text not null,
  urgency text not null check (urgency in ('A', 'B', 'C')),
  status text not null default 'pending'
    check (status in ('pending', 'on_hold', 'ready', 'collected')),
  wait_min integer not null default 0,
  elapsed_label text not null default 'Just now',
  created_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now()
);

alter table public.patients enable row level security;
alter table public.patient_medications enable row level security;
alter table public.hold_reasons enable row level security;
alter table public.patient_reminders enable row level security;

drop policy if exists "demo read patients" on public.patients;
drop policy if exists "demo update patients" on public.patients;
drop policy if exists "demo read medications" on public.patient_medications;
drop policy if exists "demo update medications" on public.patient_medications;
drop policy if exists "demo insert hold reasons" on public.hold_reasons;
drop policy if exists "demo read hold reasons" on public.hold_reasons;
drop policy if exists "demo read reminders" on public.patient_reminders;
drop policy if exists "demo insert reminders" on public.patient_reminders;
drop policy if exists "demo update reminders" on public.patient_reminders;

create policy "demo read patients"
on public.patients for select to anon using (true);

create policy "demo update patients"
on public.patients for update to anon using (true) with check (true);

create policy "demo read medications"
on public.patient_medications for select to anon using (true);

create policy "demo update medications"
on public.patient_medications for update to anon using (true) with check (true);

create policy "demo insert hold reasons"
on public.hold_reasons for insert to anon with check (true);

create policy "demo read hold reasons"
on public.hold_reasons for select to anon using (true);

create policy "demo read reminders"
on public.patient_reminders for select to anon using (true);

create policy "demo insert reminders"
on public.patient_reminders for insert to anon with check (true);

create policy "demo update reminders"
on public.patient_reminders for update to anon using (true) with check (true);

grant select, update on public.patients to anon;
grant select, update on public.patient_medications to anon;
grant select, insert on public.hold_reasons to anon;
grant select, insert, update on public.patient_reminders to anon;
grant usage on sequence public.patient_medications_id_seq to anon;
grant usage on sequence public.hold_reasons_id_seq to anon;
grant usage on sequence public.patient_reminders_id_seq to anon;

truncate table public.hold_reasons, public.patient_reminders, public.patient_medications, public.patients restart identity cascade;

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

insert into public.patient_reminders (patient_id, medication_name, reminder_time, taken) values
  ('P001', 'Metformin 500mg', '8:00 AM', true),
  ('P001', 'Lisinopril 10mg', '9:00 AM', true),
  ('P001', 'Metformin 500mg', '8:00 PM', false),
  ('P001', 'Atorvastatin 20mg', '10:00 PM', false);

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
