import type { NextConfig } from "next";

// Cache Components is off: every exam/auth page is per-request (session, server clock).
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
    serverActions: { bodySizeLimit: "5mb" }, // admin Excel/CSV uploads
  },
};

export default nextConfig;
