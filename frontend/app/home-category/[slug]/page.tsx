"use client";

import { ArrowLeft, ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { BeatListRow } from "@/components/beat-list-row";
import { BeatListRowSkeleton } from "@/components/beat-list-row-skeleton";
import type { TrendingBeat } from "@/components/trending-beat-shelf";
import { useCart } from "@/context/cart-context";
import { usePlayer } from "@/context/player-context";
import { apiRequest, resolveMediaUrl } from "@/lib/api";
import {
  buildGenreShelves,
  trendShelfToBeatItems,
  type HomeBeat,
  type HomeFeed,
  type ShelfBeatItem,
  withHomeCategoryPaths,
} from "@/lib/home-shelves";

type License = {
  id: number;
  name: string;
  includes_stems?: boolean;
  is_exclusive?: boolean;
  includes_wav?: boolean;
};

type LicenseOption = {
  id: number;
  label: string;
  price: string;
  nature: string;
  format: string;
};

type CartSummary = {
  items: Array<{ product_type: string; product_id: number }>;
};

type DetailState = {
  title: string;
  subtitle?: string;
  items: ShelfBeatItem[];
};

function HomeCategoryBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/78 transition hover:bg-white/[0.08] hover:text-white"
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
      Back to home
    </button>
  );
}

function findCategoryDetail({
  slug,
  feed,
  discoveryBeats,
  dailyTrending,
  weeklyTrending,
}: {
  slug: string;
  feed: HomeFeed | null;
  discoveryBeats: HomeBeat[];
  dailyTrending: TrendingBeat[];
  weeklyTrending: TrendingBeat[];
}): DetailState | null {
  if (slug === "trending-daily") {
    return {
      title: "Trending Today",
      subtitle: "The fastest-moving beats from the last 24 hours.",
      items: trendShelfToBeatItems(dailyTrending),
    };
  }

  if (slug === "trending-weekly") {
    return {
      title: "Trending This Week",
      subtitle: "The strongest discovery shelf from the last 7 days.",
      items: trendShelfToBeatItems(weeklyTrending),
    };
  }

  const feedShelf = feed?.shelves.find((shelf) => shelf.key === slug && shelf.beats?.length);
  if (feedShelf?.beats) {
    return {
      title: feedShelf.title,
      subtitle: feedShelf.subtitle,
      items: feedShelf.beats,
    };
  }

  const genreShelf = buildGenreShelves(discoveryBeats).find((shelf) => shelf.key === slug);
  if (genreShelf) {
    const genreName = genreShelf.title.replace(/ Beats$/, "");
    const items = discoveryBeats
      .filter((beat) => beat.genre?.trim().toLowerCase() === genreName.toLowerCase())
      .sort((left, right) => {
        const playDiff = (right.play_count ?? 0) - (left.play_count ?? 0);
        if (playDiff !== 0) {
          return playDiff;
        }
        const likeDiff = (right.like_count ?? 0) - (left.like_count ?? 0);
        if (likeDiff !== 0) {
          return likeDiff;
        }
        const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
        const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
        return rightTime - leftTime;
      })
      .map((beat) => ({ beat, note: "" }));

    return {
      title: genreShelf.title,
      subtitle: genreShelf.subtitle,
      items,
    };
  }

  return null;
}

export default function HomeCategoryPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const { token } = useAuth();
  const { refreshCart } = useCart();
  const { currentTrack, isPlaying, playTrack, togglePlay, canPlay } = usePlayer();
  const [catalogBeats, setCatalogBeats] = useState<HomeBeat[]>([]);
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [dailyTrending, setDailyTrending] = useState<TrendingBeat[]>([]);
  const [weeklyTrending, setWeeklyTrending] = useState<TrendingBeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [licenseCatalog, setLicenseCatalog] = useState<License[]>([]);
  const [licenseModalBeat, setLicenseModalBeat] = useState<HomeBeat | null>(null);
  const [selectedLicenseId, setSelectedLicenseId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cartBeatIds, setCartBeatIds] = useState<number[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        const [beats, daily, weekly, licenses, homeFeed] = await Promise.all([
          apiRequest<HomeBeat[]>("/beats/"),
          apiRequest<TrendingBeat[]>("/beats/trending/daily/"),
          apiRequest<TrendingBeat[]>("/beats/trending/weekly/"),
          apiRequest<License[]>("/beats/licenses/"),
          token ? apiRequest<HomeFeed>("/analytics/listening/home/", { token }) : Promise.resolve<HomeFeed | null>(null),
        ]);

        setCatalogBeats(beats);
        setDailyTrending(daily);
        setWeeklyTrending(weekly);
        setLicenseCatalog(licenses);
        setFeed(homeFeed ? { ...homeFeed, shelves: withHomeCategoryPaths(homeFeed.shelves) } : null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load category");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [token]);

  useEffect(() => {
    const loadCart = async () => {
      if (!token) {
        setCartBeatIds([]);
        return;
      }
      try {
        const cart = await apiRequest<CartSummary>("/orders/cart/me/", { token });
        setCartBeatIds(cart.items.filter((item) => item.product_type === "beat").map((item) => item.product_id));
      } catch {
        setCartBeatIds([]);
      }
    };

    void loadCart();
  }, [token]);

  const detail = useMemo(
    () =>
      findCategoryDetail({
        slug,
        feed,
        discoveryBeats: catalogBeats,
        dailyTrending,
        weeklyTrending,
      }),
    [slug, feed, catalogBeats, dailyTrending, weeklyTrending],
  );

  const licenseOptions = useMemo(() => {
    if (!licenseModalBeat) {
      return [] as LicenseOption[];
    }

    const buildOption = (license: License): LicenseOption => ({
      id: license.id,
      label: license.name.toUpperCase(),
      price: licenseModalBeat.base_price,
      nature: license.is_exclusive ? "Exclusive" : "Non-Exclusive",
      format: license.includes_stems ? "WAV & STEMS File" : "WAV File",
    });

    if (licenseModalBeat.licenses && licenseModalBeat.licenses.length > 0) {
      return licenseModalBeat.licenses.map(buildOption);
    }

    return licenseCatalog.map(buildOption);
  }, [licenseCatalog, licenseModalBeat]);

  useEffect(() => {
    if (licenseOptions.length > 0 && !licenseOptions.some((item) => item.id === selectedLicenseId)) {
      setSelectedLicenseId(licenseOptions[0].id);
    }
  }, [licenseOptions, selectedLicenseId]);

  const selectedLicenseInfo = licenseOptions.find((item) => item.id === selectedLicenseId) ?? licenseOptions[0];

  const detailHeroBeat = detail?.items[0]?.beat ?? null;
  const detailHeroCover = detailHeroBeat ? resolveMediaUrl(detailHeroBeat.cover_art_obj) : null;

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2400);
  };

  const handlePlayAttempt = (beat: HomeBeat, isCurrent: boolean) => {
    const playbackUrl = resolveMediaUrl(beat.preview_audio_obj || beat.audio_file_obj);
    if (!token || !canPlay) {
      router.push("/auth/login");
      return;
    }
    if (!playbackUrl) {
      notify("No preview is available for this beat yet.");
      return;
    }
    if (isCurrent) {
      void togglePlay();
      return;
    }
    void playTrack({
      id: beat.id,
      title: beat.title,
      artist: beat.producer_username,
      bpm: beat.bpm,
      playCount: beat.play_count,
      key: beat.key,
      genre: beat.genre,
      price: beat.base_price,
      coverText: beat.title,
      coverUrl: resolveMediaUrl(beat.cover_art_obj),
      beatUrl: `/beats/${beat.id}`,
      audioUrl: playbackUrl,
    });
  };

  const handleAddToCart = async () => {
    if (!token) {
      router.push("/auth/login");
      return;
    }
    if (!licenseModalBeat || !selectedLicenseId) {
      notify("Choose a license first.");
      return;
    }

    try {
      await apiRequest("/orders/cart/items/", {
        method: "POST",
        token,
        body: {
          product_type: "beat",
          product_id: licenseModalBeat.id,
          license_id: selectedLicenseId,
        },
      });
      setCartBeatIds((current) => (current.includes(licenseModalBeat.id) ? current : [...current, licenseModalBeat.id]));
      await refreshCart();
      notify("Added to cart.");
      setLicenseModalBeat(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add beat to cart");
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <section className="relative overflow-hidden rounded-[34px] border border-white/8 bg-[linear-gradient(180deg,#7f5a95_0%,#4b3457_55%,#1a171d_100%)] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.34)] md:p-8 min-h-[300px]">
        {detailHeroCover ? <img src={detailHeroCover} alt={detailHeroBeat?.title || (detail?.title ?? 'Category')} className="absolute inset-0 h-full w-full object-cover" /> : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,8,18,0.9)_0%,rgba(30,18,42,0.72)_42%,rgba(12,8,18,0.88)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(172,115,220,0.32),rgba(17,13,20,0.84)_82%)]" />
        <div className="relative flex min-h-[250px] flex-wrap items-start justify-between gap-4">
          <div className="self-end">
            <HomeCategoryBackButton />
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-white/62">Home Category</p>
            <h1 className="mt-4 max-w-[14ch] text-4xl font-semibold leading-[0.94] text-white md:text-6xl">
              {loading ? "Loading category" : detail?.title ?? "Category not found"}
            </h1>
            <p className="mt-4 max-w-[720px] text-sm leading-6 text-white/76 md:text-base">
              {loading
                ? "Building the full list view for this homepage category."
                : detail?.subtitle ?? "This category could not be found from the current homepage feed."}
            </p>
            {detailHeroBeat ? (
              <div className="mt-5 inline-flex w-fit flex-wrap items-center gap-3 rounded-full border border-white/14 bg-black/20 px-4 py-2 text-sm text-white/82 backdrop-blur-md">
                <span className="text-white/58">Featured cover</span>
                <span className="font-medium text-white">{detailHeroBeat.title}</span>
                <span className="text-white/58">{detailHeroBeat.producer_username}</span>
              </div>
            ) : null}
          </div>
          <Link
            href="/"
            className="relative z-10 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/72 transition hover:bg-white/[0.08] hover:text-white"
          >
            Home
          </Link>
        </div>
      </section>

      {!token ? <section className="theme-surface rounded-[26px] border-[#8b28ff]/20 p-4 text-sm theme-text-soft">Login is required to preview beats, save playlists, and use the cart.</section> : null}

      {loading ? (
        <section className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <BeatListRowSkeleton key={index} />
          ))}
        </section>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {!loading && !error && !detail ? (
        <section className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-6 py-12 text-center text-sm text-white/60">
          This homepage category is not available right now.
        </section>
      ) : null}

      {!loading && detail ? (
        <section className="space-y-3">
          {detail.items.map((item) => {
            const beat = item.beat;
            const isCurrent = currentTrack?.id === beat.id;
            const inCart = cartBeatIds.includes(beat.id);

            return (
              <BeatListRow
                key={`${detail.title}-${beat.id}`}
                beat={beat}
                artistHref={`/producers/${beat.producer}`}
                detailHref={`/beats/${beat.id}`}
                isCurrent={isCurrent}
                isPlaying={isCurrent && isPlaying}
                onPlay={() => handlePlayAttempt(beat, isCurrent)}
                actionLabel={inCart ? "Added to cart" : `Rs ${beat.base_price}`}
                actionState={inCart ? "success" : "default"}
                onAction={() => {
                  setLicenseModalBeat(beat);
                  setSelectedLicenseId(beat.licenses?.[0]?.id ?? null);
                }}
                message={notify}
              />
            );
          })}
          {detail.items.length === 0 ? <p className="theme-text-muted text-sm">No beats found in this category yet.</p> : null}
        </section>
      ) : null}

      {licenseModalBeat ? (
        <div className="theme-overlay fixed inset-0 z-[130] flex items-start justify-center px-4 pt-24 backdrop-blur-sm" onClick={() => setLicenseModalBeat(null)}>
          <section className="theme-floating w-full max-w-[980px] rounded-2xl p-5" onClick={(event) => event.stopPropagation()}>
            <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
              <div>
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="theme-text-main text-4xl font-semibold">Select License Type</h3>
                    <p className="theme-text-muted">Choose how you want to license this beat.</p>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--line)" }}>
                  {licenseOptions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedLicenseId(item.id)}
                      className={`block w-full border-b px-4 py-3 text-left text-2xl ${selectedLicenseId === item.id ? "bg-[#8b28ff] text-white" : "theme-text-soft bg-transparent"}`}
                      style={{ borderColor: "var(--line)" }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <button type="button" onClick={() => setLicenseModalBeat(null)} className="theme-text-soft float-right inline-flex items-center justify-center">
                  <X className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                </button>
                <div className="mb-4 flex items-center gap-3">
                  <div className="theme-avatar flex h-20 w-20 items-center justify-center rounded-md text-sm font-bold">{licenseModalBeat.title.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <p className="theme-text-main text-4xl font-semibold">{licenseModalBeat.title}</p>
                    <p className="theme-text-muted text-xl">{licenseModalBeat.producer_username}</p>
                  </div>
                </div>
                <div className="theme-surface-muted rounded-xl p-4 text-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <p className="theme-text-muted">License Usage</p><p className="theme-text-main text-right">Unlimited Streaming</p>
                    <p className="theme-text-muted">Format & Files</p><p className="theme-text-main text-right">{selectedLicenseInfo?.format || "WAV File"}</p>
                    <p className="theme-text-muted">Nature</p><p className="theme-text-main text-right">{selectedLicenseInfo?.nature || "Non-Exclusive"}</p>
                    <p className="theme-text-muted">Category</p><p className="theme-text-main text-right">{detail?.title || "Homepage picks"}</p>
                    <p className="theme-text-muted">Genre</p><p className="theme-text-main text-right">{licenseModalBeat.genre}</p>
                    <p className="theme-text-muted">Tempo</p><p className="theme-text-main text-right">{licenseModalBeat.bpm} BPM</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={() => void handleAddToCart()} className="brand-btn inline-flex items-center gap-2 px-8 py-3 text-3xl font-semibold">
                    <ShoppingCart className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                    Rs {selectedLicenseInfo?.price || licenseModalBeat.base_price}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {message ? <div className="fixed right-6 top-24 z-[150] rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">{message}</div> : null}
    </div>
  );
}

