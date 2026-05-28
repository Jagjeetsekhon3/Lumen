-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Projects
create table if not exists projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  client text,
  created_at timestamp with time zone default now()
);

-- Brand summaries
create table if not exists brand_summaries (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade,
  summary_text text,
  guidelines_url text,
  created_at timestamp with time zone default now()
);

-- Approved posts
create table if not exists approved_posts (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade,
  image_url text not null,
  created_at timestamp with time zone default now()
);

-- Brainstorm sessions
create table if not exists brainstorm_sessions (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade,
  brief text,
  created_at timestamp with time zone default now()
);

-- Brainstorm ideas
create table if not exists brainstorm_ideas (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references brainstorm_sessions(id) on delete cascade,
  label text,
  title text,
  body text,
  created_at timestamp with time zone default now()
);

-- Reference images
create table if not exists reference_images (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade,
  image_url text not null,
  tag text check (tag in ('typography','background','product','color','other')),
  created_at timestamp with time zone default now()
);

-- Generated prompts
create table if not exists generated_prompts (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade,
  session_id uuid references brainstorm_sessions(id) on delete set null,
  output_type text check (output_type in ('image','video')),
  tool text,
  prompt_text text,
  created_at timestamp with time zone default now()
);

-- RLS Policies
alter table projects enable row level security;
alter table brand_summaries enable row level security;
alter table approved_posts enable row level security;
alter table brainstorm_sessions enable row level security;
alter table brainstorm_ideas enable row level security;
alter table reference_images enable row level security;
alter table generated_prompts enable row level security;

-- Projects policies
create policy "Users own their projects" on projects
  for all using (auth.uid() = user_id);

-- Brand summaries
create policy "Users access own project brand summaries" on brand_summaries
  for all using (project_id in (select id from projects where user_id = auth.uid()));

-- Approved posts
create policy "Users access own project approved posts" on approved_posts
  for all using (project_id in (select id from projects where user_id = auth.uid()));

-- Brainstorm sessions
create policy "Users access own project sessions" on brainstorm_sessions
  for all using (project_id in (select id from projects where user_id = auth.uid()));

-- Brainstorm ideas
create policy "Users access own session ideas" on brainstorm_ideas
  for all using (session_id in (
    select id from brainstorm_sessions where project_id in (
      select id from projects where user_id = auth.uid()
    )
  ));

-- Reference images
create policy "Users access own project references" on reference_images
  for all using (project_id in (select id from projects where user_id = auth.uid()));

-- Generated prompts
create policy "Users access own project prompts" on generated_prompts
  for all using (project_id in (select id from projects where user_id = auth.uid()));

-- Storage buckets
insert into storage.buckets (id, name, public) values ('guidelines', 'guidelines', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('approved-posts', 'approved-posts', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('reference-images', 'reference-images', true) on conflict do nothing;

-- Storage policies
create policy "Auth users can upload guidelines" on storage.objects
  for insert with check (bucket_id = 'guidelines' and auth.role() = 'authenticated');
create policy "Auth users can read own guidelines" on storage.objects
  for select using (bucket_id = 'guidelines' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Auth users can upload approved posts" on storage.objects
  for insert with check (bucket_id = 'approved-posts' and auth.role() = 'authenticated');
create policy "Public can read approved posts" on storage.objects
  for select using (bucket_id = 'approved-posts');

create policy "Auth users can upload references" on storage.objects
  for insert with check (bucket_id = 'reference-images' and auth.role() = 'authenticated');
create policy "Public can read references" on storage.objects
  for select using (bucket_id = 'reference-images');

-- ─────────────────────────────────────────
-- BRANDS RESTRUCTURE — run this in Supabase SQL Editor
-- ─────────────────────────────────────────

-- Brands table (global per user, not per project)
create table if not exists brands (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  summary_text text,
  guidelines_url text,
  created_at timestamp with time zone default now()
);

-- Add brand_id and campaign_type to projects
alter table projects add column if not exists brand_id uuid references brands(id) on delete set null;
alter table projects add column if not exists campaign_type text default 'campaign';

-- Add brand_id to approved_posts so posts belong to brand not project
create table if not exists brand_posts (
  id uuid default uuid_generate_v4() primary key,
  brand_id uuid references brands(id) on delete cascade,
  image_url text not null,
  created_at timestamp with time zone default now()
);

-- RLS
alter table brands enable row level security;
alter table brand_posts enable row level security;

create policy "Users own their brands" on brands
  for all using (auth.uid() = user_id);

create policy "Users access own brand posts" on brand_posts
  for all using (brand_id in (select id from brands where user_id = auth.uid()));

-- Storage bucket for brand guidelines
insert into storage.buckets (id, name, public) values ('brand-guidelines', 'brand-guidelines', false) on conflict do nothing;

create policy "Auth users can upload brand guidelines" on storage.objects
  for insert with check (bucket_id = 'brand-guidelines' and auth.role() = 'authenticated');
create policy "Auth users can read brand guidelines" on storage.objects
  for select using (bucket_id = 'brand-guidelines');
