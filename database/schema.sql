-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create enum for cohort status
create type cohort_status as enum ('draft', 'active', 'completed', 'paused');

-- Create cohorts table
create table public.cohorts (
  id text primary key,
  name text not null,
  description text,
  status cohort_status not null default 'draft',
  created_date timestamptz not null default now(),
  start_date timestamptz,
  end_date timestamptz,
  program_manager text,
  target_skills text[],
  success_rate_target integer default 85,
  matches jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create mentees table
create table public.mentees (
  id uuid primary key default uuid_generate_v4(),
  cohort_id text not null references public.cohorts(id) on delete cascade,
  mentee_id text not null,
  role text not null,
  experience_years integer not null,
  location_timezone text not null,
  topics_to_learn text[] not null,
  meeting_frequency text not null,
  languages text[] not null,
  industry text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cohort_id, mentee_id)
);

-- Create mentors table
create table public.mentors (
  id uuid primary key default uuid_generate_v4(),
  cohort_id text not null references public.cohorts(id) on delete cascade,
  mentor_id text not null,
  role text not null,
  experience_years integer not null,
  location_timezone text not null,
  topics_to_mentor text[] not null,
  capacity_remaining integer not null,
  languages text[] not null,
  industry text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cohort_id, mentor_id)
);

-- Create indexes for better performance
create index idx_mentees_cohort_id on public.mentees(cohort_id);
create index idx_mentors_cohort_id on public.mentors(cohort_id);
create index idx_cohorts_status on public.cohorts(status);
create index idx_cohorts_created_at on public.cohorts(created_at);

-- Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers to automatically update updated_at
create trigger update_cohorts_updated_at
  before update on public.cohorts
  for each row execute function update_updated_at_column();

create trigger update_mentees_updated_at
  before update on public.mentees
  for each row execute function update_updated_at_column();

create trigger update_mentors_updated_at
  before update on public.mentors
  for each row execute function update_updated_at_column();

-- Insert sample cohort (optional)
insert into public.cohorts (
  id,
  name,
  description,
  status,
  program_manager,
  target_skills,
  success_rate_target
) values (
  'cohort_sample_1',
  'Q1 2025 Leadership Development',
  'First quarter leadership development program focusing on team management and strategic thinking',
  'active',
  'Sarah Johnson',
  array['Leadership', 'Strategic Thinking', 'Team Management'],
  85
);

-- Enable Row Level Security (RLS) - Optional but recommended
alter table public.cohorts enable row level security;
alter table public.mentees enable row level security;
alter table public.mentors enable row level security;

-- Create policies for public access (adjust as needed for your security requirements)
create policy "Allow all operations on cohorts" on public.cohorts for all using (true);
create policy "Allow all operations on mentees" on public.mentees for all using (true);
create policy "Allow all operations on mentors" on public.mentors for all using (true);