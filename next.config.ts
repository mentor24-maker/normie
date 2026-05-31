import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
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