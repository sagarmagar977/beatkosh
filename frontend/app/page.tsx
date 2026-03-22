"use client";

import { Flame, Headphones, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { apiRequest, resolveMediaUrl } from "@/lib/api";

type License = { id: number; name: string; is_exclusive?: boolean; includes_stems?: boolean };
type RecommendationBeat = {
  id: number;
  producer: number;
  producer_username: string;
  title: string;
  genre: string;
  beat_type?: string;
  mood?: string;
  bpm: number;
  base_price: string;
  licenses?: License[];
  storefront_flags?: { free_download?: boolean; stems_available?: boolean; exclusive_available?: boolean };
};
type CatalogBeat = {
  id: number;
  producer: number;
  producer_username: string;
  title: string;
  genre: string;
  beat_type?: string | null;
  mood?: string | null;
  bpm: number;
  base_price: string;
  cover_art_obj?: string | null;
  play_count?: number;
  tag_names?: string[];
};
type RecommendationFeed = { based_on: string; beats: RecommendationBeat[] };
type Producer = {
  producer_id: number;
  producer_name: string;
  username: string;
  headline?: string;
  genres?: string;
  trust_score?: number;
  badges?: string[];
  service_offerings?: string[];
  accepts_album_projects?: boolean;
  accepts_custom_singles?: boolean;
};

const quickTags = ["Trending", "Drill", "Lo-fi", "Afro", "Sad", "Workout"];

const shelfGradients = [
  "from-[#165d46] via-[#0d2d22] to-[#101418]",
  "from-[#6a1b3d] via-[#26111d] to-[#101418]",
  "from-[#6b4f10] via-[#241a0a] to-[#101418]",
  "from-[#204f73] via-[#112032] to-[#101418]",
];

function formatGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function tileBackground(beat: CatalogBeat) {
  const cover = resolveMediaUrl(beat.cover_art_obj);
  if (cover) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.48)), url("${cover}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

  return {
    backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))`,
  };
}

export default function HomePage() {
  const { token, user } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendationFeed | null>(null);
  const [producers, setProducers] = useState<Producer[]>([]);
  const [beats, setBeats] = useState<CatalogBeat[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const [recData, producerData, beatData] = await Promise.all([
          apiRequest<RecommendationFeed>("/analytics/recommendations/beats/", { token }),
          apiRequest<Producer[]>("/account/producer-discovery/"),
          apiRequest<CatalogBeat[]>("/beats/"),
        ]);
        setRecommendations(recData);
        setProducers(producerData);
        setBeats(beatData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load BeatKosh home");
      }
    };
    void run();
  }, [token]);

  const featuredBeats = useMemo(() => beats.slice(0, 8), [beats]);
  const trendingBeats = useMemo(
    () => [...beats].sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0)).slice(0, 6),
    [beats],
  );
  const moodMix = useMemo(
    () => beats.filter((beat) => beat.mood || beat.beat_type).slice(0, 6),
    [beats],
  );
  const greeting = formatGreeting();

  return (
    <div className="space-y-6 pb-24">
      <section className="grid gap-6 xl:grid-cols-[1.5fr_0.72fr]">
        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(31,191,111,0.24),transparent_28%),linear-gradient(135deg,#1db954_0%,#14321f_38%,#0f1117_100%)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)] md:p-8">
          <p className="spotify-kicker text-[0.68rem] text-white/62">BeatKosh Home</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/70">
            <span className="rounded-full border border-white/14 bg-black/20 px-3 py-1.5">{greeting}</span>
            <span className="rounded-full border border-white/14 bg-black/20 px-3 py-1.5">
              {recommendations?.based_on ?? "Fresh catalog signals"}
            </span>
            {user ? (
              <span className="rounded-full border border-white/14 bg-black/20 px-3 py-1.5">
                @{user.username}
              </span>
            ) : null}
          </div>
          <h1 className="spotify-display mt-6 max-w-[11ch] text-5xl text-white md:text-7xl">
            Find beats like a streaming app.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/76 md:text-base">
            We kept the marketplace flow, but gave the homepage a more Spotify-like rhythm with quick picks,
            mood-led discovery, and dense rows you can scan fast.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/beats" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#111318] transition hover:scale-[1.02]">
              Browse Beats
            </Link>
            <Link href="/beats-trending" className="rounded-full border border-white/14 bg-black/15 px-5 py-3 text-sm text-white/84 transition hover:bg-white/10">
              Trending Now
            </Link>
          </div>
          <div className="mt-7 grid gap-3 md:grid-cols-2">
            {featuredBeats.slice(0, 4).map((beat, index) => (
              <Link
                key={beat.id}
                href={`/beats/${beat.id}`}
                className="group flex items-center gap-3 rounded-[20px] border border-white/10 bg-black/20 p-3 transition hover:border-white/22 hover:bg-black/30"
              >
                <div
                  className={`h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br ${shelfGradients[index % shelfGradients.length]}`}
                  style={tileBackground(beat)}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{beat.title}</p>
                  <p className="truncate text-xs text-white/62">
                    {beat.producer_username} • {beat.genre}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <aside className="surface-panel rounded-[32px] p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Right Now</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Top producers</h2>
            </div>
            <Sparkles className="h-5 w-5 text-[#1ed760]" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div className="mt-5 space-y-3">
            {producers.slice(0, 5).map((producer, index) => (
              <article key={producer.producer_id} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1ed760]/14 text-sm font-semibold text-[#9bf0b2]">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/producers/${producer.producer_id}`} className="block truncate font-semibold hover:underline">
                      {producer.producer_name || producer.username}
                    </Link>
                    <p className="mt-1 text-sm text-white/60">
                      {producer.headline || producer.genres || "BeatKosh producer"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/58">
                      <span className="rounded-full border border-white/10 px-2 py-1">
                        Trust {producer.trust_score ?? 0}
                      </span>
                      {(producer.badges ?? []).slice(0, 2).map((badge) => (
                        <span key={badge} className="rounded-full border border-white/10 px-2 py-1">
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="surface-panel rounded-[30px] p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Quick Access</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Jump back into a vibe</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickTags.map((tag, index) => (
              <Link
                key={tag}
                href={index === 0 ? "/beats-trending" : "/beats"}
                className={`rounded-full border px-3 py-1.5 text-xs text-white/74 transition hover:text-white ${
                  index === 0 ? "border-[#1ed760]/35 bg-[#1ed760]/10" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {featuredBeats.slice(0, 4).map((beat, index) => (
            <Link
              key={beat.id}
              href={`/beats/${beat.id}`}
              className="group overflow-hidden rounded-[24px] border border-white/10 bg-[#12161d] transition hover:-translate-y-0.5 hover:border-white/18"
            >
              <div
                className={`h-36 bg-gradient-to-br ${shelfGradients[(index + 1) % shelfGradients.length]}`}
                style={tileBackground(beat)}
              />
              <div className="p-4">
                <p className="truncate text-base font-semibold text-white">{beat.title}</p>
                <p className="mt-1 truncate text-sm text-white/58">{beat.producer_username}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-white/58">
                  <span>{beat.genre}</span>
                  <span>Rs {beat.base_price}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <div className="surface-panel rounded-[30px] p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Made For You</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Recommended shelf</h2>
            </div>
            <Headphones className="h-5 w-5 text-white/62" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(recommendations?.beats ?? []).slice(0, 6).map((beat, index) => (
              <Link
                key={beat.id}
                href={`/beats/${beat.id}`}
                className="group rounded-[24px] border border-white/10 bg-[#12161d] p-4 transition hover:-translate-y-0.5 hover:border-white/18"
              >
                <div className={`flex aspect-square items-end rounded-[20px] bg-gradient-to-br p-4 ${shelfGradients[index % shelfGradients.length]}`}>
                  <span className="rounded-full bg-black/30 px-2 py-1 text-[11px] text-white/76">
                    {beat.mood || beat.beat_type || beat.genre}
                  </span>
                </div>
                <p className="mt-4 truncate text-base font-semibold text-white">{beat.title}</p>
                <p className="mt-1 truncate text-sm text-white/58">
                  {beat.producer_username} • {beat.bpm} BPM
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/56">
                  {beat.storefront_flags?.stems_available ? (
                    <span className="rounded-full border border-white/10 px-2 py-1">Stems</span>
                  ) : null}
                  {beat.storefront_flags?.exclusive_available ? (
                    <span className="rounded-full border border-white/10 px-2 py-1">Exclusive</span>
                  ) : null}
                  {beat.storefront_flags?.free_download ? (
                    <span className="rounded-full border border-white/10 px-2 py-1">Free MP3</span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section className="surface-panel rounded-[30px] p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Trending</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Hot this week</h2>
              </div>
              <TrendingUp className="h-5 w-5 text-[#1ed760]" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <div className="mt-5 space-y-3">
              {trendingBeats.map((beat, index) => (
                <Link
                  key={beat.id}
                  href={`/beats/${beat.id}`}
                  className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] p-3 transition hover:border-white/18 hover:bg-white/[0.05]"
                >
                  <div className="w-5 text-xs font-semibold text-white/42">{index + 1}</div>
                  <div
                    className={`h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br ${shelfGradients[index % shelfGradients.length]}`}
                    style={tileBackground(beat)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{beat.title}</p>
                    <p className="truncate text-xs text-white/58">
                      {beat.producer_username} • {beat.genre}
                    </p>
                  </div>
                  <div className="text-right text-xs text-white/54">
                    <p>{beat.play_count ?? 0} plays</p>
                    <p>Rs {beat.base_price}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="surface-panel rounded-[30px] p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Mood Mix</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Browse by feel</h2>
              </div>
              <Flame className="h-5 w-5 text-[#ff8d52]" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {moodMix.map((beat, index) => (
                <Link
                  key={beat.id}
                  href={`/beats/${beat.id}`}
                  className={`rounded-[24px] bg-gradient-to-br p-4 text-white ${shelfGradients[(index + 2) % shelfGradients.length]}`}
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-white/62">
                    {beat.mood || beat.beat_type || "Beat mix"}
                  </p>
                  <p className="mt-8 text-lg font-semibold">{beat.title}</p>
                  <p className="mt-1 text-sm text-white/68">{beat.genre} • {beat.bpm} BPM</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>

      {error ? <p className="text-sm text-[#ffb4a9]">{error}</p> : null}
    </div>
  );
}
