import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveBackendOrigin() {
  const configured = (process.env.NEXT_PUBLIC_BACKEND_ORIGIN ?? "http://127.0.0.1:8000").trim();
  return configured.replace(/\/$/, "");
}

type RouteContext = { params: Promise<{ path: string[] }> };

type StreamingRequestInit = RequestInit & { duplex?: "half" };

async function proxy(request: NextRequest, context: RouteContext) {
  const origin = resolveBackendOrigin();
  const { path } = await context.params;
  const pathStr = path.join("/");
  const pathname = request.nextUrl.pathname;
  const trailingSlash = pathname.endsWith("/") ? "/" : "";
  const targetUrl = `${origin}/${pathStr}${trailingSlash}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  // Useful dev-only diagnostics for auth issues (do not log full tokens).
  if (pathStr.startsWith("api/v1/account/")) {
    const auth = headers.get("authorization");
    const fingerprint = auth ? `${auth.slice(0, 18)}...` : "missing";
    // eslint-disable-next-line no-console
    console.log(`[backend-proxy] ${request.method} /${pathStr} auth=${fingerprint}`);
  }

  const method = request.method.toUpperCase();
  const init: StreamingRequestInit = {
    method,
    headers,
    redirect: "follow",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error(`[backend-proxy] upstream fetch failed ${method} ${targetUrl}: ${message}`);
    return new Response(
      JSON.stringify({
        detail: "Backend proxy upstream fetch failed",
        method,
        targetUrl,
        message,
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (pathStr.startsWith("api/v1/account/")) {
    // eslint-disable-next-line no-console
    console.log(`[backend-proxy] -> ${upstream.status} ${upstream.statusText}`);
  }

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("transfer-encoding");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}
