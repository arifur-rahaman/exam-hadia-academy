import type { NextConfig } from "next";

// Cache Components is off: every exam/auth page is per-request (session, server clock).
// Production builds use webpack (`next build --webpack`): Turbopack's CSS worker process
// cannot start on Hostinger's build servers.
const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "5mb" }, // admin Excel/CSV uploads
  },
};

export default nextConfig;
