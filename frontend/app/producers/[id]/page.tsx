"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Heart,
  Pause,
  Play,
  Share2,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { usePlayer } from "@/context/player-context";
import { apiRequest, resolveMediaUrl } from "@/lib/api";

type ProducerProfile = {
  producer_name: string;
  headline?: string;
  bio: string;
  genres: string;
  verified: boolean;
  rating: string;
  total_sales: number;
  service_offerings?: string[];
  featured_beat_ids?: number[];
  accepts_custom_singles?: boolean;
  accepts_album_projects?: boolean;
};

type Beat = {
  id: number;
  producer: number;
  title: string;
  producer_username?: string;
  genre: string;
  beat_type?: string | null;
  bpm: number;
  key?: string | null;
  mood?: string | null;
  base_price: string;
  is_featured?: boolean;
  like_count?: number;
  play_count?: number;
  created_at?: string;
  preview_audio_obj?: string | null;
  audio_file_obj?: string | null;
  cover_art_obj?: string | null;
  storefront_flags?: { stems_available?: boolean; exclusive_available?: boolean };
};

type TrustSummary = {
  trust_score: number;
  profile_completion: number;
  seller_agreement_accepted: boolean;
  payout_ready: boolean;
  badges: string[];
  service_offerings: string[];
  availability: { custom_single: boolean; album: boolean };
};

type DashboardSummary = {
  follower_count: number;
  verified: boolean;
  plays: number;
  likes: number;
  purchases: number;
  conversion_rate: number;
  top_beats: Beat[];
};

type ProducerCard = {
  producer_id: number;
  username: string;
  producer_name: string;
  headline?: string;
  genres?: string;
  badges?: string[];
  trust_score?: number;
};

type TrackView = "recent" | "mostPlayed" | "bestImpression";

function formatCompact(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return String(value);
}

function formatDate(raw?: string) {
  if (!raw) return "Unknown date";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown date";
  }
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ProducerProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlay, canPlay } = usePlayer();
  const userId = Number(params.id);
  const [profile, setProfile] = useState<ProducerProfile | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [trust, setTrust] = useState<TrustSummary | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [similar, setSimilar] = useState<ProducerCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [trackView, setTrackView] = useState<TrackView>("recent");

  useEffect(() => {
    const run = async () => {
      try {
        const [profileResult, beatsResult, trustResult, dashboardResult, similarResult] = await Promise.allSettled([
          apiRequest<ProducerProfile>(`/account/producers/by-user/${userId}/`),
          apiRequest<Beat[]>(`/beats/?producer=${userId}`),
          apiRequest<TrustSummary>(`/account/producer-trust/${userId}/`),
          apiRequest<DashboardSummary>(`/analytics/producer/${userId}/dashboard-summary/`),
          apiRequest<ProducerCard[]>(`/analytics/similar/producers/${userId}/`),
        ]);

        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value);
        }
        if (beatsResult.status === "fulfilled") {
          setBeats(beatsResult.value);
        }
        if (trustResult.status === "fulfilled") {
          setTrust(trustResult.value);
        }
        if (dashboardResult.status === "fulfilled") {
          setDashboard(dashboardResult.value);
        }
        if (similarResult.status === "fulfilled") {
          setSimilar(similarResult.value);
        }

        const rejected = [profileResult, beatsResult, trustResult, dashboardResult, similarResult].find(
          (result) => result.status === "rejected",
        );
        if (rejected?.status === "rejected") {
          setError(rejected.reason instanceof Error ? rejected.reason.message : "Failed to load producer profile");
        } else {
          setError(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load producer profile");
      }
    };
    void run();
  }, [userId]);

  const producerName = profile?.producer_name || "Producer";
  const producerGenres = profile?.genres || "Genres not set";
  const producerBio = profile?.bio || "No bio yet.";
  const profileInitial = producerName.slice(0, 1).toUpperCase() || "P";
  const serviceOfferings = trust?.service_offerings ?? profile?.service_offerings ?? [];
  const totalBeatLikes = useMemo(() => beats.reduce((sum, beat) => sum + (beat.like_count ?? 0), 0), [beats]);
  const totalBeatPlays = useMemo(() => beats.reduce((sum, beat) => sum + (beat.play_count ?? 0), 0), [beats]);
  const topLikedBeat = useMemo(() => [...beats].sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0))[0] ?? null, [beats]);
  const mostPlayedBeat = useMemo(() => [...beats].sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0))[0] ?? null, [beats]);
  const newestBeat = useMemo(
    () =>
      [...beats].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      })[0] ?? null,
    [beats],
  );
  const sortedBeats = useMemo(() => {
    const next = [...beats];
    if (trackView === "mostPlayed") {
      return next.sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0) || (b.like_count ?? 0) - (a.like_count ?? 0));
    }
    if (trackView === "bestImpression") {
      return next.sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0) || (b.play_count ?? 0) - (a.play_count ?? 0));
    }
    return next.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [beats, trackView]);

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 1800);
  };

  const sendPlayEvent = async (beatId: number, source: string) => {
    if (!token) return;
    try {
      await apiRequest("/analytics/listening/play/", {
        method: "POST",
        token,
        body: { beat_id: beatId, source },
      });
      setBeats((current) =>
        current.map((beat) => (beat.id === beatId ? { ...beat, play_count: (beat.play_count ?? 0) + 1 } : beat)),
      );
      setDashboard((current) => (current ? { ...current, plays: current.plays + 1 } : current));
    } catch {}
  };

  const handlePlay = async (beat: Beat) => {
    const playbackUrl = resolveMediaUrl(beat.preview_audio_obj || beat.audio_file_obj);
    if (!playbackUrl) {
      notify("Preview unavailable.");
      return;
    }
    if (!token || !canPlay) {
      router.push("/auth/login");
      return;
    }
    const isCurrent = currentTrack?.id === beat.id;
    if (isCurrent) {
      await togglePlay();
      return;
    }
    await playTrack({
      id: beat.id,
      title: beat.title,
      artist: beat.producer_username || producerName,
      bpm: beat.bpm,
      playCount: beat.play_count,
      key: beat.key,
      genre: beat.genre,
      mood: beat.mood,
      price: beat.base_price,
      coverText: beat.title,
      coverUrl: resolveMediaUrl(beat.cover_art_obj),
      beatUrl: `/beats/${beat.id}`,
      audioUrl: playbackUrl,
    });
    await sendPlayEvent(beat.id, "producer-profile");
  };

  return (
    <div className="grid gap-5 pb-28 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-4">
        <section className="rounded-[28px] border border-white/10 bg-[#1f1f21] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
          <Link href="/beats" className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
            Back to beats
          </Link>
          <div className="mt-4 flex justify-center">
            <div className="flex h-48 w-48 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-[#242833] via-[#16181f] to-[#0c0f16] text-6xl font-black text-white/90">
              {profileInitial}
            </div>
          </div>
          <div className="mt-5 text-center">
            <h1 className="inline-flex items-center gap-2 text-4xl font-semibold tracking-tight">
              {producerName}
              {dashboard?.verified || profile?.verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#7f5af0] px-2 py-1 text-xs text-white">
                  <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  Verified
                </span>
              ) : null}
              <span className="rounded-full bg-[#f4b53f] px-2 py-1 text-xs font-semibold text-[#271700]">PRO</span>
            </h1>
            <p className="mt-3 text-xl text-[#a288ff]">{profile?.headline || "Multi genre producer."}</p>
            <p className="mt-1 text-sm text-white/68">{producerGenres}</p>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-2 text-center text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-3">
              <Users className="mx-auto h-5 w-5 text-[#a288ff]" strokeWidth={1.8} aria-hidden="true" />
              <p className="text-lg font-semibold text-white">{dashboard?.follower_count ?? 0}</p>
              <p className="mt-1 text-xs text-white/55">Followers</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-3">
              <Play className="mx-auto h-5 w-5 text-[#a288ff]" strokeWidth={1.8} aria-hidden="true" />
              <p className="text-lg font-semibold text-white">{formatCompact(dashboard?.plays ?? totalBeatPlays)}</p>
              <p className="mt-1 text-xs text-white/55">Plays</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-3">
              <Heart className="mx-auto h-5 w-5 text-[#a288ff]" strokeWidth={1.8} aria-hidden="true" />
              <p className="text-lg font-semibold text-white">{formatCompact(dashboard?.likes ?? totalBeatLikes)}</p>
              <p className="mt-1 text-xs text-white/55">Likes</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-3">
              <BadgeCheck className="mx-auto h-5 w-5 text-[#a288ff]" strokeWidth={1.8} aria-hidden="true" />
              <p className="text-lg font-semibold text-white">{dashboard?.verified || profile?.verified ? "Yes" : "No"}</p>
              <p className="mt-1 text-xs text-white/55">Verified</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
            <Link href="/projects" className="brand-btn inline-flex items-center justify-center gap-2 px-4 py-3 text-center text-xl font-semibold">
              <UserPlus className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              Follow
            </Link>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/80"
            >
              <Share2 className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#1f1f21] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/42">Recognition</p>
          <div className="mt-4 space-y-3 text-base text-white/82">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <span>{formatCompact(dashboard?.plays ?? totalBeatPlays)}+ Plays</span>
              <span className="text-xl">10k</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <span>Trending Now</span>
              <span className="text-xl">Hot</span>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#1f1f21] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">About me</h2>
            <span className="text-white/40">Open</span>
          </div>
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-base leading-8 text-white/74">{producerBio}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-white/76">
            {serviceOfferings.map((service) => (
              <span key={service} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                {service}
              </span>
            ))}
            {serviceOfferings.length === 0 ? <span className="text-sm text-white/55">Services coming soon.</span> : null}
          </div>
          <div className="mt-5 flex items-center justify-center gap-5 text-sm text-white/65">
            <span className="rounded-full border border-white/10 px-3 py-1">Instagram</span>
            <span className="rounded-full border border-white/10 px-3 py-1">YouTube</span>
          </div>
        </section>
      </aside>

      <section className="space-y-5">
        <section className="rounded-[30px] border border-white/10 bg-[#202022] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-4xl font-semibold tracking-tight">All Works</h2>
              <p className="mt-1 text-sm text-white/60">RProfile-style track shelf with recent uploads, most played records, and best impression based on loves.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/55">
              {sortedBeats.length} uploaded beats
            </span>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {[
              { key: "recent", label: "Recent Tracks" },
              { key: "mostPlayed", label: "Most Played" },
              { key: "bestImpression", label: "Best Impression" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setTrackView(option.key as TrackView)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  trackView === option.key
                    ? "border-[#8b4dff] bg-[#8b4dff] text-white"
                    : "border-white/10 bg-white/[0.03] text-white/68 hover:bg-white/[0.06]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="mb-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Recent Track</p>
              <p className="mt-2 text-lg font-semibold text-white">{newestBeat?.title ?? "No uploads yet"}</p>
              <p className="mt-1 text-sm text-white/55">{newestBeat?.created_at ? formatDate(newestBeat.created_at) : "Waiting for first release"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Top Track</p>
              <p className="mt-2 text-lg font-semibold text-white">{topLikedBeat?.title ?? "No love data yet"}</p>
              <p className="mt-1 text-sm text-white/55">{formatCompact(topLikedBeat?.like_count ?? 0)} loves</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Most Played</p>
              <p className="mt-2 text-lg font-semibold text-white">{mostPlayedBeat?.title ?? "No play data yet"}</p>
              <p className="mt-1 text-sm text-white/55">{formatCompact(mostPlayedBeat?.play_count ?? 0)} plays</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {sortedBeats.map((beat) => {
              const isCurrent = currentTrack?.id === beat.id;
              const coverUrl = resolveMediaUrl(beat.cover_art_obj);
              return (
                <article key={beat.id} className="rounded-[24px] border border-white/10 bg-[#17181c] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
                  <div className="flex items-start gap-4">
                    {coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverUrl} alt={beat.title} className="h-20 w-20 rounded-xl border border-white/10 object-cover" />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-[#2a3546] to-[#11151d] text-lg font-bold text-white/80">
                        {beat.title.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link href={`/beats/${beat.id}`} className="line-clamp-1 text-2xl font-semibold tracking-tight hover:underline">
                            {beat.title}
                          </Link>
                          <p className="mt-1 text-sm text-white/62">
                            {producerName} | {beat.genre} | {beat.bpm} BPM | {beat.key || "N/A"}
                          </p>
                        </div>
                        {beat.is_featured ? (
                          <span className="rounded-full border border-[#f4b53f]/40 bg-[#f4b53f]/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffd68d]">
                            Featured
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/70">
                        <span className="rounded-full border border-white/10 px-3 py-1">{formatDate(beat.created_at)}</span>
                        {beat.mood ? <span className="rounded-full border border-white/10 px-3 py-1">{beat.mood}</span> : null}
                        {beat.storefront_flags?.stems_available ? <span className="rounded-full border border-white/10 px-3 py-1">Stems</span> : null}
                        {beat.storefront_flags?.exclusive_available ? <span className="rounded-full border border-white/10 px-3 py-1">Exclusive</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-3">
                      <Play className="mx-auto h-4 w-4 text-[#a288ff]" strokeWidth={1.8} aria-hidden="true" />
                      <p className="mt-1 text-base font-semibold text-white">{formatCompact(beat.play_count ?? 0)}</p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Plays</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-3">
                      <Heart className="mx-auto h-4 w-4 text-[#ff9fc4]" strokeWidth={1.8} aria-hidden="true" />
                      <p className="mt-1 text-base font-semibold text-white">{formatCompact(beat.like_count ?? 0)}</p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Loves</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-3">
                      <BadgeCheck className="mx-auto h-4 w-4 text-[#9ee8dc]" strokeWidth={1.8} aria-hidden="true" />
                      <p className="mt-1 text-base font-semibold text-white">Rs {beat.base_price}</p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Price</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => void handlePlay(beat)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
                        isCurrent && isPlaying ? "border-[#8b4dff] bg-[#8b4dff] text-white" : "border-white/20 bg-white/5 text-white/85"
                      }`}
                    >
                      {isCurrent && isPlaying ? <Pause className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" /> : <Play className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
                      {isCurrent && isPlaying ? "Pause" : "Play Preview"}
                    </button>
                    <Link href={`/beats/${beat.id}`} className="brand-btn px-5 py-2.5 text-sm font-semibold">
                      Open Track
                    </Link>
                  </div>
                </article>
              );
            })}
            {beats.length === 0 ? <p className="text-base text-white/60">No beats uploaded yet.</p> : null}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <section className="rounded-[28px] border border-white/10 bg-[#1f1f21] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
            <h2 className="text-2xl font-semibold">Performance Snapshot</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Likes</p>
                <p className="mt-2 text-2xl font-semibold">{dashboard?.likes ?? totalBeatLikes}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Plays</p>
                <p className="mt-2 text-2xl font-semibold">{dashboard?.plays ?? totalBeatPlays}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Conversion</p>
                <p className="mt-2 text-2xl font-semibold">{dashboard?.conversion_rate ?? 0}%</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {(dashboard?.top_beats ?? []).map((beat) => (
                <div key={beat.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70">
                  {beat.title} | {beat.genre} | Rs {beat.base_price}
                </div>
              ))}
            </div>
          </section>

          <aside className="rounded-[28px] border border-white/10 bg-[#1f1f21] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
            <h2 className="text-2xl font-semibold">Similar Producers</h2>
            <div className="mt-4 space-y-3">
              {similar.map((producer) => (
                <div key={producer.producer_id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <Link href={`/producers/${producer.producer_id}`} className="font-medium hover:underline">
                    {producer.producer_name || producer.username}
                  </Link>
                  <p className="mt-1 text-sm text-white/60">{producer.headline || producer.genres || "Producer"}</p>
                  <p className="mt-2 text-xs text-white/55">Trust {producer.trust_score ?? 0}</p>
                </div>
              ))}
              {similar.length === 0 ? <p className="text-sm text-white/60">No similar producers yet.</p> : null}
            </div>
          </aside>
        </section>
        {error ? <p className="mt-3 text-base text-rose-300">{error}</p> : null}
        {message ? <p className="mt-3 text-base text-[#d2b0ff]">{message}</p> : null}
      </section>
    </div>
  );
}
