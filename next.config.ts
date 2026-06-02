import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // Next.js 15.2+ route/compile chip at the bottom-left in dev (not app UI).
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rktztfvkjctixyymdkyj.supabase.co",
        pathname: "/storage/v1/object/public/**"
      },
      {
        protocol: "https",
        hostname: "rktztfvkjctixyymdkyj.supabase.co",
        pathname: "/storage/v1/render/image/public/**"
      }
    ]
  }
};

export default nextConfig;