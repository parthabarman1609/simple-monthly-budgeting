-- Enable extensions
create extension if not exists "uuid-ossp";

-- PROFILES
-- 1. Create a table - public.profiles
create table profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    name text,
    email text unique,
    created_at timestamp default now()
);

-- 2. Create a function that inserts a row into public.profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

-- 3. Trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- GROUPS
create table groups (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    created_by uuid references profiles(id),
    created_at timestamp default now()
);

-- GROUP MEMBERS
create table group_members (
    id uuid primary key default uuid_generate_v4(),
    group_id uuid references groups(id) on delete cascade,
    user_id uuid references profiles(id),
    joined_at timestamp default now()
);

-- ENFORCE MAX 50 USERS
create or replace function check_group_limit()
returns trigger as $$
begin
    if (select count(*) from group_members where group_id = new.group_id) >= 50 then
        raise exception 'Group member limit reached';
    end if;
    return new;
end;
$$ language plpgsql;

create trigger enforce_group_limit
before insert on group_members
for each row execute function check_group_limit();

-- EXPENSES
create table expenses (
    id uuid primary key default uuid_generate_v4(),
    payer_id uuid references profiles(id),
    amount numeric not null,
    description text,
    category text,
    date date,
    group_id uuid null references groups(id),
    created_at timestamp default now()
);

-- SPLITS
create table expense_splits (
    id uuid primary key default uuid_generate_v4(),
    expense_id uuid references expenses(id) on delete cascade,
    user_id uuid references profiles(id),
    amount_owed numeric,
    status text default 'pending'
);

-- Create a dedicated table for pending invitations
CREATE TABLE public.group_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    invited_by UUID REFERENCES public.profiles(id),
    token UUID UNIQUE DEFAULT uuid_generate_v4(), -- The magic string sent in the email link
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    created_at TIMESTAMP DEFAULT now(),
    expires_at TIMESTAMP DEFAULT now() + interval '7 days',
    
    -- Ensure an email can't have multiple pending invites for the same group
    UNIQUE (group_id, invited_email, status)
);

-- 2. Optional but recommended: Index the token for fast invite lookups when the link is clicked
CREATE INDEX idx_group_invitations_token ON public.group_invitations(token);