import type { BuilderEmailFunction } from "@/lib/builder-email-template";
import { normalizeEmailFunction } from "@/lib/builder-email-template";
import { rowToBuilderTemplate, type BuilderTemplateRecord } from "@/lib/builder-template";
import { createAdminClient } from "@/lib/supabase-admin";

export async function fetchBuilderEmailTemplate(
  emailFunction: BuilderEmailFunction
): Promise<BuilderTemplateRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("page_templates")
    .select("id, name, template_kind, email_function, layout_sections, created_at, updated_at")
    .eq("template_kind", "email")
    .eq("email_function", emailFunction)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const template = rowToBuilderTemplate(data);

  if (template.templateKind !== "email" || normalizeEmailFunction(template.emailFunction) !== emailFunction) {
    return null;
  }

  return template;
}
