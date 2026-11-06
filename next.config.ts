import type { NextConfig } from "next";

// Where the Next.js server forwards /api/* requests. Read at BUILD time.
// Production (CI/CD): http://127.0.0.1:4105 — the backend on the same server, never exposed directly.
// Local dev: the backend on port 4000.
const backendUrl = process.env.BACKEND_INTERNAL_URL ?? 'http://127.0.0.1:4000';

const nextConfig: NextConfig = {
  // Self-contained server build (.next/standalone) that the deploy ships to the server.
  output: 'standalone',
  // Lets other devices on the office Wi-Fi use the dev site through this PC's IP.
  allowedDevOrigins: ['192.168.219.52'],
  // Browser calls /api/... on the same domain; Next.js passes them to the backend.
  // Production builds set NEXT_PUBLIC_API_BASE_URL=/api, so no backend port is public and no CORS is needed.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backendUrl}/:path*` }];
  },
};

export default nextConfig;
