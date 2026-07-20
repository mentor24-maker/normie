import { POLL_CATEGORY_JOIN } from "@/lib/poll-category-store";

export const POLL_ADMIN_SELECT = `id, category_id, ${POLL_CATEGORY_JOIN}, collection, question, deep_dive, deep_dive_youtube_url, deep_dive_blog_post_id, deep_dive_related_poll_ids, image_url, order_index, created_at, is_published, is_hidden, quality, poll_options(id, label, sort_order)`;

export const POLL_PICKER_SELECT = `id, category_id, ${POLL_CATEGORY_JOIN}, question, image_url, order_index`;

export const POLL_PUBLIC_SELECT = `id, question, deep_dive, deep_dive_youtube_url, deep_dive_blog_post_id, deep_dive_related_poll_ids, category_id, ${POLL_CATEGORY_JOIN}, image_url, order_index, is_published, poll_options(id, label, sort_order)`;

export const POLL_SHARE_SELECT = `id, category_id, ${POLL_CATEGORY_JOIN}, question, image_url, is_published, poll_options(id, label, sort_order)`;

export const POLL_GALLERY_LINK_SELECT = `id, category_id, ${POLL_CATEGORY_JOIN}, question, image_url`;

export const POLL_DEEP_DIVE_PEER_SELECT = `id, question, category_id, ${POLL_CATEGORY_JOIN}, order_index`;

export const POLL_REPAIR_SELECT = `id, category_id, ${POLL_CATEGORY_JOIN}, question, order_index, poll_options(id, label, sort_order)`;

export const POLL_PROFILE_SELECT = `id, poll_id, option_id, tokens_earned, polls(question, category_id, ${POLL_CATEGORY_JOIN}, poll_options(id, label))`;
