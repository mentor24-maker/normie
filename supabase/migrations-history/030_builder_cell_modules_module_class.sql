alter table public.builder_cell_modules
add column if not exists module_class text not null default '';
