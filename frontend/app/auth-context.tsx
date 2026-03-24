"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { API_BASE } from "@/lib/api";

export type User = {
  id: number;
  username: string;
  email: string;
  auth_provider: "local" | "google";
  is_artist: boolean;
  is_producer: boolean;
  active_role: "artist" | "producer";
  artist_profile?: {
    stage_name?: string;
    avatar_obj?: string | null;
    bio?: string;
    genres?: string;
    verified?: boolean;
  } | null;
  producer_profile?: {
    producer_name?: string;
    avatar_obj?: string | null;
    headline?: string;
    bio?: string;
    genres?: string;
    verified?: boolean;
  } | null;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  meError: { status: number; bodyText: string } | null;
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (payload: { username: string; email: string; password: string }) => Promise<void>;
  switchRole: (role: "artist" | "producer") => Promise<void>;
  startSelling: () => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "beatkosh_access_token";
const REFRESH_KEY = "beatkosh_refresh_token";
const REFRESH_LEAD_MS = 60_000;

type ApiFailure = {
  status: number;
  bodyText: string;
};

function debugAuth(event: string, detail?: unknown) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }
  if (detail === undefined) {
    console.log(`[auth-debug] ${event}`);
    return;
  }
  console.log(`[auth-debug] ${event}`, detail);
}

function normalizePath(path: string) {
  if (path.endsWith("/") || path.includes("?") || path.includes("#")) {
    return path;
  }
  return `${path}/`;
}

function readStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return atob(padded);
}

function getTokenExpiryMs(token: string) {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }
    const parsed = JSON.parse(decodeBase64Url(payload)) as { exp?: number };
    return typeof parsed.exp === "number" ? parsed.exp * 1000 : null;
  } catch {
    return null;
  }
}

async function apiJson<T>(
  path: string,
  opts: { method?: string; token?: string | null; body?: unknown } = {},
): Promise<T> {
  const { method = "GET", token, body } = opts;
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = `${API_BASE}${normalizePath(path)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const err: ApiFailure = { status: 0, bodyText: `Fetch failed for ${url}: ${message}` };
    throw err;
  }

  const text = await res.text();
  if (!res.ok) {
    const err: ApiFailure = { status: res.status, bodyText: text };
    throw err;
  }

  if (res.status === 204 || text.trim() === "") {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const err: ApiFailure = { status: 200, bodyText: text.slice(0, 600) };
    throw err;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [meError, setMeError] = useState<{ status: number; bodyText: string } | null>(null);
  const refreshingRef = useRef(false);

  useEffect(() => {
    debugAuth("provider-mounted", { hasStoredToken: Boolean(readStoredToken()) });
    return () => debugAuth("provider-unmounted");
  }, []);

  useEffect(() => {
    debugAuth("loading-changed", { loading, bootstrapped, hasToken: Boolean(token), hasUser: Boolean(user) });
  }, [loading, bootstrapped, token, user]);

  const refreshMe = useCallback(async () => {
    if (!token) {
      return;
    }
    debugAuth("refreshMe-start");
    const me = await apiJson<User>("/account/me/", { token });
    setUser(me);
    setMeError(null);
    debugAuth("refreshMe-success", { username: me.username });
  }, [token]);

  const logout = useCallback(() => {
    debugAuth("logout");
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setToken(null);
    setUser(null);
    setMeError(null);
    setLoading(false);
  }, []);

  const tryRefreshAccess = useCallback(async () => {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!refresh) {
      debugAuth("refresh-skipped-no-refresh-token");
      return null;
    }

    debugAuth("refresh-start");
    const data = await apiJson<{ access: string }>("/account/token/refresh/", {
      method: "POST",
      body: { refresh },
    });

    if (!data?.access) {
      debugAuth("refresh-failed-no-access");
      return null;
    }

    const expiryMs = getTokenExpiryMs(data.access);
    debugAuth("refresh-success", {
      expiresInSec: expiryMs ? Math.round((expiryMs - Date.now()) / 1000) : null,
    });
    localStorage.setItem(TOKEN_KEY, data.access);
    setToken(data.access);
    return data.access;
  }, []);

  const ensureMe = useCallback(
    async (access?: string | null) => {
      const current = access ?? token;
      if (!current) {
        return;
      }

      try {
        debugAuth("ensureMe-start");
        const me = await apiJson<User>("/account/me/", { token: current });
        setUser(me);
        setMeError(null);
        debugAuth("ensureMe-success", { username: me.username });
      } catch (err) {
        const failure = err as Partial<ApiFailure>;
        const status = typeof failure.status === "number" ? failure.status : 0;
        debugAuth("ensureMe-failed", { status });

        if (status === 401 && !refreshingRef.current) {
          refreshingRef.current = true;
          try {
            const next = await tryRefreshAccess();
            if (next) {
              const me = await apiJson<User>("/account/me/", { token: next });
              setUser(me);
              setMeError(null);
              debugAuth("ensureMe-recovered-after-refresh", { username: me.username });
              return;
            }
          } catch {
          } finally {
            refreshingRef.current = false;
          }

          logout();
          return;
        }

        const bodyText = typeof failure.bodyText === "string" ? failure.bodyText : "";
        setMeError({ status, bodyText: bodyText.slice(0, 1200) });
        console.warn("[auth] failed to load /account/me", { status, body: bodyText });
        setUser(null);
      }
    },
    [logout, token, tryRefreshAccess],
  );

  useEffect(() => {
    const saved = readStoredToken();
    if (saved) {
      setToken(saved);
      debugAuth("bootstrap-found-token");
    } else {
      debugAuth("bootstrap-no-token");
      setLoading(false);
    }
    setBootstrapped(true);
  }, []);

  useEffect(() => {
    if (!bootstrapped) {
      return;
    }

    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        await ensureMe(token);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [bootstrapped, ensureMe, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const expiryMs = getTokenExpiryMs(token);
    if (!expiryMs) {
      debugAuth("refresh-timer-skipped-no-exp");
      return;
    }

    const delay = Math.max(expiryMs - Date.now() - REFRESH_LEAD_MS, 0);
    debugAuth("refresh-timer-scheduled", {
      delayMs: delay,
      expiresInSec: Math.round((expiryMs - Date.now()) / 1000),
    });

    const timeoutId = window.setTimeout(async () => {
      if (refreshingRef.current) {
        debugAuth("refresh-timer-skipped-already-refreshing");
        return;
      }

      refreshingRef.current = true;
      try {
        const next = await tryRefreshAccess();
        if (!next) {
          logout();
        }
      } catch {
        logout();
      } finally {
        refreshingRef.current = false;
      }
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [logout, token, tryRefreshAccess]);

  const completeLogin = useCallback(
    async (tokens: { access: string; refresh: string }, debugLabel: string) => {
      localStorage.setItem(TOKEN_KEY, tokens.access);
      localStorage.setItem(REFRESH_KEY, tokens.refresh);
      setToken(tokens.access);
      setLoading(true);

      await ensureMe(tokens.access);
      setLoading(false);
      debugAuth(debugLabel);
    },
    [ensureMe],
  );

  const login = useCallback(
    async (username: string, password: string) => {
      debugAuth("login-start", { username });
      const tokens = await apiJson<{ access: string; refresh: string }>("/account/login/", {
        method: "POST",
        body: { username, password },
      });

      await completeLogin(tokens, `login-success:${username}`);
    },
    [completeLogin],
  );

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      debugAuth("google-login-start");
      const tokens = await apiJson<{ access: string; refresh: string }>("/account/google/", {
        method: "POST",
        body: { credential },
      });

      await completeLogin(tokens, "google-login-success");
    },
    [completeLogin],
  );

  const register = useCallback(
    async (payload: { username: string; email: string; password: string }) => {
      await apiJson("/account/register/", {
        method: "POST",
        body: payload,
      });
      await login(payload.username, payload.password);
    },
    [login],
  );

  const switchRole = useCallback(
    async (role: "artist" | "producer") => {
      if (!token) {
        throw new Error("Login required");
      }
      await apiJson<{ active_role: "artist" | "producer" }>("/account/switch-role/", {
        method: "POST",
        token,
        body: { role },
      });
      await ensureMe(token);
    },
    [ensureMe, token],
  );

  const startSelling = useCallback(async () => {
    if (!token) {
      throw new Error("Login required");
    }
    const me = await apiJson<User>("/account/start-selling/", {
      method: "POST",
      token,
      body: {},
    });
    setUser(me);
  }, [token]);

  const value = useMemo(
    () => ({ user, token, loading, meError, login, loginWithGoogle, register, switchRole, startSelling, logout, refreshMe }),
    [user, token, loading, meError, login, loginWithGoogle, register, switchRole, startSelling, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
