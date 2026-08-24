-- ===========================================================================
-- Meeting summaries migration — run this in the Supabase SQL editor
--
-- Stores the structured summary produced for each Fireflies meeting so the
-- portal can render it inline, instead of the client having to download the
-- .docx to read it. The .docx remains the deliverable in WorkDrive; this table
-- is the readable copy.
--
-- One row per (meeting, client): a meeting attended by two signed clients is
-- delivered to both, and each sees it under their own email.
-- Safe to re-run.
-- ===========================================================================

create table if not exists public.meeting_summaries (
  id             uuid primary key default gen_random_uuid(),
  transcript_id  text not null,
  client_email   text not null,
  meeting_title  text,
  headline       text,
  meeting_date   date,
  duration_label text,
  attendees      jsonb not null default '[]'::jsonb,
  overview       text,
  key_points     jsonb not null default '[]'::jsonb,
  decisions      jsonb not null default '[]'::jsonb,
  action_items   jsonb not null default '[]'::jsonb,
  next_steps     jsonb not null default '[]'::jsonb,
  -- Ties the row to the delivered document so the portal can pair each summary
  -- with its Download action.
  file_name      text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- A webhook retry re-delivers the same meeting; upserting on this pair keeps
-- one row per client per meeting rather than accumulating duplicates.
create unique index if not exists meeting_summaries_transcript_client_idx
  on public.meeting_summaries (transcript_id, client_email);

create index if not exists meeting_summaries_client_email_idx
  on public.meeting_summaries (client_email);

create index if not exists meeting_summaries_meeting_date_idx
  on public.meeting_summaries (meeting_date desc);

alter table public.meeting_summaries enable row level security;

-- A client reads only their own summaries, matched on the email their WorkDrive
-- delivery was keyed to. Writes come from the webhook via the service role key,
-- which bypasses RLS.
drop policy if exists meeting_summaries_client_read on public.meeting_summaries;
create policy meeting_summaries_client_read on public.meeting_summaries
  for select using (lower(client_email) = lower(auth.jwt() ->> 'email'));

-- Staff need to see what was sent to a client when handling a query about it.
drop policy if exists meeting_summaries_staff_read on public.meeting_summaries;
create policy meeting_summaries_staff_read on public.meeting_summaries
  for select using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin','super_admin','developer')
  ));

grant select on public.meeting_summaries to authenticated;
