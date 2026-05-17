"use client";

import { useSearchParams } from "next/navigation";
import { getPollCategoryMeta } from "@/lib/poll-categories";
import { PollCategoryHeadline } from "@/src/site/home/partials/poll-category-headline";

export function BuilderPollCategoryBanner() {
  const categoryParam = useSearchParams()?.get("category")?.trim() ?? "";
  const category = getPollCategoryMeta(categoryParam);

  if (!category) {
    return null;
  }

  return (
    <div className="builder-preview-poll-category-row">
      <PollCategoryHeadline category={category} />
    </div>
  );
}
