alter table public.player_profiles
add column if not exists is_tester boolean not null default false,
add column if not exists tester_poll_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'player_profiles_tester_poll_id_fkey'
  ) then
    alter table public.player_profiles
    add constraint player_profiles_tester_poll_id_fkey
    foreign key (tester_poll_id) references public.polls(id) on delete set null;
  end if;
end $$;

create index if not exists player_profiles_tester_poll_id_idx
on public.player_profiles (tester_poll_id)
where is_tester = true;

notify pgrst, 'reload schema';
