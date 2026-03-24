"use client";

import { Compass, Home, Search, ShoppingCart } from "lucide-react";
import { SunMoon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";

import { AuthScreen } from "@/app/auth-screen";
import { useAuth } from "@/app/auth-context";
import { AppBootSkeleton } from "@/app/page-skeletons";
import { useTheme } from "@/app/providers";
import { GlobalPlayer } from "@/components/global-player";
import { apiRequest, resolveMediaUrl } from "@/lib/api";

const GLOBAL_FLASH_SESSION_KEY = "beatkosh-global-flash";

type AppNotification = {
  id: number;
  notification_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  actor_id: number;
  actor_username: string;
  beat_id?: number | null;
  beat_title?: string | null;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const HEADER_CLEARANCE_PX = 3;
  const DEFAULT_HEADER_HEIGHT = 112;
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, loading, logout, startSelling, switchRole, refreshMe, meError } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [hoverMenuOpen, setHoverMenuOpen] = useState<string | null>(null);
  const [pinnedMenuOpen, setPinnedMenuOpen] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [startSellingBusy, setStartSellingBusy] = useState(false);
  const [startSellingError, setStartSellingError] = useState<string | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [allowDegradedSession, setAllowDegradedSession] = useState(false);
  const [uploadPickerOpen, setUploadPickerOpen] = useState(false);
  const [globalFlash, setGlobalFlash] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const userMenuCloseTimeout = useRef<number | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(DEFAULT_HEADER_HEIGHT);

  const hasSession = Boolean(token);
  const profileHref = user?.is_producer ? "/producer/profile" : null;
  const avatarUrl = resolveMediaUrl(user?.producer_profile?.avatar_obj);
  const avatarFallback = (user?.producer_profile?.producer_name || user?.username || "U").slice(0, 1).toUpperCase();

  const normalizedPath = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const producerWorkspaceRoutes = ["/producer/profile", "/producer/upload-wizard", "/producer/settings", "/producer/media-uploads", "/dashboard/selling", "/wallet"];
  const isProducerWorkspaceRoute = producerWorkspaceRoutes.some((route) => normalizedPath === route || normalizedPath.startsWith(`${route}/`));
  const publicAuthRoutes = ["/auth/login", "/auth/register"];
  const isPublicAuthRoute = publicAuthRoutes.includes(normalizedPath);
  const isProtectedRoute = !isPublicAuthRoute;
  const hideGlobalPlayer = normalizedPath.startsWith("/producer/upload-wizard");
  const isOrdersRoute = normalizedPath === "/orders";
  const isActivityRoute = normalizedPath === "/activity";

  useEffect(() => {
    if (loading) {
      return;
    }
    if (isProtectedRoute && !hasSession) {
      router.replace("/auth/login");
      return;
    }
    if (isPublicAuthRoute && hasSession) {
      router.replace("/");
      return;
    }
    if (!user || !isProducerWorkspaceRoute) {
      return;
    }

    const redirectToListening = (message: string) => {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(GLOBAL_FLASH_SESSION_KEY, message);
      }
      router.replace("/dashboard/listening");
    };

    if (!user.is_producer) {
      redirectToListening("Enable producer mode first to access the seller workspace.");
      return;
    }
    if (user.active_role !== "producer") {
      redirectToListening("Switch to producer mode from your avatar menu to access the seller workspace.");
    }
  }, [hasSession, isProducerWorkspaceRoute, isProtectedRoute, isPublicAuthRoute, loading, router, user]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPinnedMenuOpen(null);
        setHoverMenuOpen(null);
        setNotificationsOpen(false);
        setUserMenuOpen(false);
        setUploadPickerOpen(false);
      }
    };

    const onPointerDown = (event: MouseEvent | PointerEvent) => {
      if (!navRef.current) {
        return;
      }
      if (navRef.current.contains(event.target as Node)) {
        return;
      }
      setPinnedMenuOpen(null);
      setHoverMenuOpen(null);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const raw = window.sessionStorage.getItem(GLOBAL_FLASH_SESSION_KEY);
    if (!raw) {
      return;
    }
    setGlobalFlash(raw);
    window.sessionStorage.removeItem(GLOBAL_FLASH_SESSION_KEY);
    const timer = window.setTimeout(() => setGlobalFlash(null), 3200);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const syncHeaderHeight = () => {
      setHeaderHeight(headerRef.current?.offsetHeight ?? DEFAULT_HEADER_HEIGHT);
    };

    syncHeaderHeight();
    window.addEventListener("resize", syncHeaderHeight);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && headerRef.current) {
      resizeObserver = new ResizeObserver(syncHeaderHeight);
      resizeObserver.observe(headerRef.current);
    }

    return () => {
      window.removeEventListener("resize", syncHeaderHeight);
      resizeObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!token || !notificationsOpen) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      setNotificationsLoading(true);
      try {
        const data = await apiRequest<AppNotification[]>("/account/notifications/me/", { token });
        if (!cancelled) {
          setNotifications(data);
        }
        await apiRequest("/account/notifications/read/", { method: "POST", token, body: {} });
        if (!cancelled) {
          setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
        }
      } catch {
      } finally {
        if (!cancelled) {
          setNotificationsLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [notificationsOpen, token]);

  const openMenuKey = pinnedMenuOpen ?? hoverMenuOpen;
  const isBrowseActive = normalizedPath === "/activity";
  const isHomeActive =
    normalizedPath === "/" || normalizedPath === "/dashboard/listening" || normalizedPath === "/dashboard/selling";

  const switchRoleInPlace = useCallback(
    async (role: "artist" | "producer") => {
      await switchRole(role);
      setUserMenuOpen(false);
      setPinnedMenuOpen(null);
      setHoverMenuOpen(null);
      router.refresh();
    },
    [router, switchRole],
  );

  const cancelUserMenuClose = () => {
    if (userMenuCloseTimeout.current) {
      window.clearTimeout(userMenuCloseTimeout.current);
    }
  };

  const closeUserMenuSoon = () => {
    cancelUserMenuClose();
    userMenuCloseTimeout.current = window.setTimeout(() => {
      setUserMenuOpen(false);
    }, 120);
  };

  const runSearch = () => {
    const next = searchQuery.trim();
    setPinnedMenuOpen(null);
    setHoverMenuOpen(null);
    router.push(next ? `/beats?query=${encodeURIComponent(next)}` : "/beats");
  };

  if (isPublicAuthRoute) {
    return <AuthScreen mode={normalizedPath === "/auth/register" ? "register" : "login"} />;
  }

  if (loading) {
    return <AppBootSkeleton />;
  }

  if (hasSession && !user && !allowDegradedSession) {
    const isNetworkFailure = meError?.status === 0;
    return (
      <div className="mx-auto flex min-h-screen max-w-[520px] flex-col items-center justify-center gap-4 px-6 text-center theme-text-main">
        <p className="text-sm theme-text-muted">Signed in, but we could not load your profile.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={async () => {
              try {
                await refreshMe();
              } catch {
                // ignore
              }

            }}
            className="theme-soft rounded-full px-4 py-2 text-xs theme-text-soft"
          >
            Retry
          </button>
          {isNetworkFailure ? (
            <button
              type="button"
              onClick={() => setAllowDegradedSession(true)}
              className="theme-soft rounded-full px-4 py-2 text-xs theme-text-soft"
            >
              Continue
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/auth/login");
            }}
            className="theme-soft rounded-full px-4 py-2 text-xs theme-text-soft"
          >
            Logout
          </button>
        </div>
        <div className="theme-surface-muted mt-1 w-full max-w-[520px] rounded-2xl p-4 text-left">
          <p className="text-xs theme-text-muted">/account/me failed{meError ? ` (status ${meError.status})` : ""}:</p>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/20 p-3 text-[11px] theme-text-soft">{meError?.bodyText ?? "No details"}</pre>
        </div>
        {isNetworkFailure ? (
          <p className="text-xs theme-text-faint">
            You can continue while the backend is unreachable, but some features may fail.
          </p>
        ) : null}
      </div>
    );
  }


  // Legacy-route guard removed now that auth context is unified.

  return (
    <div
      className={isOrdersRoute || isActivityRoute ? "app-theme flex h-screen flex-col overflow-hidden" : "app-theme min-h-screen"}
      style={
        {
          "--app-header-height": `${headerHeight}px`,
          paddingTop: `calc(var(--app-header-height) + ${HEADER_CLEARANCE_PX}px)`,
        } as CSSProperties
      }
    >
      <header ref={headerRef} className="theme-header fixed inset-x-0 top-0 z-[110] isolate border-b shadow-[0_14px_34px_rgba(0,0,0,0.32)]" style={{ borderColor: "var(--line)" }}>
        <div className="absolute inset-0 -z-10 bg-[#0b0b0f]" aria-hidden="true" />
        <div className="relative z-10 flex w-full items-center gap-3 bg-[#0b0b0f] px-3 py-3 md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-4 md:px-4 lg:px-5">
          <Link href="/" className="hidden shrink-0 text-3xl font-black tracking-[-0.07em] md:block" style={{ color: "var(--brand)" }}>
            B
          </Link>

          <div className="hidden min-w-0 items-center justify-center md:flex">
            <div className="flex min-w-0 items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPinnedMenuOpen(null);
                  setHoverMenuOpen(null);
                  router.push("/");
                }}
                className={`pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  isHomeActive
                    ? "border-white/18 bg-[#241e2b] text-white"
                    : "border-white/10 bg-[#1c1722] text-white/72 hover:bg-[#26202e]"
                }`}
                aria-label="Go home"
                title="Home"
              >
                <Home className="h-4.5 w-4.5" strokeWidth={2} aria-hidden="true" />
              </button>

              <form
                className="pointer-events-auto flex h-11 min-w-0 w-full max-w-[420px] items-center rounded-full border border-white/10 bg-[#1c1722] px-3 shadow-[0_12px_34px_rgba(0,0,0,0.2)] lg:max-w-[500px] lg:px-3.5 xl:w-[460px]"
                onSubmit={(event) => {
                  event.preventDefault();
                  runSearch();
                }}
              >
                <button
                  type="submit"
                  className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-white/58 transition hover:bg-[#2a2432] hover:text-white"
                  aria-label="Search"
                >
                  <Search className="h-[1.1rem] w-[1.1rem]" strokeWidth={2} aria-hidden="true" />
                </button>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => {
                    setPinnedMenuOpen("Browse");
                    setHoverMenuOpen("Browse");
                  }}
                  className="min-w-0 flex-1 bg-transparent text-[0.92rem] text-white outline-none placeholder:text-white/40"
                  placeholder="What do you want to play?"
                />
                <div className="mx-2.5 h-6 w-px bg-white/10" />
                <button
                  type="button"
                  onClick={() => {
                    setPinnedMenuOpen("Browse");
                    setHoverMenuOpen("Browse");
                    router.push("/activity");
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/58 transition hover:bg-[#2a2432] hover:text-white"
                  aria-label="Open browse"
                  title="Browse"
                >
                  <Compass className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>

          <Link href="/" className="text-3xl font-black tracking-[-0.07em] md:hidden" style={{ color: "var(--brand)" }}>
            B
          </Link>

          <div className="ml-auto flex items-center gap-1.5 md:ml-0 md:justify-self-end sm:gap-2">
            <button
              type="button"
              onClick={() => setNotificationsOpen((s) => !s)}
              className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#1c1722] px-0 text-xs text-white/72 transition hover:bg-[#26202e] hover:text-white"
              aria-label="Notifications"
            >
              <span className="sr-only">Notifications</span>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                <path d="M10 21a2 2 0 0 0 4 0" />
              </svg>
            </button>

            <Link
              href="/orders"
              className="relative hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#1c1722] text-xs text-white/72 transition hover:bg-[#26202e] hover:text-white lg:inline-flex"
              aria-label="Cart"
              title="Cart"
            >
              <ShoppingCart className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
            </Link>

            <button
              type="button"
              onClick={toggleTheme}
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#1c1722] text-white/72 transition hover:bg-[#26202e] hover:text-white lg:inline-flex"
              aria-label="Toggle color mode"
              title="Toggle color mode"
            >
              <SunMoon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </button>

            {!user?.is_producer ? (
              <button
                type="button"
                onClick={async () => {
                  setStartSellingBusy(true);
                  setStartSellingError(null);
                  try {
                    await startSelling();
                    router.push("/producer/profile");
                  } catch (err) {
                    setStartSellingError(err instanceof Error ? err.message : "Unable to start selling");
                  } finally {
                    setStartSellingBusy(false);
                  }
                }}
                disabled={startSellingBusy}
                className="rounded-full bg-gradient-to-r from-[#8b28ff] via-[#7b32ff] to-[#4b7dff] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-60 sm:px-4 sm:text-xs"
              >
                {startSellingBusy ? "Starting..." : "Start Selling"}
              </button>
            ) : user.active_role === "producer" ? (
              <button
                type="button"
                onClick={() => setUploadPickerOpen(true)}
                className="rounded-full bg-gradient-to-r from-[#8b28ff] via-[#7b32ff] to-[#4b7dff] px-3 py-2 text-[11px] font-semibold text-white sm:px-4 sm:text-xs"
              >
                Upload
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  setStartSellingBusy(true);
                  setStartSellingError(null);
                  try {
                    await switchRoleInPlace("producer");
                  } catch (err) {
                    setStartSellingError(err instanceof Error ? err.message : "Unable to switch to producer mode");
                  } finally {
                    setStartSellingBusy(false);
                  }
                }}
                disabled={startSellingBusy}
                className="rounded-full bg-gradient-to-r from-[#2d3348] via-[#3b4663] to-[#56637f] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-60 sm:px-4 sm:text-xs"
              >
                {startSellingBusy ? "Switching..." : "Producer Mode"}
              </button>
            )}

            <div
              className="relative"
              onMouseLeave={closeUserMenuSoon}
            >
              <button
                type="button"
                onClick={() => {
                  cancelUserMenuClose();
                  setUserMenuOpen((current) => !current);
                }}
                onFocus={cancelUserMenuClose}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#1c1722] text-xs font-semibold text-white"
                aria-label="Open user menu"
                aria-expanded={userMenuOpen}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user?.producer_profile?.producer_name || user?.username || "User avatar"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  avatarFallback
                )}
              </button>

              <div
                className={`theme-menu absolute right-0 top-[46px] z-50 w-[min(260px,calc(100vw-1.5rem))] rounded-2xl p-3 backdrop-blur-xl transition-all duration-220 ease-out ${userMenuOpen ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-2 scale-[0.98] opacity-0"}`}
                onMouseEnter={cancelUserMenuClose}
                onMouseLeave={closeUserMenuSoon}
              >
                <p className="px-2 pb-2 text-xs theme-text-faint">Signed in as {user?.username ?? ""}</p>
                {user?.is_producer ? (
                  <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                    <p className="px-1 pb-2 text-[11px] uppercase tracking-[0.18em] theme-text-faint">Mode</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(["artist", "producer"] as const).map((role) => {
                        const active = user.active_role === role;
                        return (
                          <button
                            key={role}
                            type="button"
                            disabled={active}
                            onClick={async () => {
                              try {
                                await switchRoleInPlace(role);
                              } catch (err) {
                                setStartSellingError(err instanceof Error ? err.message : "Unable to switch mode");
                              }
                            }}
                            className={`rounded-xl px-3 py-2 text-sm font-medium capitalize transition ${active ? "bg-[#f6b067] text-[#20150e]" : "theme-soft theme-text-soft"}`}
                          >
                            {role}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-2">
                  {profileHref && user?.active_role === "producer" ? (
                    <Link
                      href={profileHref}
                      className="theme-soft rounded-xl px-3 py-2 text-sm theme-text-soft"
                    >
                      My Profile
                    </Link>
                  ) : null}
                  <Link
                    href={user?.active_role === "producer" ? "/dashboard/selling" : "/dashboard/listening"}
                    className="theme-soft rounded-xl px-3 py-2 text-sm theme-text-soft"
                  >
                    {user?.active_role === "producer" ? "Seller Dashboard" : "Listening Dashboard"}
                  </Link>
                  {user?.active_role === "producer" ? (
                    <>
                      <Link
                        href="/producer/media-uploads"
                        className="theme-soft rounded-xl px-3 py-2 text-sm theme-text-soft"
                      >
                        Media Uploads
                      </Link>
                      <Link
                        href="/producer/settings"
                        className="theme-soft rounded-xl px-3 py-2 text-sm theme-text-soft"
                      >
                        Seller Settings
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/library"
                      className="theme-soft rounded-xl px-3 py-2 text-sm theme-text-soft"
                    >
                      Library
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="theme-soft rounded-xl px-3 py-2 text-left text-sm theme-text-soft"
                  >
                    Toggle {theme === "dark" ? "light" : "dark"} mode
                  </button>
                  <button
                    type="button"
                    disabled={logoutBusy}
                    onClick={() => {
                      setLogoutBusy(true);
                      try {
                        logout();
                      } finally {
                        setLogoutBusy(false);
                        setUserMenuOpen(false);
                        router.replace("/auth/login");
                      }
                    }}
                    className="theme-soft rounded-xl px-3 py-2 text-left text-sm theme-text-soft disabled:opacity-60"
                  >
                    {logoutBusy ? "Logging out..." : "Logout"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full bg-[#0b0b0f] px-3 pb-3 md:px-4 lg:px-5">
          <nav ref={navRef} className="relative flex items-center justify-center gap-6 text-sm theme-text-muted">
            <div className="flex w-full items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={() => router.push("/")}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
                  isHomeActive
                    ? "border-white/18 bg-[#241e2b] text-white"
                    : "border-white/10 bg-[#1c1722] text-white/72"
                }`}
              >
                <Home className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </button>
              <form
                className="flex h-11 flex-1 items-center rounded-full border border-white/10 bg-[#1c1722] px-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  runSearch();
                }}
              >
                <Search className="h-4 w-4 text-white/52" strokeWidth={2} aria-hidden="true" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="ml-2 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                  placeholder="Search beats"
                />
              </form>
              <button
                type="button"
                onClick={() => {
                  setPinnedMenuOpen("Browse");
                  setHoverMenuOpen("Browse");
                  router.push("/activity");
                }}
                className={`inline-flex h-11 items-center gap-2 rounded-full border px-3 text-sm transition ${
                  isBrowseActive || openMenuKey === "Browse"
                    ? "border-[#1ed760]/35 bg-[#243226] text-white"
                    : "border-white/10 bg-[#1c1722] text-white/72"
                }`}
              >
                <Compass className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                Browse
              </button>
            </div>

            {startSellingError ? <p className="ml-auto text-xs text-[#ff8f7d]">{startSellingError}</p> : null}

            {notificationsOpen ? (
              <div className="theme-menu absolute right-0 top-[46px] z-50 w-[min(340px,calc(100vw-1.5rem))] rounded-2xl p-4 backdrop-blur-xl">
                <p className="text-sm font-semibold theme-text-main">Notifications</p>
                {notificationsLoading ? <p className="mt-3 text-xs theme-text-muted">Loading notifications...</p> : null}
                {!notificationsLoading && notifications.length === 0 ? <p className="mt-3 text-xs theme-text-muted">No new notifications.</p> : null}
                {!notificationsLoading ? (
                  <div className="mt-3 space-y-2">
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setNotificationsOpen(false);
                          if (item.beat_id) {
                            router.push(`/beats/${item.beat_id}`);
                            return;
                          }
                          if (item.notification_type === "producer_followed") {
                            router.push(`/producers/${item.actor_id}`);
                          }
                        }}
                        className="theme-soft block w-full rounded-xl px-3 py-3 text-left"
                      >
                        <p className="text-sm theme-text-soft">{item.message}</p>
                        <p className="mt-1 text-[11px] theme-text-faint">
                          {new Date(item.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </nav>
        </div>
      </header>

      {uploadPickerOpen ? (
        <div
          className="theme-overlay fixed inset-0 z-[120] flex items-start justify-center px-4 pt-28 backdrop-blur-sm"
          onClick={() => setUploadPickerOpen(false)}
        >
          <section
            className="theme-floating w-full max-w-[860px] rounded-2xl p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold theme-text-main">Upload</h2>
              <button
                type="button"
                onClick={() => setUploadPickerOpen(false)}
                className="theme-soft rounded-md px-2 py-1 text-xs theme-text-soft"
              >
                Close
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setUploadPickerOpen(false);
                  router.push("/producer/upload-wizard?flow=beat&fresh=1");
                }}
                className="theme-soft rounded-2xl p-6 text-left transition"
              >
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#8b28ff] to-[#601dff] text-2xl">
                  B
                </div>
                <h3 className="text-3xl font-semibold leading-none tracking-tight theme-text-main">Upload Beat</h3>
                <p className="mt-3 text-sm theme-text-muted">Get paid by selling beats to 100K+ artists worldwide.</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUploadPickerOpen(false);
                  router.push("/producer/upload-wizard?flow=kit&fresh=1");
                }}
                className="theme-soft rounded-2xl p-6 text-left transition"
              >
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#1f77ff] to-[#1550ff] text-2xl">
                  K
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-3xl font-semibold leading-none tracking-tight theme-text-main">Upload Sound</h3>
                  <span className="rounded-full border border-[#ffcf7a]/40 bg-[#ff9f1c]/18 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#ffd58c]">
                    New
                  </span>
                </div>
                <p className="mt-3 text-sm theme-text-muted">
                  Get paid by selling sound kits to musicians across the globe.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUploadPickerOpen(false);
                  router.push("/producer/media-uploads");
                }}
                className="theme-soft rounded-2xl p-6 text-left transition"
              >
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#f6b067] to-[#ff8a38] text-2xl text-[#20150e]">M</div>
                <h3 className="text-3xl font-semibold leading-none tracking-tight theme-text-main">Media Uploads</h3>
                <p className="mt-3 text-sm theme-text-muted">Open saved drafts, continue editing, or remove old uploads.</p>
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {globalFlash ? (
        <div className="pointer-events-none fixed left-1/2 top-24 z-[160] w-full max-w-[720px] -translate-x-1/2 px-4">
          <div className="rounded-[24px] border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(10,24,20,0.96),rgba(20,56,44,0.96))] px-6 py-5 text-center shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/75">Upload Complete</p>
            <p className="mt-2 text-2xl font-semibold text-white">{globalFlash}</p>
          </div>
        </div>
      ) : null}
      <main
        className={
          isOrdersRoute || isActivityRoute
            ? "flex min-h-0 flex-1 w-full overflow-hidden px-3 pb-6 md:px-4 lg:px-5"
            : "w-full px-3 pb-24 md:px-4 lg:px-5"
        }
      >
        {children}
      </main>
      {!hideGlobalPlayer ? <GlobalPlayer /> : null}
    </div>
  );
}

