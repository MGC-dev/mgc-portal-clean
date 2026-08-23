-- ===========================================================================
-- Dev Console migration — run this in the Supabase SQL editor
--
-- Adds:
--   1. a `developer` role (profiles.role + role_assignments.role)
--   2. public.app_settings  — key/value store backing maintenance mode
--   3. public.dev_events    — audit trail + error log surfaced in /dev/logs
-- Safe to re-run.
-- ===========================================================================

-- ─── 1. developer role ─────────────────────────────────────────────────────
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('client','provider','admin','support','super_admin','developer'));
comment on column public.profiles.role is
  'Allowed roles: client, provider, admin, support, super_admin, developer';

alter table public.role_assignments
  drop constraint if exists role_assignments_role_check;
alter table public.role_assignments
  add constraint role_assignments_role_check
  check (role in ('client','provider','admin','support','super_admin','developer'));

-- ─── 2. app_settings ───────────────────────────────────────────────────────
create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

alter table public.app_settings enable row level security;

-- Everyone (including anonymous visitors) may READ settings: middleware has to
-- resolve maintenance mode before a session exists. Values here are not secret.
drop policy if exists app_settings_read_all on public.app_settings;
create policy app_settings_read_all on public.app_settings
  for select using (true);

-- Only developers/super_admins may write. Server routes use the service role
-- key (which bypasses RLS) — this policy protects direct client-side writes.
drop policy if exists app_settings_dev_write on public.app_settings;
create policy app_settings_dev_write on public.app_settings
  for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('developer','super_admin')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('developer','super_admin')
  ));

insert into public.app_settings (key, value)
values (
  'maintenance',
  '{"enabled": false, "message": "We are performing scheduled maintenance. We will be back shortly."}'::jsonb
)
on conflict (key) do nothing;

-- ─── 3. dev_events ─────────────────────────────────────────────────────────
create table if not exists public.dev_events (
  id          uuid primary key default gen_random_uuid(),
  level       text not null default 'info' check (level in ('info','warn','error')),
  source      text not null default 'app',
  message     text not null,
  meta        jsonb not null default '{}'::jsonb,
  actor_email text,
  created_at  timestamptz not null default now()
);

create index if not exists dev_events_created_at_idx on public.dev_events (created_at desc);
create index if not exists dev_events_level_idx on public.dev_events (level);

alter table public.dev_events enable row level security;

-- Readable only by developers/super_admins. Writes go through the service role.
drop policy if exists dev_events_dev_read on public.dev_events;
create policy dev_events_dev_read on public.dev_events
  for select using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('developer','super_admin')
  ));

grant select on public.app_settings to anon, authenticated;
grant select on public.dev_events to authenticated;
