import { NextResponse } from "next/server";
import { loadPollCategoryCatalog } from "@/lib/load-poll-category-catalog";
import { withObservedRoute } from "@/lib/observability/with-api-route";

/** Same category union as Polls Manager: seeds plus every distinct poll.category in the database. */
export const GET = withObservedRoute("polls.categories", async () => {
  try {
    const categories = await loadPollCategoryCatalog();
    return NextResponse.json({ data: { categories } });
  } catch (loadError) {
    const message = loadError instanceof Error ? loadError.message : "Failed to load poll categories.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
