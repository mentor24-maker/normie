import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthorizedAdminFromCookieStore } from "@/lib/admin-auth";
import {
  normalizeBuilderAssetUrl,
  normalizeProductType,
  rowToBuilderProduct,
  safeText
} from "@/lib/builder-template";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const cookieStore = await cookies();
  const admin = await getAuthorizedAdminFromCookieStore(cookieStore);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, product_type, product_url, image_url, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("products")
          ? "Missing products table. Run the updated Supabase schema."
          : error.message
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    products: (data ?? []).map((row) => rowToBuilderProduct(row))
  });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const admin = await getAuthorizedAdminFromCookieStore(cookieStore);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized admin request." }, { status: 401 });
  }

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
    return NextResponse.json({ error: "Product name is required." }, { status: 400 });
  }

  if (!productUrl) {
    return NextResponse.json({ error: "Product URL is required." }, { status: 400 });
  }

  if (!imageUrl) {
    return NextResponse.json({ error: "Image URL is required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      name,
      product_type: productType,
      product_url: productUrl,
      image_url: imageUrl,
      updated_at: new Date().toISOString()
    })
    .select("id, name, product_type, product_url, image_url, created_at, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        error: error?.message.includes("products")
          ? "Missing products table. Run the updated Supabase schema."
          : error?.message ?? "Failed to save product."
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ product: rowToBuilderProduct(data) }, { status: 201 });
}
