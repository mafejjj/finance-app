create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark',
  hide_values boolean not null default false,
  menu_collapsed boolean not null default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create or replace function public.set_user_preferences_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row
execute function public.set_user_preferences_updated_at();

alter table public.user_preferences enable row level security;

create policy "User preferences are readable by owner"
on public.user_preferences
for select
using (auth.uid() = user_id);

create policy "User preferences are insertable by owner"
on public.user_preferences
for insert
with check (auth.uid() = user_id);

create policy "User preferences are updatable by owner"
on public.user_preferences
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
