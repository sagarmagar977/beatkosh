"use client";

import { BadgeCheck, ChevronRight, Disc3, Flame, Heart, Play, ShieldAlert, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { usePlayer, type PlayerTrack } from "@/context/player-context";
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

type FeaturedProducer = {
  producer_id: number;
  username: string;
  producer_name: string;
  headline?: string | null;
  avatar_obj?: string | null;
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
  featured_producer_ids?: number[];
  featured_producers?: FeaturedProducer[];
};

type DashboardSummary = {
  follower_count: number;
  verified: boolean;
  plays: number;
  likes: number;
  purchases: number;
  conversion_rate: number;
};

type FollowItem = {
  id: number;
  producer: number;
  producer_username: string;
};

type TrackView = "popular" | "liked" | "recent";

function formatCompact(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return String(value);
}

function formatReleaseYear(raw?: string) {
  if (!raw) return "New release";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "New release";
  return parsed.getFullYear().toString();
}

function buildPlayerTrack(beat: Beat, fallbackArtist: string): PlayerTrack {
  return {
    id: beat.id,
    title: beat.title,
    artist: beat.producer_username || fallbackArtist,
    source: "producer-public-profile",
    bpm: beat.bpm,
    playCount: beat.play_count,
    key: beat.key,
    genre: beat.genre,
    mood: beat.mood,
    price: beat.base_price,
    coverText: beat.title,
    coverUrl: resolveMediaUrl(beat.cover_art_obj),
    beatUrl: `/beats/${beat.id}`,
    audioUrl: resolveMediaUrl(beat.preview_audio_obj || beat.audio_file_obj),
  };
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="spotify-display text-[1.55rem] leading-none text-white">{title}</h2>
      {action && onAction ? (
        <button type="button" onClick={onAction} className="text-sm font-medium text-white/65 transition hover:text-white">
          {action}
        </button>
      ) : null}
    </div>
  );
}

function BeatShelfCard({ beat }: { beat: Beat }) {
  const cover = resolveMediaUrl(beat.cover_art_obj);
  return (
    <Link href={`/beats/${beat.id}`} className="group w-[150px] flex-none sm:w-[180px]">
      <div className="overflow-hidden rounded-[22px] bg-white/[0.04]">
        {cover ? (
          <img src={cover} alt={beat.title} className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
        ) : (
          <div className="aspect-square w-full bg-[radial-gradient(circle_at_top,_rgba(255,95,31,0.42),_rgba(19,20,23,0.95)_62%)]" />
        )}
      </div>
      <p className="mt-3 line-clamp-1 text-sm font-semibold text-white">{beat.title}</p>
      <p className="mt-1 text-xs text-white/55">{formatReleaseYear(beat.created_at)} ? {beat.genre}</p>
    </Link>
  );
}

function ProducerCard({ producer }: { producer: FeaturedProducer }) {
  const avatar = resolveMediaUrl(producer.avatar_obj);
  return (
    <Link href={`/producers/${producer.producer_id}`} className="group w-[180px] flex-none rounded-[26px] bg-white/[0.04] p-4 transition hover:bg-white/[0.07] sm:w-[210px]">
      {avatar ? (
        <img src={avatar} alt={producer.producer_name} className="h-20 w-20 rounded-full object-cover" />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,#24423a,#0d1115)] text-2xl font-black text-white/85">
          {producer.producer_name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <p className="mt-4 line-clamp-1 text-base font-semibold text-white">{producer.producer_name}</p>
      <p className="mt-1 line-clamp-2 text-sm text-white/58">{producer.headline || `@${producer.username}`}</p>
    </Link>
  );
}

export default function ProducerProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlay, canPlay } = usePlayer();
  const userId = Number(params.id);
  const [profile, setProfile] = useState<ProducerProfile | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [trackView, setTrackView] = useState<TrackView>("popular");
  const [showAllTop, setShowAllTop] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const requests: [Promise<ProducerProfile>, Promise<Beat[]>, Promise<DashboardSummary>, Promise<FollowItem[]>?] = [
          apiRequest<ProducerProfile>(`/account/producers/by-user/${userId}/`),
          apiRequest<Beat[]>(`/beats/?producer=${userId}`),
          apiRequest<DashboardSummary>(`/analytics/producer/${userId}/dashboard-summary/`),
        ];
        if (token) {
          requests.push(apiRequest<FollowItem[]>("/account/follows/me/", { token }));
        }
        const [profileResult, beatsResult, dashboardResult, followResult] = await Promise.all(requests);
        setProfile(profileResult);
        setBeats(beatsResult);
        setDashboard(dashboardResult);
        setIsFollowing(Boolean(followResult?.some((item) => item.producer === userId)));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load producer profile");
      }
    };
    void run();
  }, [token, userId]);

  const producerName = profile?.producer_name || "Producer";
  const profileInitial = producerName.slice(0, 1).toUpperCase() || "P";
  const profileAvatarUrl = resolveMediaUrl(profile?.avatar_obj);
  const isVerified = Boolean(dashboard?.verified || profile?.verified);
  const profileGenres = profile?.genres ? profile.genres.split(",").map((item) => item.trim()).filter(Boolean) : [];
  const isOwnProfile = user?.id === userId;

  const rankedBeats = useMemo(() => ({
    popular: [...beats].sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0)),
    liked: [...beats].sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0)),
    recent: [...beats].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    }),
  }), [beats]);

  const activeTopList = rankedBeats[trackView];
  const displayedTopList = showAllTop ? activeTopList : activeTopList.slice(0, 5);
  const heroBeat = rankedBeats.popular[0] || rankedBeats.recent[0] || beats[0] || null;

  const featuringProducers = useMemo(() => {
    const seen = new Set<number>();
    const collection: FeaturedProducer[] = [];
    beats.forEach((beat) => {
      (beat.featured_producers ?? []).forEach((producer) => {
        if (!seen.has(producer.producer_id)) {
          seen.add(producer.producer_id);
          collection.push(producer);
        }
      });
    });
    return collection;
  }, [beats]);

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    beats.forEach((beat) => {
      (beat.tag_names ?? []).forEach((tag) => {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      });
      if (beat.mood) counts.set(beat.mood, (counts.get(beat.mood) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => ({
        tag,
        beats: beats.filter((beat) => (beat.tag_names ?? []).includes(tag) || beat.mood === tag).slice(0, 10),
      }))
      .filter((entry) => entry.beats.length > 0);
  }, [beats]);

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2200);
  };

  const sendPlayEvent = async (beatId: number) => {
    if (!token) return;
    try {
      await apiRequest("/analytics/listening/play/", {
        method: "POST",
        token,
        body: { beat_id: beatId, source: "producer-public-profile" },
      });
    } catch {
      // ignore analytics failures in UI flow
    }
  };
  const handleFollowToggle = async () => {
    if (!token) {
      router.push("/auth/login");
      return;
    }
    if (isOwnProfile) {
      return;
    }
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await apiRequest(`/account/follows/producers/${userId}/`, { method: "DELETE", token });
        setIsFollowing(false);
        setDashboard((current) => (current ? { ...current, follower_count: Math.max(0, current.follower_count - 1) } : current));
        notify("Unfollowed producer.");
      } else {
        await apiRequest(`/account/follows/producers/${userId}/`, { method: "POST", token, body: {} });
        setIsFollowing(true);
        setDashboard((current) => (current ? { ...current, follower_count: current.follower_count + 1 } : current));
        notify("Producer followed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update follow status");
    } finally {
      setFollowBusy(false);
    }
  };
  const handlePlay = async (beat: Beat, queue: Beat[]) => {
    const track = buildPlayerTrack(beat, producerName);
    if (!track.audioUrl) {
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
    const trackQueue = queue.map((item) => buildPlayerTrack(item, producerName)).filter((item) => item.audioUrl);
    const queueIndex = trackQueue.findIndex((item) => item.id === track.id);
    await playTrack(track, { queue: trackQueue, startIndex: queueIndex >= 0 ? queueIndex : 0 });
    await sendPlayEvent(beat.id);
  };

  return (
    <div className="pb-28">
      <div className="grid gap-6 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)_290px]">
        <aside className="space-y-4 lg:app-sidebar-sticky 2xl:top-[calc(var(--app-header-height,112px)+1rem)]">
          <section className="theme-surface rounded-[32px] p-5 sm:p-6">
            <div className="flex justify-center">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt={producerName} className="h-32 w-32 rounded-full border border-white/10 object-cover" />
              ) : (
                <div className="theme-avatar flex h-32 w-32 items-center justify-center rounded-full text-4xl font-black">
                  {profileInitial}
                </div>
              )}
            </div>
            <div className="mt-5 text-center">
              <h1 className="spotify-display text-[2.15rem] leading-[0.92] text-white sm:text-[2.6rem]">{producerName}</h1>
              <p className="mt-2 text-sm text-white/62">{profile?.headline || "Producer profile"}</p>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {profileGenres.map((genre) => (
                <span key={genre} className="theme-pill rounded-full px-3 py-1 text-xs">{genre}</span>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="theme-soft rounded-2xl px-3 py-3 text-center">
                <p className="spotify-display text-xl text-white">{formatCompact(dashboard?.plays ?? 0)}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/42">Plays</p>
              </div>
              <div className="theme-soft rounded-2xl px-3 py-3 text-center">
                <p className="spotify-display text-xl text-white">{formatCompact(dashboard?.likes ?? 0)}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/42">Likes</p>
              </div>
              <div className={`rounded-2xl px-3 py-3 text-center ${isVerified ? "bg-emerald-500/12" : "bg-white/[0.03]"}`}>
                <p className="text-sm font-semibold text-white">{isVerified ? "Verified" : "Open"}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/42">Status</p>
              </div>
            </div>
          </section>

          <section className="theme-surface rounded-[28px] p-4 sm:p-5">
            <div className="flex items-center gap-2 text-white">
              {isVerified ? <BadgeCheck className="h-4 w-4 text-emerald-300" strokeWidth={1.8} aria-hidden="true" /> : <ShieldAlert className="h-4 w-4 text-white/45" strokeWidth={1.8} aria-hidden="true" />}
              <p className="text-sm font-medium">About this producer</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/68">{profile?.bio || "No producer bio yet."}</p>
            <div className="mt-4 space-y-2 text-sm text-white/62">
              <p>Followers: {formatCompact(dashboard?.follower_count ?? 0)}</p>
              <p>Sales: {formatCompact(profile?.total_sales ?? 0)}</p>
              <p>{profile?.accepts_custom_singles ? "Custom singles open" : "Custom singles closed"}</p>
              <p>{profile?.accepts_album_projects ? "Album projects open" : "Album projects closed"}</p>
            </div>
          </section>
        </aside>

        <main className="min-w-0 space-y-6">
          <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[#121314]">
            <div
              className="relative p-5 sm:p-6 xl:p-8"
              style={{
                background: heroBeat?.cover_art_obj
                  ? `linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(18,19,20,0.9) 72%), url(${resolveMediaUrl(heroBeat.cover_art_obj)}) center/cover`
                  : "linear-gradient(135deg, #ef3f23 0%, #7c1016 45%, #121314 100%)",
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Producer profile</p>
              <h2 className="spotify-display mt-4 max-w-[720px] text-[2.35rem] leading-[0.92] text-white sm:text-[3.4rem] xl:text-[4.5rem]">{producerName}</h2>
              <p className="mt-3 max-w-[640px] text-sm leading-6 text-white/72">{profile?.headline || "Top beats, recent drops, collaborators, and tag worlds from this producer in one place."}</p>
              <div className="mt-6 flex flex-wrap items-stretch gap-3">
                {heroBeat ? (
                  <button
                    type="button"
                    onClick={() => void handlePlay(heroBeat, activeTopList)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1ed760] px-5 py-3 text-sm font-semibold text-black sm:w-auto"
                  >
                    <Play className="h-4 w-4 fill-current" strokeWidth={1.8} aria-hidden="true" />
                    Play top beat
                  </button>
                ) : null}
                <button type="button" onClick={() => router.push(`/projects?producer=${userId}`)} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#af89ff] px-5 py-3 text-sm font-semibold text-[#140f20] sm:w-auto">
                  Hire producer
                </button>
                {!isOwnProfile ? (
                  <button
                    type="button"
                    onClick={() => void handleFollowToggle()}
                    disabled={followBusy}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition sm:w-auto ${isFollowing ? "border border-white/18 bg-white/[0.06] text-white" : "bg-white text-black"} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {followBusy ? "Updating..." : isFollowing ? "Following" : "Follow"}
                  </button>
                ) : null}
                <button type="button" onClick={() => setShowAllTop((current) => !current)} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-3 text-sm text-white/85 sm:w-auto">
                  {showAllTop ? "Show top 5" : "See all tracks"}
                  <ChevronRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>

          <section className="theme-surface rounded-[30px] p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionHeader title={trackView === "popular" ? "Popular" : trackView === "liked" ? "Top Liked" : "Latest Drops"} action={showAllTop ? "Show less" : activeTopList.length > 5 ? "See more" : undefined} onAction={activeTopList.length > 5 ? () => setShowAllTop((current) => !current) : undefined} />
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "popular", label: "Popular", icon: Flame },
                  { key: "liked", label: "Top liked", icon: Heart },
                  { key: "recent", label: "Latest", icon: Disc3 },
                ].map((option) => {
                  const Icon = option.icon;
                  const active = trackView === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => { setTrackView(option.key as TrackView); setShowAllTop(false); }}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${active ? "bg-white text-black" : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"}`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {displayedTopList.map((beat, index) => {
                const isCurrent = currentTrack?.id === beat.id;
                return (
                  <button
                    key={beat.id}
                    type="button"
                    onClick={() => void handlePlay(beat, activeTopList)}
                    className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[22px] px-3 py-3 text-left transition hover:bg-white/[0.04] sm:flex sm:gap-4"
                  >
                    <span className="w-6 text-sm text-white/40">{index + 1}</span>
                    <div className="h-11 w-11 overflow-hidden rounded-xl bg-white/[0.05]">
                      {beat.cover_art_obj ? <img src={resolveMediaUrl(beat.cover_art_obj)} alt={beat.title} className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`line-clamp-1 text-sm font-semibold ${isCurrent ? "text-[#1ed760]" : "text-white"}`}>{beat.title}</p>
                      <p className="mt-1 text-xs text-white/50">{beat.genre} ? {beat.bpm} BPM ? {beat.key || "Key N/A"}</p>
                    </div>
                    <span className="hidden text-sm text-white/45 md:block">{formatCompact(trackView === "liked" ? beat.like_count ?? 0 : beat.play_count ?? 0)}</span>
                    <span className="col-start-2 justify-self-start rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black sm:col-start-auto sm:justify-self-auto">Rs {beat.base_price}</span>
                  </button>
                );
              })}
              {displayedTopList.length === 0 ? <p className="text-sm text-white/55">No beats uploaded yet.</p> : null}
            </div>
          </section>

          <section className="space-y-6">
            <section className="theme-surface rounded-[30px] p-4 sm:p-6">
              <SectionHeader title="Discography" action={beats.length > 4 ? "Show all" : undefined} onAction={beats.length > 4 ? () => setShowAllTop(true) : undefined} />
              <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
                {rankedBeats.recent.slice(0, 10).map((beat) => <BeatShelfCard key={beat.id} beat={beat} />)}
              </div>
            </section>

            {featuringProducers.length > 0 ? (
              <section className="theme-surface rounded-[30px] p-4 sm:p-6">
                <SectionHeader title={`Featuring ${producerName}`} />
                <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
                  {featuringProducers.map((producer) => <ProducerCard key={producer.producer_id} producer={producer} />)}
                </div>
              </section>
            ) : null}

            {topTags.map((entry) => (
              <section key={entry.tag} className="theme-surface rounded-[30px] p-4 sm:p-6">
                <SectionHeader title={`${entry.tag} beats`} />
                <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
                  {entry.beats.map((beat) => <BeatShelfCard key={beat.id} beat={beat} />)}
                </div>
              </section>
            ))}
          </section>
        </main>

        <aside className="space-y-4 2xl:app-sidebar-sticky">
          <section className="theme-surface rounded-[28px] p-4 sm:p-5">
            <p className="text-sm font-semibold text-white">Beat list</p>
            <p className="mt-1 text-xs text-white/46">Top 5 in the current filter, with a quick play action.</p>
            <div className="mt-4 space-y-2">
              {activeTopList.slice(0, 5).map((beat) => {
                const isCurrent = currentTrack?.id === beat.id;
                return (
                  <button key={beat.id} type="button" onClick={() => void handlePlay(beat, activeTopList)} className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-3 text-left transition hover:bg-white/[0.08]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black">
                      <Play className="h-4 w-4 fill-current" strokeWidth={1.8} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`line-clamp-1 text-sm font-semibold ${isCurrent && isPlaying ? "text-[#1ed760]" : "text-white"}`}>{beat.title}</p>
                      <p className="mt-1 text-xs text-white/45">{formatCompact(beat.play_count ?? 0)} plays</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {heroBeat ? (
            <section className="theme-surface rounded-[28px] p-4 sm:p-5">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                Featured beat
              </p>
              <div className="mt-4 overflow-hidden rounded-[24px] bg-white/[0.04]">
                {heroBeat.cover_art_obj ? <img src={resolveMediaUrl(heroBeat.cover_art_obj)} alt={heroBeat.title} className="aspect-square w-full object-cover" /> : <div className="aspect-square w-full bg-[radial-gradient(circle_at_top,_rgba(255,95,31,0.42),_rgba(19,20,23,0.95)_62%)]" />}
              </div>
              <p className="mt-4 text-lg font-semibold text-white">{heroBeat.title}</p>
              <p className="mt-1 text-sm text-white/58">{heroBeat.genre} ? {heroBeat.bpm} BPM</p>
            </section>
          ) : null}
        </aside>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      {message ? <div className="fixed right-6 top-24 z-[150] rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">{message}</div> : null}
    </div>
  );
}
