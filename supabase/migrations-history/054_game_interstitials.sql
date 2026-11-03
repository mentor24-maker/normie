-- Poll interstitials: messages shown in the main polling panel between polls.

create table if not exists public.game_interstitials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  interstitial_type text not null default 'custom' check (
    interstitial_type in (
      'ad',
      'instructions',
      'special_deal',
      'feedback_poll',
      'announcement',
      'milestone',
      'survey',
      'partner_promo',
      'referral',
      'content_teaser',
      'onboarding',
      'custom'
    )
  ),
  display_order integer not null default 1 check (display_order >= 1),
  status text not null default 'draft' check (status in ('active', 'draft', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_interstitials_display_order_idx
on public.game_interstitials (display_order);

create index if not exists game_interstitials_status_idx
on public.game_interstitials (status);

create index if not exists game_interstitials_updated_at_idx
on public.game_interstitials (updated_at desc);

alter table public.game_interstitials enable row level security;

drop policy if exists "game interstitials are readable" on public.game_interstitials;
create policy "game interstitials are readable"
on public.game_interstitials
for select
to anon, authenticated
using (true);

grant select on public.game_interstitials to anon, authenticated, service_role;
grant insert, update, delete on public.game_interstitials to service_role;

notify pgrst, 'reload schema';
