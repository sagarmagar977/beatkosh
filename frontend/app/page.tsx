"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { HomePageSkeleton } from "@/app/page-skeletons";
import { TrendingBeatShelf, type TrendingBeat } from "@/components/trending-beat-shelf";
import { apiRequest, resolveMediaUrl } from "@/lib/api";
import {
  buildGenreShelves,
  type HomeBeat,
  type HomeFeed,
  type Playlist,
  type Shelf,
  type ShelfBeatItem,
  withHomeCategoryPaths,
} from "@/lib/home-shelves";

type DiscoveryState = {
  beats: HomeBeat[];
  dailyTrending: TrendingBeat[];
  weeklyTrending: TrendingBeat[];
};

function formatNote(item: ShelfBeatItem) {
  if (item.note) {
    return item.note;
  }
  if (item.session?.is_completed) {
    return "Completed";
  }
  if (item.session?.listened_seconds) {
    return `${item.session.listened_seconds}s listened`;
  }
  return `${item.beat.genre} ? ${item.beat.bpm} BPM`;
}

function RailHeader({ title, subtitle, href, onPrev, onNext }: { title: string; subtitle?: string; href?: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="theme-text-main text-2xl font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="theme-text-muted mt-1 text-sm">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {href ? (
          <Link href={href} className="theme-soft theme-text-soft rounded-full px-3 py-2 text-xs font-medium transition">
            See more
          </Link>
        ) : null}
        <button type="button" onClick={onPrev} className="theme-soft theme-text-soft inline-flex h-10 w-10 items-center justify-center rounded-full transition">
          <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
        <button type="button" onClick={onNext} className="theme-soft theme-text-soft inline-flex h-10 w-10 items-center justify-center rounded-full transition">
          <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function BeatCard({ item }: { item: ShelfBeatItem }) {
  const beat = item.beat;
  const cover = resolveMediaUrl(beat.cover_art_obj);
  return (
    <Link href={`/beats/${beat.id}`} className="theme-home-card group w-[190px] flex-none rounded-[22px] p-3 transition hover:-translate-y-0.5">
      <div className="theme-home-art overflow-hidden rounded-[18px]">
        {cover ? (
          <img src={cover} alt={beat.title} className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
        ) : (
          <div className="aspect-square w-full" />
        )}
      </div>
      <p className="theme-text-main mt-3 line-clamp-1 text-sm font-semibold">{beat.title}</p>
      <p className="theme-text-muted mt-1 line-clamp-1 text-xs">{beat.producer_username}</p>
      <div className="theme-text-faint mt-3 flex items-center justify-between text-[11px]">
        <span>{beat.genre}</span>
        <span>{beat.bpm} BPM</span>
      </div>
      <p className="theme-text-muted mt-2 line-clamp-1 text-[11px]">{formatNote(item)}</p>
    </Link>
  );
}

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const preview = playlist.beats.slice(0, 4);
  return (
    <Link href="/library" className="theme-home-card group w-[220px] flex-none rounded-[24px] p-3 transition hover:-translate-y-0.5">
      <div className="theme-home-art grid aspect-square grid-cols-2 gap-2 overflow-hidden rounded-[18px] p-2">
        {preview.length > 0 ? preview.map((beat) => {
          const cover = resolveMediaUrl(beat.cover_art_obj);
          return cover ? (
            <img key={beat.id} src={cover} alt={beat.title} className="h-full w-full rounded-[12px] object-cover" />
          ) : (
            <div key={beat.id} className="theme-home-art rounded-[12px]" />
          );
        }) : Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="theme-home-art rounded-[12px]" />
        ))}
      </div>
      <p className="theme-text-main mt-3 line-clamp-1 text-base font-semibold">{playlist.name}</p>
      <p className="theme-text-muted mt-1 text-xs">{playlist.beats.length} beats</p>
      <p className="theme-text-faint mt-2 line-clamp-2 text-[11px]">
        {preview.map((beat) => beat.title).join(" ? ") || "Start adding beats to build this playlist."}
      </p>
    </Link>
  );
}

function ShelfRail({ shelf }: { shelf: Shelf }) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const scrollByCard = (direction: number) => {
    railRef.current?.scrollBy({ left: direction * 840, behavior: "smooth" });
  };

  const hasPlaylists = Boolean(shelf.playlists && shelf.playlists.length > 0);
  const hasBeats = Boolean(shelf.beats && shelf.beats.length > 0);
  if (!hasPlaylists && !hasBeats) {
    return null;
  }

  return (
    <section className="theme-home-rail rounded-[30px] p-5 md:p-6">
      <RailHeader
        title={shelf.title}
        subtitle={shelf.subtitle}
        href={shelf.see_more_path}
        onPrev={() => scrollByCard(-1)}
        onNext={() => scrollByCard(1)}
      />
      <div ref={railRef} className="flex gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shelf.playlists?.map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)}
        {shelf.beats?.map((item) => <BeatCard key={`${shelf.key}-${item.beat.id}`} item={item} />)}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { token, user } = useAuth();
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discovery, setDiscovery] = useState<DiscoveryState>({
    beats: [],
    dailyTrending: [],
    weeklyTrending: [],
  });
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const [catalogBeats, dailyTrending, weeklyTrending] = await Promise.all([
          apiRequest<HomeBeat[]>("/beats/"),
          apiRequest<TrendingBeat[]>("/beats/trending/daily/"),
          apiRequest<TrendingBeat[]>("/beats/trending/weekly/"),
        ]);

        if (cancelled) {
          return;
        }

        setDiscovery({
          beats: catalogBeats,
          dailyTrending,
          weeklyTrending,
        });
        setDiscoveryError(null);
        setError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        const message = err instanceof Error ? err.message : "Failed to load home feed";
        if (token) {
          setError(message);
        } else {
          setDiscoveryError(message);
        }
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
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setFeed(null);
      setFeedLoading(false);
      return;
    }

    const run = async () => {
      setFeedLoading(true);
      try {
        const homeFeed = await apiRequest<HomeFeed>("/analytics/listening/home/", { token });
        if (cancelled) {
          return;
        }
        setFeed({ ...homeFeed, shelves: withHomeCategoryPaths(homeFeed.shelves) });
        setError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        const message = err instanceof Error ? err.message : "Failed to load home feed";
        setError(message);
      } finally {
        if (!cancelled) {
          setFeedLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const genreShelves = useMemo(() => buildGenreShelves(discovery.beats), [discovery.beats]);
  const producerName = user?.producer_profile?.producer_name?.trim() || "";
  const artistName = user?.artist_profile?.stage_name?.trim() || "";

  let displayName = "";
  if (user?.active_role === "producer" && producerName) {
    displayName = producerName;
  } else if (user?.active_role === "artist" && artistName) {
    displayName = artistName;
  } else if (producerName) {
    displayName = producerName;
  } else if (artistName) {
    displayName = artistName;
  } else if (user?.username) {
    displayName = user.username;
  } else if (feed?.user_label) {
    displayName = feed.user_label;
  }

  const baseGreeting = feed?.greeting || "Welcome back";
  const headingGreeting = displayName ? `${baseGreeting}, ${displayName}` : baseGreeting;
  const homeHeroBeat = feed?.shelves.flatMap((shelf) => shelf.beats?.map((item) => item.beat) ?? shelf.playlists?.flatMap((playlist) => playlist.beats) ?? []).find((beat) => resolveMediaUrl(beat.cover_art_obj))
    ?? discovery.dailyTrending.find((beat) => resolveMediaUrl(beat.cover_art_obj))
    ?? discovery.weeklyTrending.find((beat) => resolveMediaUrl(beat.cover_art_obj))
    ?? discovery.beats.find((beat) => resolveMediaUrl(beat.cover_art_obj))
    ?? null;
  const homeHeroCover = homeHeroBeat ? resolveMediaUrl(homeHeroBeat.cover_art_obj) : null;

  if (loading) {
    return <HomePageSkeleton />;
  }

  return (
    <div className="space-y-4 pb-24">
      <section className="theme-home-hero relative min-h-[280px] overflow-hidden rounded-[30px] p-6 md:p-8">
        {homeHeroCover ? <img src={homeHeroCover} alt={homeHeroBeat?.title || headingGreeting} className="absolute inset-0 h-full w-full object-cover" /> : null}
        <div className="theme-home-hero-overlay-primary absolute inset-0" />
        <div className="theme-home-hero-overlay-secondary absolute inset-0" />
        <div className="relative flex min-h-[248px] flex-col justify-end">
          <p className="theme-text-faint text-xs uppercase tracking-[0.28em]">Home</p>
          <h1 className="theme-text-main mt-3 max-w-[12ch] text-4xl font-semibold leading-[1.02] md:text-6xl">
            {headingGreeting}
          </h1>
          <p className="theme-text-soft mt-3 max-w-2xl text-sm md:text-base">Jump back into fresh discovery, trending beats, and the categories moving fastest right now.</p>
          {homeHeroBeat ? (
            <div className="theme-home-meta mt-5 inline-flex w-fit flex-wrap items-center gap-3 rounded-full px-4 py-2 text-sm">
              <span className="theme-text-muted">Featured cover</span>
              <span className="theme-text-main font-medium">{homeHeroBeat.title}</span>
              <span className="theme-text-muted">{homeHeroBeat.producer_username}</span>
            </div>
          ) : null}
        </div>
      </section>

      {(feed?.shelves ?? []).map((shelf) => (
        <ShelfRail key={shelf.key} shelf={shelf} />
      ))}
      <TrendingBeatShelf
        title="Trending Today"
        subtitle="The fastest-moving beats from the last 24 hours."
        beats={discovery.dailyTrending}
        href="/home-category/trending-daily"
      />

      <TrendingBeatShelf
        title="Trending This Week"
        subtitle="The strongest discovery shelf from the last 7 days."
        beats={discovery.weeklyTrending}
        href="/home-category/trending-weekly"
      />

      {genreShelves.map((shelf) => (
        <ShelfRail key={shelf.key} shelf={shelf} />
      ))}

      {feedLoading ? <p className="text-sm text-white/55">Loading your personalized shelves...</p> : null}
      {error ? <p className="text-sm text-[#ffb4a9]">{error}</p> : null}
      {discoveryError ? <p className="text-sm text-[#ffb4a9]">{discoveryError}</p> : null}
    </div>
  );
}

