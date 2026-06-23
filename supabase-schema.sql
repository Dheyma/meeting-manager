-- Meeting Management Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- People/Contacts table
create table people (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null unique,
  organization text,
  created_at timestamptz default now()
);

-- Meetings table
create table meetings (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  date timestamptz not null,
  location text,
  status text default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Meeting attendees (junction table)
create table meeting_attendees (
  id uuid primary key default uuid_generate_v4(),
  meeting_id uuid references meetings(id) on delete cascade,
  person_id uuid references people(id) on delete cascade,
  attended boolean default false,
  unique(meeting_id, person_id)
);

-- Agenda items
create table agenda_items (
  id uuid primary key default uuid_generate_v4(),
  meeting_id uuid references meetings(id) on delete cascade,
  title text not null,
  description text,
  document_url text,
  document_name text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Decisions
create table decisions (
  id uuid primary key default uuid_generate_v4(),
  meeting_id uuid references meetings(id) on delete cascade,
  agenda_item_id uuid references agenda_items(id) on delete set null,
  description text not null,
  created_at timestamptz default now()
);

-- Action items
create table action_items (
  id uuid primary key default uuid_generate_v4(),
  meeting_id uuid references meetings(id) on delete cascade,
  decision_id uuid references decisions(id) on delete set null,
  description text not null,
  assigned_to uuid references people(id) on delete set null,
  due_date date,
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  email_sent boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Storage bucket for agenda documents
insert into storage.buckets (id, name, public)
values ('agenda-documents', 'agenda-documents', true)
on conflict do nothing;

-- RLS policies (permissive for now - tighten based on auth needs)
alter table people enable row level security;
alter table meetings enable row level security;
alter table meeting_attendees enable row level security;
alter table agenda_items enable row level security;
alter table decisions enable row level security;
alter table action_items enable row level security;

-- Allow all operations for authenticated and anon users (adjust for production)
create policy "Allow all on people" on people for all using (true) with check (true);
create policy "Allow all on meetings" on meetings for all using (true) with check (true);
create policy "Allow all on meeting_attendees" on meeting_attendees for all using (true) with check (true);
create policy "Allow all on agenda_items" on agenda_items for all using (true) with check (true);
create policy "Allow all on decisions" on decisions for all using (true) with check (true);
create policy "Allow all on action_items" on action_items for all using (true) with check (true);

-- Storage policy
create policy "Allow public access to agenda documents"
on storage.objects for all
using (bucket_id = 'agenda-documents')
with check (bucket_id = 'agenda-documents');
