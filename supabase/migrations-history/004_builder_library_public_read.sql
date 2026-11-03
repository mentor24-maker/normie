-- Allow public site to load named builder library entries (e.g. Blog Header on /blog).

drop policy if exists "builder cell modules are readable" on public.builder_cell_modules;
create policy "builder cell modules are readable"
on public.builder_cell_modules
for select
to anon, authenticated
using (true);

drop policy if exists "builder saved sections are readable" on public.builder_saved_sections;
create policy "builder saved sections are readable"
on public.builder_saved_sections
for select
to anon, authenticated
using (true);
