import type { NextConfig } from "next";

const allowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function resolveRemoteImagePatterns() {
  const backendOrigin = (process.env.NEXT_PUBLIC_BACKEND_ORIGIN ?? "http://127.0.0.1:8000").replace(/\/$/, "");

  try {
    const url = new URL(backendOrigin);
    return [
      {
        protocol: url.protocol.replace(":", ""),
        hostname: url.hostname,
        port: url.port,
        pathname: "/media/**",
      },
    ];
  } catch {
    return [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",
      },
    ];
  }
}

const nextConfig: NextConfig = {
  trailingSlash: true,
  ...(allowedDevOrigins.length ? { allowedDevOrigins } : {}),
  images: {
    remotePatterns: resolveRemoteImagePatterns(),
  },
  async rewrites() {
    const backendOrigin = (process.env.NEXT_PUBLIC_BACKEND_ORIGIN ?? "http://127.0.0.1:8000").replace(/\/$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
      {
        source: "/backend/:path*",
        destination: `${backendOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
