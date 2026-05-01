-- Run this once in the Supabase SQL editor:
-- https://app.supabase.com → your project → SQL Editor → New query

create table if not exists posts (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users(id) on delete cascade not null,
  url         text        default '',
  location    text        default '',
  caption     text        default '',
  thumb       text        default '',
  username    text        default '',
  likes       integer     default 0,
  category    text        default 'experience',
  starred     boolean     default false,
  saved_at    date        default current_date,
  created_at  timestamptz default now()
);

alter table posts enable row level security;

-- Each user can only read and write their own posts
create policy "users_own_posts" on posts
  for all
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);
