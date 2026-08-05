-- Math ChackChack MVP v0.1 logical PostgreSQL contract.
-- The first browser slice uses localStorage; this schema defines the server migration target.

create table learning_units (
  id text primary key,
  version integer not null default 1,
  title text not null,
  age_band text not null,
  status text not null check (status in ('draft','active','retired')),
  content_json jsonb not null,
  created_at timestamptz not null default now()
);

create table learning_sessions (
  id uuid primary key,
  client_session_id text unique,
  unit_id text not null references learning_units(id),
  current_step smallint not null default 0 check (current_step between 0 and 4),
  status text not null check (status in ('active','completed','abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table learner_responses (
  id uuid primary key,
  session_id uuid not null references learning_sessions(id) on delete cascade,
  step_id text not null,
  attempt smallint not null check (attempt > 0),
  response_text text not null check (char_length(response_text) <= 500),
  result text not null check (result in ('correct','retry','accepted')),
  feedback_state text not null,
  created_at timestamptz not null default now()
);

create table mastery_snapshots (
  id uuid primary key,
  session_id uuid not null references learning_sessions(id) on delete cascade,
  concept_id text not null,
  evidence_json jsonb not null,
  level text not null check (level in ('not_observed','emerging','developing','secure')),
  created_at timestamptz not null default now()
);

create table parent_summaries (
  id uuid primary key,
  session_id uuid not null unique references learning_sessions(id) on delete cascade,
  summary_json jsonb not null,
  created_at timestamptz not null default now()
);

create table telemetry_events (
  id uuid primary key,
  session_id uuid references learning_sessions(id) on delete set null,
  event_name text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index learner_responses_session_idx on learner_responses(session_id, created_at);
create index telemetry_events_name_time_idx on telemetry_events(event_name, created_at);
