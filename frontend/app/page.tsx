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
        <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-white/55">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {href ? (
          <Link href={href} className="rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-white/72 transition hover:bg-white/[0.06] hover:text-white">
            See more
          </Link>
        ) : null}
        <button type="button" onClick={onPrev} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/72 transition hover:bg-white/[0.06] hover:text-white">
          <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
        <button type="button" onClick={onNext} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/72 transition hover:bg-white/[0.06] hover:text-white">
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
    <Link href={`/beats/${beat.id}`} className="group w-[190px] flex-none rounded-[22px] border border-white/8 bg-white/[0.03] p-3 transition hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.05]">
      <div className="overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#17311f,#11151d_60%,#2f1a19)]">
        {cover ? (
          <img src={cover} alt={beat.title} className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
        ) : (
          <div className="aspect-square w-full" />
        )}
      </div>
      <p className="mt-3 line-clamp-1 text-sm font-semibold text-white">{beat.title}</p>
      <p className="mt-1 line-clamp-1 text-xs text-white/58">{beat.producer_username}</p>
      <div className="mt-3 flex items-center justify-between text-[11px] text-white/48">
        <span>{beat.genre}</span>
        <span>{beat.bpm} BPM</span>
      </div>
      <p className="mt-2 line-clamp-1 text-[11px] text-white/62">{formatNote(item)}</p>
    </Link>
  );
}

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const preview = playlist.beats.slice(0, 4);
  return (
    <Link href="/library" className="group w-[220px] flex-none rounded-[24px] border border-white/8 bg-white/[0.03] p-3 transition hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.05]">
      <div className="grid aspect-square grid-cols-2 gap-2 overflow-hidden rounded-[18px] bg-[#12161d] p-2">
        {preview.length > 0 ? preview.map((beat) => {
          const cover = resolveMediaUrl(beat.cover_art_obj);
          return cover ? (
            <img key={beat.id} src={cover} alt={beat.title} className="h-full w-full rounded-[12px] object-cover" />
          ) : (
            <div key={beat.id} className="rounded-[12px] bg-[linear-gradient(135deg,#20402d,#151920)]" />
          );
        }) : Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[12px] bg-[linear-gradient(135deg,#20402d,#151920)]" />
        ))}
      </div>
      <p className="mt-3 line-clamp-1 text-base font-semibold text-white">{playlist.name}</p>
      <p className="mt-1 text-xs text-white/58">{playlist.beats.length} beats</p>
      <p className="mt-2 line-clamp-2 text-[11px] text-white/44">
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
    <section className="rounded-[30px] border border-white/8 bg-[#111315]/94 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-6">
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
        const [catalogBeats, dailyTrending, weeklyTrending, homeFeed] = await Promise.all([
          apiRequest<HomeBeat[]>("/beats/"),
          apiRequest<TrendingBeat[]>("/beats/trending/daily/"),
          apiRequest<TrendingBeat[]>("/beats/trending/weekly/"),
          token ? apiRequest<HomeFeed>("/analytics/listening/home/", { token }) : Promise.resolve<HomeFeed | null>(null),
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
        setFeed(homeFeed ? { ...homeFeed, shelves: withHomeCategoryPaths(homeFeed.shelves) } : null);
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

  if (loading) {
    return <HomePageSkeleton />;
  }

  return (
    <div className="space-y-4 pb-24">
      <section className="pt-1">
        <h1 className="max-w-[12ch] text-4xl font-semibold leading-[0.94] text-white md:text-6xl">
          {headingGreeting}
        </h1>
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

      {error ? <p className="text-sm text-[#ffb4a9]">{error}</p> : null}
      {discoveryError ? <p className="text-sm text-[#ffb4a9]">{discoveryError}</p> : null}
    </div>
  );
}




