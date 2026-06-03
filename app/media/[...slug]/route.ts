import { getPublicMediaContentType, readPublicSiteMediaFile } from "@/lib/public-media";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await context.params;
  const asset = await readPublicSiteMediaFile(slug);

  if (!asset) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(asset.file, {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "public, max-age=86400, immutable"
    }
  });
}
