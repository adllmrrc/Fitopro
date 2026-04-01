begin;

create extension if not exists pgcrypto with schema extensions;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_updated_at() cascade;

drop table if exists public.personal_records cascade;
drop table if exists public.workout_sessions cascade;
drop table if exists public.workouts cascade;
drop table if exists public.profiles cascade;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default 'Athlete',
  bio text not null default '',
  weekly_goal integer not null default 4 check (weekly_goal between 1 and 14),
  body_weight numeric(6,2) not null default 75,
  height numeric(6,2),
  age integer check (age is null or age between 13 and 100),
  experience_level text not null default 'intermediate'
    check (experience_level in ('beginner', 'intermediate', 'advanced', 'elite')),
  avatar_url text,
  xp integer not null default 0,
  level integer not null default 1,
  total_workouts integer not null default 0,
  badges text[] not null default '{}'::text[],
  settings jsonb not null default jsonb_build_object(
    'sound', true,
    'rest_timer', true,
    'haptic', true,
    'notifications', true
  ),
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workouts (
  id text primary key default ('workout_' || extensions.gen_random_uuid()::text),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default '🏋️',
  description text not null default '',
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workout_sessions (
  id text primary key default ('session_' || extensions.gen_random_uuid()::text),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_name text not null,
  workout_icon text not null default '🏋️',
  started_at timestamptz not null default now(),
  duration_seconds integer not null default 0,
  exercises_completed integer not null default 0,
  total_exercises integer not null default 0,
  sets_logged integer not null default 0,
  calories_burned integer not null default 0,
  total_volume numeric(12,2) not null default 0,
  avg_heart_rate integer,
  max_heart_rate integer,
  set_logs jsonb not null default '[]'::jsonb,
  notes text not null default '',
  status text not null default 'completed'
    check (status in ('completed', 'in_progress', 'cancelled')),
  created_at timestamptz not null default now()
);

create table public.personal_records (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  weight numeric(8,2) not null default 0,
  reps integer not null default 0,
  recorded_at timestamptz not null default now(),
  constraint personal_records_user_exercise_key unique (user_id, exercise_name)
);

create index profiles_email_idx on public.profiles(email);
create index workouts_user_created_idx on public.workouts(user_id, created_at desc);
create index workout_sessions_user_started_idx on public.workout_sessions(user_id, started_at desc);
create index personal_records_user_idx on public.personal_records(user_id);
create index personal_records_user_exercise_idx on public.personal_records(user_id, exercise_name);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_workouts_updated_at
before update on public.workouts
for each row
execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    weekly_goal,
    body_weight,
    experience_level,
    settings,
    onboarded
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1),
      'Athlete'
    ),
    4,
    75,
    'intermediate',
    jsonb_build_object(
      'sound', true,
      'rest_timer', true,
      'haptic', true,
      'notifications', true
    ),
    false
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

insert into public.profiles (
  id,
  email,
  display_name,
  weekly_goal,
  body_weight,
  experience_level,
  settings,
  onboarded
)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'display_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, ''), '@', 1),
    'Athlete'
  ),
  4,
  75,
  'intermediate',
  jsonb_build_object(
    'sound', true,
    'rest_timer', true,
    'haptic', true,
    'notifications', true
  ),
  false
from auth.users u
on conflict (id) do update
set
  email = excluded.email,
  updated_at = now();

alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.personal_records enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id)
with check ((select auth.uid()) is not null and (select auth.uid()) = id);

create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id);

create policy "workouts_select_own"
on public.workouts
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "workouts_insert_own"
on public.workouts
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "workouts_update_own"
on public.workouts
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "workouts_delete_own"
on public.workouts
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "sessions_select_own"
on public.workout_sessions
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "sessions_insert_own"
on public.workout_sessions
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "sessions_update_own"
on public.workout_sessions
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "sessions_delete_own"
on public.workout_sessions
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "prs_select_own"
on public.personal_records
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "prs_insert_own"
on public.personal_records
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "prs_update_own"
on public.personal_records
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "prs_delete_own"
on public.personal_records
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.workouts to authenticated;
grant select, insert, update, delete on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.personal_records to authenticated;

commit;
