"use client";

import { BadgeCheck, Clock3, Heart, Play, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { BeatListRow } from "@/components/beat-list-row";
import { usePlayer } from "@/context/player-context";
import { apiRequest, resolveMediaUrl } from "@/lib/api";

type ProducerProfile = {
  producer_name: string;
  avatar_obj?: string | null;
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
  bpm: number;
  key?: string | null;
  mood?: string | null;
  base_price: string;
  like_count?: number;
  play_count?: number;
  created_at?: string;
  preview_audio_obj?: string | null;
  audio_file_obj?: string | null;
  cover_art_obj?: string | null;
  tag_names?: string[];
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
};

type TrackView = "recent" | "mostPlayed" | "topLiked";

function formatCompact(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return String(value);
}

export default function ProducerProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlay, canPlay } = usePlayer();
  const filterCardRef = useRef<HTMLElement | null>(null);
  const userId = Number(params.id);
  const [profile, setProfile] = useState<ProducerProfile | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [trust, setTrust] = useState<TrustSummary | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [trackView, setTrackView] = useState<TrackView>("recent");
  const [filterCardHeight, setFilterCardHeight] = useState(0);

  useEffect(() => {
    const run = async () => {
      try {
        const [profileResult, beatsResult, trustResult, dashboardResult] = await Promise.allSettled([
          apiRequest<ProducerProfile>(`/account/producers/by-user/${userId}/`),
          apiRequest<Beat[]>(`/beats/?producer=${userId}`),
          apiRequest<TrustSummary>(`/account/producer-trust/${userId}/`),
          apiRequest<DashboardSummary>(`/analytics/producer/${userId}/dashboard-summary/`),
        ]);

        if (profileResult.status === "fulfilled") setProfile(profileResult.value);
        if (beatsResult.status === "fulfilled") setBeats(beatsResult.value);
        if (trustResult.status === "fulfilled") setTrust(trustResult.value);
        if (dashboardResult.status === "fulfilled") setDashboard(dashboardResult.value);

        const rejected = [profileResult, beatsResult, trustResult, dashboardResult].find((result) => result.status === "rejected");
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

  useLayoutEffect(() => {
    const node = filterCardRef.current;
    if (!node || typeof window === "undefined") {
      return;
    }

    const updateHeight = () => {
      setFilterCardHeight(node.getBoundingClientRect().height);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(() => updateHeight());
    resizeObserver.observe(node);
    window.addEventListener("resize", updateHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  const producerName = profile?.producer_name || "Producer";
  const profileInitial = producerName.slice(0, 1).toUpperCase() || "P";
  const profileAvatarUrl = resolveMediaUrl(profile?.avatar_obj);
  const isVerified = Boolean(dashboard?.verified || profile?.verified);
  const profileGenres = profile?.genres ? profile.genres.split(",").map((item) => item.trim()).filter(Boolean) : [];

  const sortedBeats = useMemo(() => {
    const next = [...beats];
    if (trackView === "mostPlayed") {
      return next.sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0));
    }
    if (trackView === "topLiked") {
      return next.sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0));
    }
    return next.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [beats, trackView]);

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2200);
  };

  const sendPlayEvent = async (beatId: number) => {
    if (!token) {
      return;
    }
    try {
      await apiRequest("/analytics/listening/play/", {
        method: "POST",
        token,
        body: { beat_id: beatId, source: "producer-public-profile" },
      });
    } catch {
      // ignore analytics failures in the UI flow
    }
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
    await sendPlayEvent(beat.id);
  };

  return (
    <div className="relative pb-20 lg:pl-[365px]">
      <aside className="lg:fixed lg:bottom-5 lg:left-[max(1.5rem,calc((100vw-1200px)/2))] lg:top-[6.8rem] lg:flex lg:w-[340px] lg:items-center">
        <section className="rounded-[30px] border border-white/10 bg-[#1c1f29] px-5 py-4 shadow-[0_24px_70px_rgba(0,0,0,0.22)] lg:max-h-[calc(100vh-9.3rem)] lg:overflow-y-auto lg:px-4 lg:py-3">
          <div className="flex justify-center">
            {profileAvatarUrl ? (
              <img src={profileAvatarUrl} alt={producerName} className="h-32 w-32 rounded-full border border-white/10 object-cover" />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-[#2a3042] via-[#181b24] to-[#0c0f16] text-4xl font-black text-white/88">
                {profileInitial}
              </div>
            )}
          </div>

          <div className="mt-3 text-center">
            <h2 className="text-[2rem] font-semibold leading-none text-white">{producerName}</h2>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {profileGenres.length > 0 ? (
                profileGenres.map((genre) => (
                  <span key={genre} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/66">
                    {genre}
                  </span>
                ))
              ) : (
                <p className="text-sm text-white/52">Genre not set</p>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-center">
              <Play className="mx-auto h-4 w-4 text-[#a288ff]" strokeWidth={1.8} aria-hidden="true" />
              <p className="mt-1.5 text-lg font-semibold text-white">{formatCompact(dashboard?.plays ?? 0)}</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Plays</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-center">
              <Heart className="mx-auto h-4 w-4 text-[#ff9fc4]" strokeWidth={1.8} aria-hidden="true" />
              <p className="mt-1.5 text-lg font-semibold text-white">{formatCompact(dashboard?.likes ?? 0)}</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Likes</p>
            </div>
            <div className={`rounded-2xl border px-3 py-2.5 text-center ${isVerified ? "border-white/10 bg-white/[0.03]" : "border-white/6 bg-black/20"}`}>
              {isVerified ? (
                <BadgeCheck className="mx-auto h-4 w-4 text-[#9ee8dc]" strokeWidth={1.8} aria-hidden="true" />
              ) : (
                <ShieldAlert className="mx-auto h-4 w-4 text-white/28" strokeWidth={1.8} aria-hidden="true" />
              )}
              <p className={`mt-1.5 text-sm font-semibold ${isVerified ? "text-white" : "text-white/48"}`}>Verified</p>
              <p className={`text-[11px] uppercase tracking-[0.16em] ${isVerified ? "text-white/45" : "text-white/24"}`}>Status</p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:p-3.5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/42">Bio</p>
            <p className="mt-1.5 text-sm leading-6 text-white/68">{profile?.bio || "No producer bio yet."}</p>
          </div>

          {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        </section>
      </aside>

      <section className="space-y-5 lg:pt-[calc(var(--profile-filter-height,0px)+1.5rem)]" style={{ ["--profile-filter-height" as string]: `${filterCardHeight}px` }}>
        <section ref={filterCardRef} className="overflow-hidden rounded-[30px] border border-white/10 bg-[#1c1f29] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.22)] lg:fixed lg:top-[6.8rem] lg:left-[calc(max(1.5rem,calc((100vw-1200px)/2))+365px)] lg:right-[max(1.5rem,calc((100vw-1200px)/2))] lg:z-30 lg:rounded-[24px] lg:rounded-t-none lg:border-x-0 lg:border-t-0 lg:border-b lg:border-white/8 lg:bg-[#0d0f16]/96 lg:px-0 lg:pb-4 lg:pt-3 lg:shadow-none lg:backdrop-blur-xl">
          <div className="lg:px-1">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/34">Producer catalog</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">{producerName}</h1>
            </div>
            <Link href="/beats" className="rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white/75 hover:bg-white/[0.06]">
              Back to beats
            </Link>
          </div>

          <div className="mt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/34">Beat filters</p>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: "recent", label: "Recent" },
                { key: "mostPlayed", label: "Most Played" },
                { key: "topLiked", label: "Top Liked" },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setTrackView(option.key as TrackView)}
                  className={`rounded-full border px-3 py-1.5 text-[12px] transition ${
                    trackView === option.key
                      ? "border-[#8b4dff]/80 bg-[#8b4dff]/18 text-white"
                      : "border-white/10 bg-white/[0.02] text-white/58 hover:bg-white/[0.05]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          </div>
        </section>

        <div className="relative z-0 pt-1">
          {sortedBeats.map((beat) => {
            const isCurrent = currentTrack?.id === beat.id;
            return (
              <BeatListRow
                key={beat.id}
                beat={{
                  ...beat,
                  producer_username: beat.producer_username || producerName,
                }}
                artistHref={`/producers/${beat.producer}`}
                detailHref={`/beats/${beat.id}`}
                isCurrent={isCurrent}
                isPlaying={isCurrent && isPlaying}
                onPlay={() => void handlePlay(beat)}
                actionLabel={`Open Track - Rs ${beat.base_price}`}
                actionTone="neutral"
                onAction={() => router.push(`/beats/${beat.id}`)}
                message={notify}
              />
            );
          })}
          {sortedBeats.length === 0 ? <p className="text-base text-white/60">No beats uploaded yet.</p> : null}
        </div>

        {message ? <div className="fixed right-6 top-24 z-[150] rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">{message}</div> : null}
      </section>
    </div>
  );
}
