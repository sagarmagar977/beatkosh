"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { GlobalPlayer } from "@/components/global-player";
import { RoleSwitcher } from "@/components/role-switcher";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/beats", label: "Beats" },
  { href: "/catalog", label: "Sound Kits" },
  { href: "/activity", label: "Browse" },
  { href: "/resources", label: "Resources" },
];

const beatsMenu = [
  "All Beats",
  "Trending Beats",
  "Latest Beats",
  "All Playlists",
  "For Hip-Hop Artists",
  "For Pop Artists",
];

const browseMenu = [
  "Cart",
  "Your Orders",
  "Liked",
  "Play History",
  "Download History",
  "Negotiations",
  "Follower Drops",
  "Followed By You",
];

const resourcesMenu = ["Tutorials", "Help Desk", "Blog", "Customer Support"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, startSelling } = useAuth();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [startSellingBusy, setStartSellingBusy] = useState(false);
  const [startSellingError, setStartSellingError] = useState<string | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [uploadPickerOpen, setUploadPickerOpen] = useState(false);

  const normalizedPath =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const publicAuthRoutes = ["/auth/login", "/auth/register"];
  const isPublicAuthRoute = publicAuthRoutes.includes(normalizedPath);
  const isProtectedRoute = !isPublicAuthRoute;
  const hideGlobalPlayer = normalizedPath.startsWith("/producer/upload-wizard");

  useEffect(() => {
    if (loading) {
      return;
    }
    if (isProtectedRoute && !user) {
      router.replace("/auth/login");
    }
    if (isPublicAuthRoute && user) {
      router.replace("/");
    }
  }, [isProtectedRoute, isPublicAuthRoute, loading, router, user]);

  useEffect(() => {
    if (!uploadPickerOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setUploadPickerOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [uploadPickerOpen]);

  const primaryAction = useMemo(() => {
    if (!user) {
      return { href: "/auth/register", label: "Start Selling" };
    }
    if (user.active_role === "producer") {
      return { href: "/producer/upload-wizard", label: "Upload" };
    }
    return { href: "/onboarding/creator", label: "Start Selling" };
  }, [user]);

  const activeMenuItems =
    menuOpen === "Beats" ? beatsMenu : menuOpen === "Browse" ? browseMenu : menuOpen === "Resources" ? resourcesMenu : [];

  if (isPublicAuthRoute) {
    return <main className="mx-auto flex min-h-screen max-w-[1240px] items-center justify-center px-4 py-10 lg:px-6">{children}</main>;
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[420px] items-center justify-center px-6">
        <p className="text-sm text-white/70">Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return null;
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
          <Link href="/orders" className="relative rounded-full border border-white/12 bg-white/5 px-3 py-2 text-xs text-white/75">
            Cart
            {itemCount > 0 ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#8b28ff] px-1.5 py-0.5 text-[10px] font-semibold text-white">{itemCount}</span> : null}
          </Link>
          {user && user.active_role !== "producer" ? (
            <button
              type="button"
              onClick={async () => {
                setStartSellingBusy(true);
                setStartSellingError(null);
                try {
                  await startSelling();
                  router.push("/producer/upload-wizard");
                } catch (err) {
                  setStartSellingError(err instanceof Error ? err.message : "Failed to start selling");
                } finally {
                  setStartSellingBusy(false);
                }
              }}
              className="brand-btn px-4 py-2 text-sm disabled:opacity-70"
              disabled={startSellingBusy}
            >
              {startSellingBusy ? "Enabling..." : "Start Selling"}
            </button>
          ) : (
            <button type="button" onClick={() => setUploadPickerOpen(true)} className="brand-btn px-4 py-2 text-sm">
              {primaryAction.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => setUserMenuOpen((s) => !s)}
            className="h-9 w-9 rounded-full border border-white/15 bg-[#242636] text-sm font-semibold"
          >
            {user?.username?.slice(0, 1).toUpperCase() ?? "U"}
          </button>
        </div>
        {startSellingError ? (
          <div className="mx-auto max-w-[1240px] px-4 pb-2 text-xs text-rose-300 lg:px-6">{startSellingError}</div>
        ) : null}

        <div className="mx-auto flex max-w-[1240px] gap-2 px-4 pb-3 lg:px-6">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onMouseEnter={() => {
                  if (["Beats", "Browse", "Resources"].includes(link.label)) {
                    setMenuOpen(link.label);
                  }
                }}
                onMouseLeave={() => setMenuOpen(null)}
                className={`rounded-md px-3 py-2 text-xs uppercase tracking-wider ${
                  active ? "bg-white/10 text-white" : "text-white/72 hover:bg-white/6"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {activeMenuItems.length > 0 ? (
          <div
            onMouseEnter={() => setMenuOpen(menuOpen)}
            onMouseLeave={() => setMenuOpen(null)}
            className="mx-auto grid max-w-[1240px] grid-cols-2 gap-2 border-t border-white/10 bg-[#0f1119] px-4 py-4 text-sm lg:px-6"
          >
            {activeMenuItems.map((item) => (
              <p key={item} className="rounded-md px-3 py-2 text-white/74 hover:bg-white/5 hover:text-white">
                {item}
              </p>
            ))}
          </div>
        ) : null}
      </header>

      {notificationsOpen ? (
        <aside className="fixed right-0 top-[61px] z-50 h-[calc(100vh-61px)] w-[320px] border-l border-white/10 bg-[#111320] p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Notifications</h3>
            <button type="button" onClick={() => setNotificationsOpen(false)} className="text-white/60">
              X
            </button>
          </div>
          <p className="mt-8 text-sm text-white/55">No notifications found.</p>
        </aside>
      ) : null}

      {userMenuOpen ? (
        <div className="fixed right-4 top-16 z-50 w-44 rounded-lg border border-white/10 bg-[#1a1c28] p-2 text-sm lg:right-6">
          <Link href="/producer/settings" className="block rounded-md px-3 py-2 text-white/75 hover:bg-white/6">
            Settings
          </Link>
          <Link href="/resources" className="block rounded-md px-3 py-2 text-white/75 hover:bg-white/6">
            Support
          </Link>
          <button
            type="button"
            onClick={async () => {
              setLogoutBusy(true);
              setUserMenuOpen(false);
              logout();
              router.replace("/auth/login");
              router.refresh();
              setLogoutBusy(false);
            }}
            disabled={logoutBusy}
            className="mt-1 block w-full rounded-md px-3 py-2 text-left text-white/75 hover:bg-white/6 disabled:opacity-70"
          >
            {logoutBusy ? "Logging out..." : "Logout"}
          </button>
        </div>
      ) : null}

      {uploadPickerOpen ? (
        <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/70 px-4 pt-28 backdrop-blur-sm" onClick={() => setUploadPickerOpen(false)}>
          <section className="w-full max-w-[860px] rounded-2xl border border-white/15 bg-[#181a24] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.5)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Upload</h2>
              <button type="button" onClick={() => setUploadPickerOpen(false)} className="rounded-md border border-white/15 px-2 py-1 text-xs text-white/75 hover:bg-white/5">
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
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#8b28ff] to-[#601dff] text-2xl">B</div>
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
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#1f77ff] to-[#1550ff] text-2xl">K</div>
                <div className="flex items-center gap-2">
                  <h3 className="text-3xl font-semibold leading-none tracking-tight text-white">Upload Sound</h3>
                  <span className="rounded-full border border-[#ffcf7a]/40 bg-[#ff9f1c]/18 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#ffd58c]">
                    New
                  </span>
                </div>
                <p className="mt-3 text-sm text-white/70">Get paid by selling sound kits to musicians across the globe.</p>
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <main className="mx-auto max-w-[1240px] px-4 py-6 lg:px-6">{children}</main>

      {!hideGlobalPlayer ? <GlobalPlayer /> : null}

      <div className="mx-auto max-w-[1240px] px-4 pb-4 lg:px-6">
        <RoleSwitcher />
      </div>
    </div>
  );
}
