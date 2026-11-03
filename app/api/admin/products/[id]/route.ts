import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin-route-auth";
import {
  normalizeBuilderAssetUrl,
  normalizeProductType,
  rowToBuilderProduct,
  safeText
} from "@/lib/builder-template";
import { createAdminClient } from "@/lib/supabase-admin";

type ProductRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: ProductRouteContext) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    name?: unknown;
    productType?: unknown;
    productUrl?: unknown;
    imageUrl?: unknown;
  };
  const name = safeText(body.name, 255);
  const productType = normalizeProductType(body.productType);
  const productUrl = normalizeBuilderAssetUrl(body.productUrl);
  const imageUrl = normalizeBuilderAssetUrl(body.imageUrl);

  if (!name) {
    return auth.finish(NextResponse.json({ error: "Product name is required." }, { status: 400 }));
  }

  if (!productUrl) {
    return auth.finish(NextResponse.json({ error: "Product URL is required." }, { status: 400 }));
  }

  if (!imageUrl) {
    return auth.finish(NextResponse.json({ error: "Image URL is required." }, { status: 400 }));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .update({
      name,
      product_type: productType,
      product_url: productUrl,
      image_url: imageUrl,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("id, name, product_type, product_url, image_url, created_at, updated_at")
    .single();

  if (error || !data) {
    return auth.finish(NextResponse.json(
      { error: error?.message ?? "Failed to save product." },
      { status: 500 }
    ));
  }

  return auth.finish(NextResponse.json({ product: rowToBuilderProduct(data) }));
}

export async function DELETE(_request: Request, context: ProductRouteContext) {
  const auth = await requireAdminRoute("content:write");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    return auth.finish(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return auth.finish(NextResponse.json({ ok: true }));
}
