/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL?.replace(/\/+$/, "");
    if (!backendUrl) return [];

    return [
      { source: "/api/auth/:path*", destination: `${backendUrl}/api/auth/:path*` },
      { source: "/api/users/:path*", destination: `${backendUrl}/api/users/:path*` },
      { source: "/api/metrics", destination: `${backendUrl}/api/metrics` },
      { source: "/api/health", destination: `${backendUrl}/api/health` }
    ];
  }
};

module.exports = nextConfig;
