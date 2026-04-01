function resolveApiBase() {
  const configured = (process.env.NEXT_PUBLIC_API_BASE_PATH ?? "").trim();
  if (!configured) {
    return "/api/v1";
  }
  return configured;
}

export const API_BASE = resolveApiBase();
const BACKEND_ORIGIN = (process.env.NEXT_PUBLIC_BACKEND_ORIGIN ?? "http://127.0.0.1:8000").replace(/\/$/, "");
const API_CACHE_STORAGE_KEY = "beatkosh_api_cache_v1";

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

type ApiCacheScope = "public" | "session";

type ApiCacheOptions = {
  ttlMs: number;
  scope?: ApiCacheScope;
  persist?: boolean;
};

type ApiCacheEntry = {
  value: unknown;
  expiresAt: number;
  scope: ApiCacheScope;
};

const memoryCache = new Map<string, ApiCacheEntry>();
const inFlightCache = new Map<string, Promise<unknown>>();

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getNormalizedPath(path: string) {
  return path.endsWith("/") || path.includes("?") || path.includes("#") ? path : `${path}/`;
}

function loadPersistedCache() {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    const raw = storage.getItem(API_CACHE_STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as Record<string, ApiCacheEntry>;
    const now = Date.now();
    Object.entries(parsed).forEach(([key, entry]) => {
      if (entry && entry.expiresAt > now) {
        memoryCache.set(key, entry);
      }
    });
  } catch {
    storage.removeItem(API_CACHE_STORAGE_KEY);
  }
}

function persistCache() {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    const now = Date.now();
    const persistableEntries = Object.fromEntries(
      [...memoryCache.entries()].filter(([, entry]) => entry.expiresAt > now),
    );
    storage.setItem(API_CACHE_STORAGE_KEY, JSON.stringify(persistableEntries));
  } catch {
    storage.removeItem(API_CACHE_STORAGE_KEY);
  }
}

loadPersistedCache();

function buildCacheKey(path: string, options: ApiOptions, scope: ApiCacheScope) {
  const method = options.method ?? "GET";
  const normalizedPath = getNormalizedPath(path);
  return `${scope}:${method}:${normalizedPath}`;
}

export function clearSessionApiCache() {
  let changed = false;
  [...memoryCache.entries()].forEach(([key, entry]) => {
    if (entry.scope === "session") {
      memoryCache.delete(key);
      changed = true;
    }
  });
  [...inFlightCache.keys()].forEach((key) => {
    if (key.startsWith("session:")) {
      inFlightCache.delete(key);
    }
  });
  if (changed) {
    persistCache();
  }
}

export function invalidateApiCache(pathPrefix?: string) {
  const normalizedPrefix = pathPrefix ? getNormalizedPath(pathPrefix).replace(/\?$/, "") : null;
  let changed = false;

  [...memoryCache.keys()].forEach((key) => {
    if (!normalizedPrefix || key.includes(normalizedPrefix)) {
      memoryCache.delete(key);
      changed = true;
    }
  });
  [...inFlightCache.keys()].forEach((key) => {
    if (!normalizedPrefix || key.includes(normalizedPrefix)) {
      inFlightCache.delete(key);
    }
  });

  if (changed) {
    persistCache();
  }
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", token, body, isFormData = false } = options;
  const normalizedPath = getNormalizedPath(path);
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

export async function apiCachedRequest<T>(
  path: string,
  options: ApiOptions = {},
  cacheOptions: ApiCacheOptions,
): Promise<T> {
  const method = options.method ?? "GET";
  if (method !== "GET") {
    return apiRequest<T>(path, options);
  }

  const scope = cacheOptions.scope ?? (options.token ? "session" : "public");
  const cacheKey = buildCacheKey(path, options, scope);
  const now = Date.now();
  const existing = memoryCache.get(cacheKey);
  if (existing && existing.expiresAt > now) {
    return existing.value as T;
  }

  const pending = inFlightCache.get(cacheKey);
  if (pending) {
    return pending as Promise<T>;
  }

  const request = apiRequest<T>(path, options)
    .then((value) => {
      memoryCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + cacheOptions.ttlMs,
        scope,
      });
      if (cacheOptions.persist !== false) {
        persistCache();
      }
      return value;
    })
    .finally(() => {
      inFlightCache.delete(cacheKey);
    });

  inFlightCache.set(cacheKey, request as Promise<unknown>);
  return request;
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
  if (
    raw.startsWith("beats/") ||
    raw.startsWith("soundkits/") ||
    raw.startsWith("avatars/") ||
    raw.startsWith("profiles/")
  ) {
    return `${BACKEND_ORIGIN}/media/${raw}`;
  }
  if (raw.startsWith("/")) {
    return `${BACKEND_ORIGIN}${raw}`;
  }
  return `${BACKEND_ORIGIN}/media/${raw}`;
}
