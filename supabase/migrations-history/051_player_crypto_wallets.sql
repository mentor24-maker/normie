alter table public.player_profiles
add column if not exists crypto_wallets jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
