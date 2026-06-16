-- Enable extensions
create extension if not exists "uuid-ossp";

-- PROFILES
create table profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    name text,
    email text unique,
    created_at timestamp default now()
);

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