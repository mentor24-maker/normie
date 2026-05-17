import type { PollCategoryFilter } from "@/src/site/home/types";

export function PollCategoryHeadline({ category }: { category: PollCategoryFilter }) {
  return <h2 className="poll-category-headline">Category: {category.name}</h2>;
}
