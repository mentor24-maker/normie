import { sanitizeBlogBodyHtml } from "@/lib/sanitize-html";

export function BlogPostBody({ html }: { html: string }) {
  const safeHtml = sanitizeBlogBodyHtml(html);

  if (!safeHtml) {
    return null;
  }

  return <div className="blog-post-body" dangerouslySetInnerHTML={{ __html: safeHtml }} />;
}
