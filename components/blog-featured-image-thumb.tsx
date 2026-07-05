import {
  BLOG_FEATURED_IMAGE_THUMB_HEIGHT,
  BLOG_FEATURED_IMAGE_THUMB_WIDTH,
  normalizePublicBlogImageUrl,
  resolveBlogFeaturedImageAdminSrc
} from "@/lib/blog";

type BlogFeaturedImageThumbProps = {
  imageUrl: string;
  variant?: "admin" | "detail";
  alt?: string;
};

export function BlogFeaturedImageThumb({
  imageUrl,
  variant = "admin",
  alt = ""
}: BlogFeaturedImageThumbProps) {
  const src =
    variant === "admin" ? resolveBlogFeaturedImageAdminSrc(imageUrl) : normalizePublicBlogImageUrl(imageUrl);

  if (!src) {
    if (variant === "admin") {
      return <span className="polls-table-image-empty">—</span>;
    }

    return null;
  }

  if (variant === "detail") {
    return <img alt={alt} className="blog-post-featured-image" loading="lazy" src={src} />;
  }

  return (
    <img
      alt={alt}
      className="admin-blog-post-thumb"
      height={BLOG_FEATURED_IMAGE_THUMB_HEIGHT}
      loading="lazy"
      src={src}
      width={BLOG_FEATURED_IMAGE_THUMB_WIDTH}
    />
  );
}
