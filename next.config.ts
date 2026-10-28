import type { NextConfig } from "next";

// This app is almost entirely dynamic (auth-gated admin pages, live screen
// status, per-request data) -- the experimental Cache Components model adds
// prerendering friction without benefit here, so it stays off.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // Next's default is 1MB for whatever's posted to a Server Action --
    // image/video uploads in My Assets go through one (src/app/my/assets/
    // actions.ts), so anything over ~1MB was being rejected before it ever
    // reached our own code or the Supabase bucket's own 50MB cap. Raised
    // just past that 50MB cap so the bucket's limit is the real ceiling.
    serverActions: {
      bodySizeLimit: "55mb",
    },
  },
};

export default nextConfig;
