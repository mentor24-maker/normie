import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import { escapePollCategoryIlikeExact, resolvePollCategoryName } from "@/lib/poll-categories";
import { createAdminClient } from "@/lib/supabase-admin";

const POLL_PICKER_SELECT = "id, category, question, image_url, order_index";

function safeText(value: string | null, max = 4000) {
  return (value ?? "").trim().slice(0, max);
}

export async function GET(request: Request) {
  const auth = await requireAdminRoute();

  if ("response" in auth) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const question = safeText(searchParams.get("question"));
  const category = safeText(searchParams.get("category"), 255);

  const supabase = createAdminClient();
  let query = supabase.from("polls").select(POLL_PICKER_SELECT).order("order_index", { ascending: true });

  if (category) {
    const categoryFilter = resolvePollCategoryName(category) ?? category;
    query = query.ilike("category", escapePollCategoryIlikeExact(categoryFilter));
  }

  if (question) {
    query = query.ilike("question", `%${question}%`);
  }

  const { data, error } = await query.limit(200);

  if (error) {
    return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ polls: data ?? [] }));
}
