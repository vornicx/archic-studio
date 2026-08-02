create extension if not exists pgcrypto;

create table if not exists public.studio_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slot smallint not null unique check (slot in (1, 2)),
  email text not null unique,
  display_name text not null check (char_length(display_name) between 2 and 80),
  color text not null default '#B7924C',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.founder_invites (
  token_hash text primary key,
  slot smallint not null unique check (slot in (1, 2)),
  claimed_by uuid unique references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.is_studio_member(candidate uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.studio_members
    where user_id = candidate
  );
$$;

revoke all on function public.is_studio_member(uuid) from public;
grant execute on function public.is_studio_member(uuid) to authenticated;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text not null default '',
  tax_id text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  city text not null default '',
  country text not null default 'España',
  sector text not null default 'Servicios',
  registry_data text not null default '',
  professional_data text not null default '',
  status text not null default 'active',
  revision integer not null default 1 check (revision > 0),
  created_by uuid references public.studio_members(user_id) on delete set null,
  updated_by uuid references public.studio_members(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  slug text not null,
  site_type text not null default 'corporate',
  template text not null default 'costa',
  primary_color text not null default '#0B1628',
  accent_color text not null default '#B7924C',
  headline text not null default '',
  subheadline text not null default '',
  hero_image_url text not null default '',
  sections jsonb not null default '[]'::jsonb,
  integrations jsonb not null default '[]'::jsonb,
  legal jsonb not null default '{}'::jsonb,
  brief jsonb not null default '{}'::jsonb,
  legal_profile jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  compliance_score integer not null default 0 check (compliance_score between 0 and 100),
  github_repo_full_name text not null default '',
  github_repo_url text not null default '',
  github_default_branch text not null default 'main',
  github_last_push_at timestamptz,
  revision integer not null default 1 check (revision > 0),
  created_by uuid references public.studio_members(user_id) on delete set null,
  updated_by uuid references public.studio_members(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  detail text not null default '',
  severity text not null default 'info',
  status text not null default 'open',
  created_by uuid references public.studio_members(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.studio_members(user_id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  entity_name text not null default '',
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists clients_updated_idx on public.clients (updated_at desc);
create index if not exists projects_updated_idx on public.projects (updated_at desc);
create index if not exists audit_events_created_idx on public.audit_events (created_at desc);
create index if not exists activity_events_created_idx on public.activity_events (created_at desc);

alter table public.studio_members enable row level security;
alter table public.founder_invites enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.audit_events enable row level security;
alter table public.activity_events enable row level security;

drop policy if exists "members can see the team" on public.studio_members;
create policy "members can see the team"
on public.studio_members for select to authenticated
using (public.is_studio_member());

drop policy if exists "members can update their own profile" on public.studio_members;

drop policy if exists "members share clients" on public.clients;
create policy "members share clients"
on public.clients for all to authenticated
using (public.is_studio_member())
with check (public.is_studio_member());

drop policy if exists "members share projects" on public.projects;
create policy "members share projects"
on public.projects for all to authenticated
using (public.is_studio_member())
with check (public.is_studio_member());

drop policy if exists "members share audits" on public.audit_events;
create policy "members share audits"
on public.audit_events for all to authenticated
using (public.is_studio_member())
with check (public.is_studio_member());

drop policy if exists "members share activity" on public.activity_events;
create policy "members share activity"
on public.activity_events for select to authenticated
using (public.is_studio_member());

drop policy if exists "members can record their activity" on public.activity_events;
create policy "members can record their activity"
on public.activity_events for insert to authenticated
with check (public.is_studio_member() and actor_id = auth.uid());

grant usage on schema public to authenticated;
revoke update on public.studio_members from authenticated;
grant select on public.studio_members to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.audit_events to authenticated;
grant select, insert on public.activity_events to authenticated;

drop policy if exists "studio members can receive private live events" on realtime.messages;
create policy "studio members can receive private live events"
on realtime.messages for select to authenticated
using (
  public.is_studio_member()
  and (select realtime.topic()) = 'archic-studio-team'
  and realtime.messages.extension in ('broadcast', 'presence')
);

drop policy if exists "studio members can send private live events" on realtime.messages;
create policy "studio members can send private live events"
on realtime.messages for insert to authenticated
with check (
  public.is_studio_member()
  and (select realtime.topic()) = 'archic-studio-team'
  and realtime.messages.extension in ('broadcast', 'presence')
);

do $$
begin
  alter publication supabase_realtime add table public.studio_members;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.clients;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.projects;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.audit_events;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.activity_events;
exception when duplicate_object then null;
end $$;
