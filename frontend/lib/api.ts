function resolveApiBase() {
  const configured = (process.env.NEXT_PUBLIC_API_BASE_PATH ?? "").trim();
  if (!configured) {
    return "/api/v1";
  }
  return configured;
}

export const API_BASE = resolveApiBase();
const BACKEND_ORIGIN = (process.env.NEXT_PUBLIC_BACKEND_ORIGIN ?? "http://127.0.0.1:8000").replace(/\/$/, "");

function resolveProxyApiBase() {
  if (API_BASE.startsWith("/backend/")) {
    return API_BASE;
  }
  if (API_BASE.startsWith("/api/")) {
    return `/backend${API_BASE}`;
  }
  return API_BASE;
}

const PROXY_API_BASE = resolveProxyApiBase();

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ApiOptions = {
  method?: HttpMethod;
  token?: string | null;
  body?: unknown;
  isFormData?: boolean;
};

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", token, body, isFormData = false } = options;
  const normalizedPath =
    path.endsWith("/") || path.includes("?") || path.includes("#") ? path : `${path}/`;
  const requestBase = isFormData ? PROXY_API_BASE : API_BASE;
  const headers: HeadersInit = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${requestBase}${normalizedPath}`, {
    method,
    headers,
    body: body ? (isFormData ? (body as FormData) : JSON.stringify(body)) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `API request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }
  return (await response.json()) as T;
}

export function resolveMediaUrl(raw?: string | null) {
  if (!raw) {
    return "";
  }
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  if (raw.startsWith("/media/")) {
    return `${BACKEND_ORIGIN}${raw}`;
  }
  if (raw.startsWith("media/")) {
    return `${BACKEND_ORIGIN}/${raw}`;
  }
  if (raw.startsWith("/")) {
    return `${BACKEND_ORIGIN}${raw}`;
  }
  return `${BACKEND_ORIGIN}/${raw}`;
}

