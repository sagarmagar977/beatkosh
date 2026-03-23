import type { NextConfig } from "next";

const allowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

type RemotePattern = Exclude<NonNullable<NextConfig["images"]>["remotePatterns"], undefined>[number];

function resolveProtocol(value: string): "http" | "https" {
  return value === "https:" ? "https" : "http";
}

function createRemotePattern(protocol: "http" | "https", hostname: string, port: string): RemotePattern {
  return {
    protocol,
    hostname,
    port,
    pathname: "/media/**",
  };
}

function resolveRemoteImagePatterns(): RemotePattern[] {
  const backendOrigin = (process.env.NEXT_PUBLIC_BACKEND_ORIGIN ?? "http://127.0.0.1:8000").replace(/\/$/, "");

  try {
    const url = new URL(backendOrigin);
    return [createRemotePattern(resolveProtocol(url.protocol), url.hostname, url.port)];
  } catch {
    return [createRemotePattern("http", "127.0.0.1", "8000")];
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
