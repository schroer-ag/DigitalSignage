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
};

export default nextConfig;
