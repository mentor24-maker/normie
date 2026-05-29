-- Email templates in the page builder (template_kind = 'email', email_function identifies use case)
alter table public.page_templates
  add column if not exists email_function text;

create index if not exists page_templates_email_function_idx
  on public.page_templates (email_function)
  where template_kind = 'email';
