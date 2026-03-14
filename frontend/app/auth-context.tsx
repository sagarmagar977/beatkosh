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
  is_artist: boolean;
  is_producer: boolean;
  active_role: "artist" | "producer";
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  meError: { status: number; bodyText: string } | null;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: { username: string; email: string; password: string }) => Promise<void>;
  switchRole: (role: "artist" | "producer") => Promise<void>;
  startSelling: () => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "beatkosh_access_token";
const REFRESH_KEY = "beatkosh_refresh_token";

type ApiFailure = {
  status: number;
  bodyText: string;
};

function normalizePath(path: string) {
  if (path.endsWith("/") || path.includes("?") || path.includes("#")) {
    return path;
  }
  return `${path}/`;
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
    // Fetch threw before receiving any HTTP response (network error, blocked request, proxy crash, etc).
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
  const [meError, setMeError] = useState<{ status: number; bodyText: string } | null>(null);
  const refreshingRef = useRef(false);

  const refreshMe = useCallback(async () => {
    if (!token) {
      return;
    }
    const me = await apiJson<User>("/account/me/", { token });
    setUser(me);
    setMeError(null);
  }, [token]);

  const tryRefreshAccess = useCallback(async () => {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!refresh) {
      return null;
    }

    const data = await apiJson<{ access: string }>("/account/token/refresh/", {
      method: "POST",
      body: { refresh },
    });

    if (!data?.access) {
      return null;
    }

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
        const me = await apiJson<User>("/account/me/", { token: current });
        setUser(me);
        setMeError(null);
      } catch (err) {
        const failure = err as Partial<ApiFailure>;
        const status = typeof failure.status === "number" ? failure.status : 0;

        if (status === 401 && !refreshingRef.current) {
          refreshingRef.current = true;
          try {
            const next = await tryRefreshAccess();
            if (next) {
              const me = await apiJson<User>("/account/me/", { token: next });
              setUser(me);
              return;
            }
          } catch {
            // fall through
          } finally {
            refreshingRef.current = false;
          }

          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_KEY);
          setToken(null);
          setUser(null);
          setMeError(null);
          return;
        }

        // Non-401 errors should not log the user out (prevents redirect loops).
        const bodyText = typeof failure.bodyText === "string" ? failure.bodyText : "";
        setMeError({ status, bodyText: bodyText.slice(0, 1200) });
        // eslint-disable-next-line no-console
        console.warn("[auth] failed to load /account/me", { status, body: bodyText });
        setUser(null);
      }
    },
    [token, tryRefreshAccess],
  );

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) {
      setToken(saved);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token) {
        return;
      }
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
  }, [ensureMe, token]);

  const login = useCallback(
    async (username: string, password: string) => {
      const tokens = await apiJson<{ access: string; refresh: string }>("/account/login/", {
        method: "POST",
        body: { username, password },
      });

      localStorage.setItem(TOKEN_KEY, tokens.access);
      localStorage.setItem(REFRESH_KEY, tokens.refresh);
      setToken(tokens.access);

      await ensureMe(tokens.access);
    },
    [ensureMe],
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

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_KEY);
          setToken(null);
          setUser(null);
          setMeError(null);
  }, []);

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
    () => ({ user, token, loading, meError, login, register, switchRole, startSelling, logout, refreshMe }),
    [user, token, loading, meError, login, register, switchRole, startSelling, logout, refreshMe],
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


