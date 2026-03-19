"use client";

import {
  BookOpen,
  CircleDollarSign,
  CircleHelp,
  Clock3,
  Download,
  Droplets,
  Headphones,
  Headset,
  Heart,
  History,
  MessageSquareMore,
  Music4,
  Newspaper,
  ShoppingCart,
  SlidersHorizontal,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { AuthScreen } from "@/app/auth-screen";
import { useAuth } from "@/app/auth-context";
import { GlobalPlayer } from "@/components/global-player";
import { apiRequest } from "@/lib/api";

type MenuIconKind =
  | "headphones"
  | "cash"
  | "beat"
  | "trend"
  | "clock"
  | "cart"
  | "heart"
  | "history"
  | "download"
  | "studio"
  | "negotiation"
  | "group"
  | "drop"
  | "tutorial"
  | "help"
  | "blog"
  | "support";

type MenuItem = {
  label: string;
  href: string;
  icon: MenuIconKind;
};

type NavLink = { href: string; label: string; menu?: MenuItem[] };
type AppNotification = {
  id: number;
  notification_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  actor_username: string;
  beat_id?: number | null;
  beat_title?: string | null;
};

function MenuIcon({ kind }: { kind: MenuIconKind }) {
  const common = "h-5 w-5 flex-none text-[#8f5cff]";
  switch (kind) {
    case "headphones":
      return <Headphones className={common} strokeWidth={1.8} aria-hidden="true" />;
    case "cash":
      return <CircleDollarSign className={common} strokeWidth={1.8} aria-hidden="true" />;
    case "beat":
      return <Music4 className={common} strokeWidth={1.8} aria-hidden="true" />;
    case "trend":
      return <TrendingUp className={common} strokeWidth={1.8} aria-hidden="true" />;
    case "clock":
      return <Clock3 className={common} strokeWidth={1.8} aria-hidden="true" />;
    case "cart":
      return <ShoppingCart className={common} strokeWidth={1.8} aria-hidden="true" />;
    case "heart":
      return <Heart className={common} strokeWidth={1.8} aria-hidden="true" />;
    case "history":
      return <History className={common} strokeWidth={1.8} aria-hidden="true" />;
    case "download":
      return <Download className={common} strokeWidth={1.8} aria-hidden="true" />;
    case "studio":
      return <SlidersHorizontal className={common} strokeWidth={1.8} aria-hidden="true" />;
    case "negotiation":
      return <MessageSquareMore className={common} strokeWidth={1.8} aria-hidden="true" />;
    case "group":
      return <Users className={common} strokeWidth={1.8} aria-hidden="true" />;
    case "drop":
      return <Droplets className={common} strokeWidth={1.8} aria-hidden="true" />;
    case "tutorial":
      return <BookOpen className={common} strokeWidth={1.8} aria-hidden="true" />;
    case "help":
      return <CircleHelp className={common} strokeWidth={1.8} aria-hidden="true" />;
    case "blog":
      return <Newspaper className={common} strokeWidth={1.8} aria-hidden="true" />;
    case "support":
      return <Headset className={common} strokeWidth={1.8} aria-hidden="true" />;
    default:
      return null;
  }
}

const dashboardMenu: MenuItem[] = [
  { label: "Listening", href: "/dashboard/listening", icon: "headphones" },
  { label: "Selling", href: "/dashboard/selling", icon: "cash" },
];

const beatsMenu: MenuItem[] = [
  { label: "All Beats", href: "/beats", icon: "beat" },
  { label: "Trending Beats", href: "/beats-trending", icon: "trend" },
  { label: "Latest Beats", href: "/beats-latest", icon: "clock" },
  { label: "For Hip-Hop Artists", href: "/beats-hip-hop", icon: "beat" },
  { label: "For Pop Artists", href: "/beats-pop", icon: "beat" },
];

const browseMenu: MenuItem[] = [
  { label: "Cart", href: "/orders", icon: "cart" },
  { label: "Liked", href: "/library", icon: "heart" },
  { label: "Play History", href: "/projects", icon: "history" },
  { label: "Download History", href: "/wallet", icon: "download" },
  { label: "Studio", href: "/producer/studio", icon: "studio" },
  { label: "Negotiations", href: "/projects", icon: "negotiation" },
  { label: "Follower Drops", href: "/activity", icon: "drop" },
  { label: "Followed By You", href: "/activity", icon: "group" },
];

const resourcesMenu: MenuItem[] = [
  { label: "Tutorials", href: "/resources?category=tutorials", icon: "tutorial" },
  { label: "Help Desk", href: "/resources?category=help", icon: "help" },
  { label: "Blog", href: "/resources?category=blog", icon: "blog" },
  { label: "Customer Support", href: "/resources?category=help", icon: "support" },
];

const navLinks: NavLink[] = [
  { href: "/dashboard/listening", label: "Dashboard", menu: dashboardMenu },
  { href: "/beats", label: "Beats", menu: beatsMenu },
  { href: "/catalog", label: "Sound Kits" },
  { href: "/activity", label: "Browse", menu: browseMenu },
  { href: "/resources", label: "Resources", menu: resourcesMenu },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, loading, logout, startSelling, refreshMe, meError } = useAuth();

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

  const menuCloseTimeout = useRef<number | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);

  const hasSession = Boolean(token);
  const profileHref = user?.is_producer ? `/producers/${user.id}` : null;

  const normalizedPath = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const publicAuthRoutes = ["/auth/login", "/auth/register"];
  const isPublicAuthRoute = publicAuthRoutes.includes(normalizedPath);
  const isProtectedRoute = !isPublicAuthRoute;
  const hideGlobalPlayer = normalizedPath.startsWith("/producer/upload-wizard");

  useEffect(() => {
    if (loading) {
      return;
    }
    if (isProtectedRoute && !hasSession) {
      router.replace("/auth/login");
    }
    if (isPublicAuthRoute && hasSession) {
      router.replace("/");
    }
  }, [hasSession, isProtectedRoute, isPublicAuthRoute, loading, router]);

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
  const activeMenuItems = useMemo(() => {
    const match = navLinks.find((link) => link.label === openMenuKey);
    return match?.menu ?? [];
  }, [openMenuKey]);

  const closeMenuSoon = () => {
    if (menuCloseTimeout.current) {
      window.clearTimeout(menuCloseTimeout.current);
    }
    menuCloseTimeout.current = window.setTimeout(() => {
      if (!pinnedMenuOpen) {
        setHoverMenuOpen(null);
      }
    }, 120);
  };

  if (isPublicAuthRoute) {
    return <AuthScreen mode={normalizedPath === "/auth/register" ? "register" : "login"} />;
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[520px] flex-col items-center justify-center gap-3 px-6 text-center text-white">
        <p className="text-sm text-white/70">Loading session...</p>
      </div>
    );
  }

  if (hasSession && !user && !allowDegradedSession) {
    const isNetworkFailure = meError?.status === 0;
    return (
      <div className="mx-auto flex min-h-screen max-w-[520px] flex-col items-center justify-center gap-4 px-6 text-center text-white">
        <p className="text-sm text-white/70">Signed in, but we could not load your profile.</p>
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
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/80"
          >
            Retry
          </button>
          {isNetworkFailure ? (
            <button
              type="button"
              onClick={() => setAllowDegradedSession(true)}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/80"
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
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/80"
          >
            Logout
          </button>
        </div>
        <div className="mt-1 w-full max-w-[520px] rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
          <p className="text-xs text-white/60">/account/me failed{meError ? ` (status ${meError.status})` : ""}:</p>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/30 p-3 text-[11px] text-white/70">{meError?.bodyText ?? "No details"}</pre>
        </div>
        {isNetworkFailure ? (
          <p className="text-xs text-white/45">
            You can continue while the backend is unreachable, but some features may fail.
          </p>
        ) : null}
      </div>
    );
  }


  // Legacy-route guard removed now that auth context is unified.

  return (
    <div className="min-h-screen pb-28 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0c13]/94 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-3 lg:px-6">
          <Link href="/" className="text-3xl font-black tracking-[-0.07em] text-[#8f5cff]">
            B
          </Link>

          <div className="hidden min-w-[320px] flex-1 items-center gap-2 md:flex">
            <input
              className="h-10 flex-1 rounded-md border border-white/15 bg-white/5 px-3 text-sm text-white/80 outline-none placeholder:text-white/35"
              placeholder="Search top beats"
            />
            <select className="h-10 rounded-md border border-white/15 bg-white/5 px-3 text-sm text-white/80 outline-none">
              <option>General</option>
              <option>Beats</option>
              <option>Sound Kits</option>
              <option>Resources</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setNotificationsOpen((s) => !s)}
            className="relative rounded-full border border-white/12 bg-white/5 px-3 py-2 text-xs text-white/75"
          >
            Bell
          </button>

          <Link href="/orders" className="rounded-full border border-white/12 bg-white/5 px-3 py-2 text-xs text-white/75">
            Cart
          </Link>

          {user && user.active_role !== "producer" ? (
            <button
              type="button"
              onClick={async () => {
                setStartSellingBusy(true);
                setStartSellingError(null);
                try {
                  await startSelling();
                  router.push("/producer/studio");
                } catch (err) {
                  setStartSellingError(err instanceof Error ? err.message : "Unable to start selling");
                } finally {
                  setStartSellingBusy(false);
                }
              }}
              disabled={startSellingBusy}
              className="rounded-full bg-gradient-to-r from-[#8b28ff] via-[#7b32ff] to-[#4b7dff] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {startSellingBusy ? "Starting..." : "Start Selling"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setUploadPickerOpen(true)}
              className="rounded-full bg-gradient-to-r from-[#8b28ff] via-[#7b32ff] to-[#4b7dff] px-4 py-2 text-xs font-semibold text-white"
            >
              Upload
            </button>
          )}

          <button
            type="button"
            onClick={() => setUserMenuOpen((s) => !s)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/5 text-xs font-semibold text-white/85"
          >
            {user?.username?.slice(0, 1).toUpperCase() ?? "U"}
          </button>
        </div>

        <div className="mx-auto max-w-[1240px] px-4 pb-3 lg:px-6">
          <nav ref={navRef} className="relative flex items-center gap-6 text-sm text-white/70">
            {navLinks.map((link) => {
              const hasMenu = Boolean(link.menu && link.menu.length);
              const isActive = normalizedPath === link.href;
              const isOpen = openMenuKey === link.label;
              return (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => {
                    if (!hasMenu) {
                      return;
                    }
                    if (menuCloseTimeout.current) {
                      window.clearTimeout(menuCloseTimeout.current);
                    }
                    setHoverMenuOpen(link.label);
                  }}
                  onMouseLeave={() => {
                    if (!hasMenu) {
                      return;
                    }
                    closeMenuSoon();
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasMenu) {
                        router.push(link.href);
                        return;
                      }
                      setPinnedMenuOpen((prev) => (prev === link.label ? null : link.label));
                      setHoverMenuOpen(link.label);
                    }}
                    className={
                      "rounded-full px-3 py-2 transition " +
                      (isActive || isOpen ? "bg-white/8 text-white" : "hover:bg-white/5 hover:text-white")
                    }
                  >
                    {link.label}
                  </button>
                </div>
              );
            })}

            {openMenuKey && activeMenuItems.length ? (
              <div
                className="absolute left-0 top-[46px] z-50 w-full"
                onMouseEnter={() => {
                  if (menuCloseTimeout.current) {
                    window.clearTimeout(menuCloseTimeout.current);
                  }
                }}
                onMouseLeave={() => {
                  closeMenuSoon();
                }}
              >
                <div className="rounded-2xl border border-white/10 bg-[#0b0c13]/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {activeMenuItems.map((item) => (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => {
                          setPinnedMenuOpen(null);
                          setHoverMenuOpen(null);
                          router.push(item.href);
                        }}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition hover:border-[#8f5cff]/40 hover:bg-[#8f5cff]/10"
                      >
                        <MenuIcon kind={item.icon} />
                        <span className="text-sm font-medium text-white/85">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {startSellingError ? <p className="ml-auto text-xs text-[#ffb4a9]">{startSellingError}</p> : null}

            {userMenuOpen ? (
              <div className="absolute right-0 top-[46px] z-50 w-[240px] rounded-2xl border border-white/10 bg-[#0b0c13]/95 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                <p className="px-2 pb-2 text-xs text-white/50">Signed in as {user?.username ?? ""}</p>
                <div className="grid gap-2">
                  {profileHref ? (
                    <Link
                      href={profileHref}
                      className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      My Profile
                    </Link>
                  ) : null}
                  <Link
                    href="/dashboard/listening"
                    className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/producer/studio"
                    className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Studio
                  </Link>
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
                    className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-left text-sm text-white/80 hover:bg-white/5 disabled:opacity-60"
                  >
                    {logoutBusy ? "Logging out..." : "Logout"}
                  </button>
                </div>
              </div>
            ) : null}

            {notificationsOpen ? (
              <div className="absolute right-0 top-[46px] z-50 w-[340px] rounded-2xl border border-white/10 bg-[#0b0c13]/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                <p className="text-sm font-semibold text-white">Notifications</p>
                {notificationsLoading ? <p className="mt-3 text-xs text-white/60">Loading notifications...</p> : null}
                {!notificationsLoading && notifications.length === 0 ? <p className="mt-3 text-xs text-white/60">No new notifications.</p> : null}
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
                          }
                        }}
                        className="block w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left hover:bg-white/[0.05]"
                      >
                        <p className="text-sm text-white/85">{item.message}</p>
                        <p className="mt-1 text-[11px] text-white/45">
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
          className="fixed inset-0 z-[120] flex items-start justify-center bg-black/70 px-4 pt-28 backdrop-blur-sm"
          onClick={() => setUploadPickerOpen(false)}
        >
          <section
            className="w-full max-w-[860px] rounded-2xl border border-white/15 bg-[#181a24] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.5)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Upload</h2>
              <button
                type="button"
                onClick={() => setUploadPickerOpen(false)}
                className="rounded-md border border-white/15 px-2 py-1 text-xs text-white/75 hover:bg-white/5"
              >
                Close
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setUploadPickerOpen(false);
                  router.push("/producer/upload-wizard?flow=beat");
                }}
                className="rounded-2xl border border-white/20 bg-gradient-to-b from-white/8 to-white/[0.03] p-6 text-left transition hover:border-[#8b28ff]/60 hover:bg-[#8b28ff]/10"
              >
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#8b28ff] to-[#601dff] text-2xl">
                  B
                </div>
                <h3 className="text-3xl font-semibold leading-none tracking-tight text-white">Upload Beat</h3>
                <p className="mt-3 text-sm text-white/70">Get paid by selling beats to 100K+ artists worldwide.</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUploadPickerOpen(false);
                  router.push("/producer/upload-wizard?flow=kit");
                }}
                className="rounded-2xl border border-white/20 bg-gradient-to-b from-white/8 to-white/[0.03] p-6 text-left transition hover:border-[#1f77ff]/60 hover:bg-[#1f77ff]/10"
              >
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#1f77ff] to-[#1550ff] text-2xl">
                  K
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-3xl font-semibold leading-none tracking-tight text-white">Upload Sound</h3>
                  <span className="rounded-full border border-[#ffcf7a]/40 bg-[#ff9f1c]/18 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#ffd58c]">
                    New
                  </span>
                </div>
                <p className="mt-3 text-sm text-white/70">
                  Get paid by selling sound kits to musicians across the globe.
                </p>
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <main className="mx-auto max-w-[1240px] px-4 py-6 lg:px-6">{children}</main>

      {!hideGlobalPlayer ? <GlobalPlayer /> : null}
    </div>
  );
}



