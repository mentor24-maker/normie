import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
  allowedDevOrigins: ["127.0.0.1"],
  // Disables the legacy __NEXT_DEV_INDICATOR env flag. The App Router devtools overlay
  // (building/rendering bar) is turned off via scripts/ensure-devtools-config.mjs and
  // components/dev-indicator-suppressor.tsx.
  devIndicators: false,
  async redirects() {
    return [
      {
        // Legacy alias; the page previously lived at /portal/tokens.
        source: "/portal/tokens",
        destination: "/portal/token",
        permanent: true
      }
    ];
  },
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