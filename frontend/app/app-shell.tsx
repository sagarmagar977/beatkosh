"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { AuthScreen } from "@/app/auth-screen";
import { useAuth } from "@/app/auth-context";
import { GlobalPlayer } from "@/components/global-player";

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

function MenuIcon({ kind }: { kind: MenuIconKind }) {
  const common = "h-5 w-5 flex-none text-[#8f5cff]";
  switch (kind) {
    case "headphones":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 13a8 8 0 0 1 16 0v6a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M20 13v6a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M4 13h3a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "cash":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 7h16v10H4V7Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M7 10h.01M17 14h.01"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "beat":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 18a3 3 0 1 0 0-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M9 12V6l12-2v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M21 14a3 3 0 1 0 0-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M21 8v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "trend":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 16l6-6 4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M14 8h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "clock":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "cart":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 7h15l-2 9H7L6 7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M6 7 5 4H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor" />
        </svg>
      );
    case "heart":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 20s-7-4.6-9-9.2C1.8 7.2 3.8 4.5 7 4.5c1.8 0 3.1 1 4 2.1.9-1.1 2.2-2.1 4-2.1 3.2 0 5.2 2.7 4 6.3-2 4.6-9 9.2-9 9.2Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "history":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 4v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M4.5 10A8 8 0 1 0 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "download":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8 10l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M5 21h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "studio":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7h16v10H4V7Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M7 10h3v4H7v-4Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M14 10h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M14 14h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "negotiation":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "group":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M16 11a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 20c1.2-4 4-6 8-6s6.8 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "drop":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 2s6 6.2 6 12a6 6 0 0 1-12 0c0-5.8 6-12 6-12Z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "tutorial":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 5h16v14H4V5Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M10 9h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M10 13h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "help":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 18h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path
            d="M9.5 9.5a2.6 2.6 0 1 1 4.1 2.1c-.9.6-1.6 1.2-1.6 2.4v.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "blog":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 4h14v16H5V4Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 8h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "support":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 18c0 1.7 1.8 3 5 3s5-1.3 5-3v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M4 13a8 8 0 1 1 16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6 13v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M18 13v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [startSellingBusy, setStartSellingBusy] = useState(false);
  const [startSellingError, setStartSellingError] = useState<string | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [allowDegradedSession, setAllowDegradedSession] = useState(false);

  const menuCloseTimeout = useRef<number | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);

  const storedToken = (() => {
    try {
      return localStorage.getItem("beatkosh_access_token");
    } catch {
      return null;
    }
  })();

  const effectiveToken = token ?? storedToken;
  const hasSession = Boolean(effectiveToken);

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


  // Some routes in this repo still depend on the legacy auth context (read-only in this environment).
  // Render a safe placeholder instead of crashing the app when those pages are visited.
  if (["/orders", "/wallet", "/projects", "/verification"].includes(normalizedPath)) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[520px] flex-col items-center justify-center gap-3 px-6 text-center text-white">
        <p className="text-sm text-white/70">This page is temporarily unavailable.</p>
        <Link href="/" className="text-sm font-medium text-[#8f5cff] underline underline-offset-4">
          Go back home
        </Link>
      </div>
    );
  }

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
            className="rounded-full border border-white/12 bg-white/5 px-3 py-2 text-xs text-white/75"
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
            <Link
              href="/producer/upload-wizard"
              className="rounded-full bg-gradient-to-r from-[#8b28ff] via-[#7b32ff] to-[#4b7dff] px-4 py-2 text-xs font-semibold text-white"
            >
              Upload
            </Link>
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
              <div className="absolute right-0 top-[46px] z-50 w-[280px] rounded-2xl border border-white/10 bg-[#0b0c13]/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                <p className="text-sm font-semibold text-white">Notifications</p>
                <p className="mt-1 text-xs text-white/60">No new notifications.</p>
              </div>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 py-6 lg:px-6">{children}</main>

      {!hideGlobalPlayer ? <GlobalPlayer /> : null}
    </div>
  );
}


