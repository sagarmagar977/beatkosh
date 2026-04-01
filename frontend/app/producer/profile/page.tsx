"use client";

import { ArrowUpRight, BadgeCheck, Camera, Heart, Music4, Package, Pencil, PencilLine, Play, ShieldAlert, Trash2, Users, WalletCards, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { useTheme } from "@/app/providers";
import { BeatListRow } from "@/components/beat-list-row";
import { usePlayer } from "@/context/player-context";
import { apiCachedRequest, apiRequest, invalidateApiCache, resolveMediaUrl } from "@/lib/api";
import { SavedBeatEntry, useBeatLibrary } from "@/lib/beat-library";

type ProducerProfile = {
  producer_name: string;
  avatar_obj?: string | null;
  headline?: string;
  bio: string;
  genres: string;
  verified: boolean;
};

type FeaturedProducer = {
  producer_id: number;
  username: string;
  producer_name: string;
  headline?: string | null;
  avatar_obj?: string | null;
};

type Beat = SavedBeatEntry & {
  play_count?: number;
  like_count?: number;
  created_at?: string;
  preview_audio_obj?: string | null;
  audio_file_obj?: string | null;
  featured_producers?: FeaturedProducer[];
};

type TrustSummary = {
  trust_score: number;
  profile_completion: number;
  verified?: boolean;
};

type RangeKey = "7d" | "30d" | "90d";

type DashboardSeriesPoint = {
  label: string;
  plays?: number;
  sales?: number;
  revenue?: number;
};

type TopSellingBeat = {
  beat: Beat;
  sales_count: number;
  revenue: number | string;
};

type DashboardSummary = {
  follower_count: number;
  verified: boolean;
  plays: number;
  likes: number;
  purchases: number;
  conversion_rate: number;
  skip_events: number;
  activity_drop_count: number;
  hiring_inquiry_count: number;
  selected_range: {
    key: RangeKey;
    days: number;
    start: string;
    end: string;
  };
  performance_series: DashboardSeriesPoint[];
  revenue_series: DashboardSeriesPoint[];
  top_beats: TopSellingBeat[];
};

type BeatMetadataOptions = {
  genres: string[];
};

type ListeningHistoryItem = {
  id: number;
  beat: Beat;
  play_count: number;
  last_played_at: string;
};

type BeatDraft = {
  id: number;
  title: string;
  base_price: string;
  commercial_mode: string;
  status: "draft" | "published";
  current_step: number;
  updated_at?: string;
  created_at?: string;
};

type SoundKitDraft = {
  id: number;
  title: string;
  base_price: string;
  kit_type: string;
  status: "draft" | "published";
  current_step: number;
  updated_at?: string;
  created_at?: string;
};

type PrivateTab = "beats" | "playlists" | "history" | "analytics" | "drafts";
type TrackView = "recent" | "mostPlayed" | "topLiked";
const PRIVATE_TABS: PrivateTab[] = ["beats", "playlists", "history", "analytics", "drafts"];
const TRACK_VIEWS: TrackView[] = ["recent", "mostPlayed", "topLiked"];
const RANGE_KEYS: RangeKey[] = ["7d", "30d", "90d"];

function isPrivateTab(value: string | null): value is PrivateTab {
  return Boolean(value && PRIVATE_TABS.includes(value as PrivateTab));
}

function isTrackView(value: string | null): value is TrackView {
  return Boolean(value && TRACK_VIEWS.includes(value as TrackView));
}

function isRangeKey(value: string | null): value is RangeKey {
  return Boolean(value && RANGE_KEYS.includes(value as RangeKey));
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

function formatCompact(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return String(value);
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function buildChartPoints(values: number[], width: number, height: number) {
  if (values.length === 0) return [];
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  return values.map((value, index) => ({
    x: values.length === 1 ? width / 2 : (index / (values.length - 1)) * width,
    y: height - ((value - min) / range) * height,
    value,
    index,
  }));
}

function normalizePoints(values: number[], width: number, height: number) {
  return buildChartPoints(values, width, height)
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

function formatReleaseYear(raw?: string) {
  if (!raw) return "New release";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "New release";
  return parsed.getFullYear().toString();
}

function formatDate(raw?: string) {
  if (!raw) return "-";
  const value = new Date(raw);
  return Number.isNaN(value.getTime())
    ? raw
    : value.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ProducerPrivateProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const { currentTrack, isPlaying, playTrack, togglePlay, canPlay } = usePlayer();
  const library = useBeatLibrary(user?.id, token);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<ProducerProfile | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [trust, setTrust] = useState<TrustSummary | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [history, setHistory] = useState<ListeningHistoryItem[]>([]);
  const [beatDrafts, setBeatDrafts] = useState<BeatDraft[]>([]);
  const [kitDrafts, setKitDrafts] = useState<SoundKitDraft[]>([]);
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [genreOptions, setGenreOptions] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [draftBusyId, setDraftBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [hasLoadedAnalytics, setHasLoadedAnalytics] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [hasLoadedDrafts, setHasLoadedDrafts] = useState(false);
  const tabParam = searchParams.get("tab");
  const rangeParam = searchParams.get("range");
  const viewParam = searchParams.get("view");
  const tab: PrivateTab = isPrivateTab(tabParam) ? tabParam : "beats";
  const selectedRange: RangeKey = isRangeKey(rangeParam) ? rangeParam : "30d";
  const trackView: TrackView = isTrackView(viewParam) ? viewParam : "recent";

  const buildProfileUrl = useCallback((updates: Partial<{ tab: PrivateTab; range: RangeKey | null; view: TrackView | null }>) => {
    const params = new URLSearchParams(searchParams.toString());
    const nextTab = updates.tab ?? tab;
    const nextRange = updates.range === undefined ? selectedRange : updates.range;
    const nextView = updates.view === undefined ? trackView : updates.view;

    params.set("tab", nextTab);

    if (nextTab === "analytics" && nextRange) {
      params.set("range", nextRange);
    } else {
      params.delete("range");
    }

    if (nextTab === "beats" && nextView) {
      params.set("view", nextView);
    } else {
      params.delete("view");
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams, selectedRange, tab, trackView]);

  useEffect(() => {
    const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const canonicalUrl = buildProfileUrl({});
    if (canonicalUrl !== currentUrl) {
      router.replace(canonicalUrl, { scroll: false });
    }
  }, [buildProfileUrl, pathname, router, searchParams]);

  const navigateProfileState = (updates: Partial<{ tab: PrivateTab; range: RangeKey | null; view: TrackView | null }>, historyMode: "push" | "replace" = "push") => {
    const href = buildProfileUrl(updates);
    if (historyMode === "replace") {
      router.replace(href, { scroll: false });
      return;
    }
    router.push(href, { scroll: false });
  };

  useEffect(() => {
    if (!token || !user?.is_producer) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      setInitialLoading(true);
      try {
        const [profileResult, beatsResult, trustResult, metadataOptions] = await Promise.all([
          apiCachedRequest<ProducerProfile>("/account/producer-profile/", { token }, { ttlMs: 30_000, scope: "session" }),
          apiCachedRequest<Beat[]>(`/beats/?producer=${user.id}`, {}, { ttlMs: 60_000, scope: "public" }),
          apiCachedRequest<TrustSummary>(`/account/producer-trust/${user.id}/`, {}, { ttlMs: 60_000, scope: "public" }),
          apiCachedRequest<BeatMetadataOptions>("/beats/metadata-options/", {}, { ttlMs: 5 * 60_000, scope: "public" }),
        ]);
        if (cancelled) {
          return;
        }
        setProfile(profileResult);
        setProfileName(profileResult.producer_name || "");
        setProfileBio(profileResult.bio || "");
        setSelectedGenres(
          profileResult.genres
            ? profileResult.genres.split(",").map((item) => item.trim()).filter(Boolean)
            : [],
        );
        setSelectedAvatar(null);
        setAvatarPreview(resolveMediaUrl(profileResult.avatar_obj));
        setBeats(beatsResult);
        setTrust(trustResult);
        setGenreOptions(metadataOptions.genres);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load your producer profile");
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, user]);

  useEffect(() => {
    if (!token || !user?.is_producer || initialLoading) {
      return;
    }

    const shouldLoad = tab === "analytics" || !hasLoadedAnalytics;
    if (!shouldLoad) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      setAnalyticsLoading(true);
      try {
        const dashboardResult = await apiCachedRequest<DashboardSummary>(
          `/analytics/producer/${user.id}/dashboard-summary/?range=${selectedRange}`,
          { token },
          { ttlMs: 60_000, scope: "session" },
        );
        if (cancelled) {
          return;
        }
        setDashboard(dashboardResult);
        setHasLoadedAnalytics(true);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load analytics");
        }
      } finally {
        if (!cancelled) {
          setAnalyticsLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [hasLoadedAnalytics, initialLoading, selectedRange, tab, token, user]);

  useEffect(() => {
    if (!token || tab !== "history" || hasLoadedHistory) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      setHistoryLoading(true);
      try {
        const historyResult = await apiCachedRequest<ListeningHistoryItem[]>(
          "/analytics/listening/recent/",
          { token },
          { ttlMs: 20_000, scope: "session" },
        );
        if (cancelled) {
          return;
        }
        setHistory(historyResult);
        setHasLoadedHistory(true);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load listening history");
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [hasLoadedHistory, tab, token]);

  useEffect(() => {
    if (!token || tab !== "drafts" || hasLoadedDrafts) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      setDraftsLoading(true);
      try {
        const [beatDraftResults, kitDraftResults] = await Promise.all([
          apiCachedRequest<BeatDraft[]>("/beats/upload-drafts/", { token }, { ttlMs: 20_000, scope: "session" }),
          apiCachedRequest<SoundKitDraft[]>("/soundkits/upload-drafts/", { token }, { ttlMs: 20_000, scope: "session" }),
        ]);
        if (cancelled) {
          return;
        }
        setBeatDrafts(beatDraftResults.filter((item) => item.status === "draft"));
        setKitDrafts(kitDraftResults.filter((item) => item.status === "draft"));
        setHasLoadedDrafts(true);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load drafts");
        }
      } finally {
        if (!cancelled) {
          setDraftsLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [hasLoadedDrafts, tab, token]);

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2200);
  };

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

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setSelectedAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleProfileSave = async () => {
    if (!token) {
      router.push("/auth/login");
      return false;
    }
    setSavingProfile(true);
    try {
      const form = new FormData();
      form.append("producer_name", profileName.trim());
      form.append("bio", profileBio.trim());
      form.append("genres", selectedGenres.join(", "));
      if (selectedAvatar) {
        form.append("avatar_upload", selectedAvatar);
      }
      const updatedProfile = await apiRequest<ProducerProfile>("/account/producer-profile/", {
        method: "PATCH",
        token,
        body: form,
        isFormData: true,
      });
      invalidateApiCache("/account/producer-profile/");
      invalidateApiCache(`/account/producers/by-user/${user.id}/`);
      setProfile(updatedProfile);
      setProfileName(updatedProfile.producer_name || "");
      setProfileBio(updatedProfile.bio || "");
      setSelectedGenres(
        updatedProfile.genres
          ? updatedProfile.genres.split(",").map((item) => item.trim()).filter(Boolean)
          : [],
      );
      setSelectedAvatar(null);
      setAvatarPreview(resolveMediaUrl(updatedProfile.avatar_obj));
      notify("Profile updated.");
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update profile");
      return false;
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePlay = async (beat: Beat, source: string) => {
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
      artist: beat.producer_username,
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
      source,
    });
  };

  const featuredProducers = useMemo(() => {
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
      (beat.tag_names ?? []).forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
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

  const analyticsPlaySeries = dashboard?.performance_series.map((point) => point.plays ?? 0) ?? [];
  const analyticsSalesSeries = dashboard?.performance_series.map((point) => point.sales ?? 0) ?? [];
  const analyticsRevenueSeries = dashboard?.revenue_series.map((point) => point.revenue ?? 0) ?? [];
  const analyticsLabels = dashboard?.performance_series.map((point) => point.label) ?? [];
  const playDots = buildChartPoints(analyticsPlaySeries, 100, 60);
  const salesDots = buildChartPoints(analyticsSalesSeries, 100, 60);
  const playsLine = normalizePoints(analyticsPlaySeries, 100, 60);
  const salesLine = normalizePoints(analyticsSalesSeries, 100, 60);
  const revenueTotal = analyticsRevenueSeries.reduce((sum, value) => sum + value, 0);
  const topSellingBeats = dashboard?.top_beats ?? [];
  const currentRangeLabel = dashboard?.selected_range
    ? `${dashboard.selected_range.start} to ${dashboard.selected_range.end}`
    : "Selected range";
  const bestPerformer = useMemo(() => {
    return [...beats].sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0))[0] ?? null;
  }, [beats]);
  const totalDrafts = beatDrafts.length + kitDrafts.length;

  const handleDeleteBeatDraft = async (draftId: number) => {
    if (!token || !window.confirm("Delete this beat draft?")) return;
    setDraftBusyId(`beat-${draftId}`);
    try {
      await apiRequest(`/beats/upload-drafts/${draftId}/`, { method: "DELETE", token });
      invalidateApiCache("/beats/upload-drafts/");
      setBeatDrafts((current) => current.filter((item) => item.id !== draftId));
      notify("Beat draft deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete beat draft");
    } finally {
      setDraftBusyId(null);
    }
  };

  const handleDeleteKitDraft = async (draftId: number) => {
    if (!token || !window.confirm("Delete this sound-kit draft?")) return;
    setDraftBusyId(`kit-${draftId}`);
    try {
      await apiRequest(`/soundkits/upload-drafts/${draftId}/`, { method: "DELETE", token });
      invalidateApiCache("/soundkits/upload-drafts/");
      setKitDrafts((current) => current.filter((item) => item.id !== draftId));
      notify("Sound-kit draft deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete sound-kit draft");
    } finally {
      setDraftBusyId(null);
    }
  };

  const renderBeatTab = () => {
    const heroBeat = sortedBeats[0] || beats[0] || null;

    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <section className="producer-space-hero overflow-hidden rounded-[34px]">
            <div
              className="relative p-6 sm:p-8"
            >
              {heroBeat?.cover_art_obj ? (
                <div
                  className="producer-space-hero-media"
                  style={{ backgroundImage: `url(${resolveMediaUrl(heroBeat.cover_art_obj)})` }}
                  aria-hidden="true"
                />
              ) : (
                <div
                  className="producer-space-hero-media"
                  style={{ backgroundImage: "linear-gradient(135deg, #ef3f23 0%, #7c1016 45%, #121314 100%)" }}
                  aria-hidden="true"
                />
              )}
              <div className="producer-space-hero-overlay" aria-hidden="true" />
              <div className="relative z-[1]">
                <p className="producer-space-hero-kicker text-xs font-semibold uppercase tracking-[0.24em]">Your producer space</p>
                <h2 className="producer-space-hero-title spotify-display mt-4 max-w-[720px] text-[3rem] leading-[0.9] sm:text-[4.2rem]">{profileDisplayName}</h2>
                <p className="producer-space-hero-copy mt-3 max-w-[640px] text-sm leading-6">{profile?.headline || "Manage your top beats, recent drops, playlists, and listening worlds from one profile hub."}</p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                {heroBeat ? (
                  <button
                    type="button"
                    onClick={() => void handlePlay(heroBeat, "producer-private-hero")}
                    className="inline-flex items-center gap-2 rounded-full bg-[#1ed760] px-5 py-3 text-sm font-semibold text-black"
                  >
                    <Play className="h-4 w-4 fill-current" strokeWidth={1.8} aria-hidden="true" />
                    Play top beat
                  </button>
                ) : null}
                <button type="button" onClick={() => router.push("/producer/upload-wizard")} className="producer-space-hero-secondary inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm">
                  Upload new beat
                </button>
                </div>
              </div>
            </div>
          </section>

          <section className="theme-surface rounded-[30px] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionHeader title={trackView === "recent" ? "Latest Drops" : trackView === "mostPlayed" ? "Popular" : "Top Liked"} />
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "recent", label: "Latest" },
                  { key: "mostPlayed", label: "Popular" },
                  { key: "topLiked", label: "Top liked" },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => navigateProfileState({ tab: "beats", view: option.key as TrackView }, "replace")}
                    className={`rounded-full px-4 py-2 text-sm transition ${trackView === option.key ? "bg-white text-black" : "producer-soft-card text-white/70 hover:bg-white/[0.08]"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {sortedBeats.slice(0, 5).map((beat, index) => {
                const isCurrent = currentTrack?.id === beat.id;
                return (
                  <button
                    key={beat.id}
                    type="button"
                    onClick={() => void handlePlay(beat, "producer-private-profile")}
                    className="producer-soft-card flex w-full items-center gap-4 rounded-[22px] px-3 py-3 text-left transition hover:bg-white/[0.04]"
                  >
                    <span className="w-6 text-sm text-white/40">{index + 1}</span>
                    <div className="h-11 w-11 overflow-hidden rounded-xl bg-white/[0.05]">
                      {beat.cover_art_obj ? <img src={resolveMediaUrl(beat.cover_art_obj)} alt={beat.title} className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`line-clamp-1 text-sm font-semibold ${isCurrent ? "text-[#1ed760]" : "text-white"}`}>{beat.title}</p>
                      <p className="mt-1 text-xs text-white/50">{beat.genre} ? {beat.bpm} BPM ? {beat.key || "Key N/A"}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black">Rs {beat.base_price}</span>
                  </button>
                );
              })}
              {sortedBeats.length === 0 ? <p className="text-sm text-white/55">No beats uploaded yet.</p> : null}
            </div>
          </section>

          <section className="theme-surface rounded-[30px] p-6">
            <SectionHeader title="Discography" />
            <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
              {beats.slice(0, 10).map((beat) => (
                <button key={beat.id} type="button" onClick={() => router.push(`/beats/${beat.id}`)} className="group w-[180px] flex-none text-left">
                  <div className="producer-soft-card overflow-hidden rounded-[22px]">
                    {beat.cover_art_obj ? <img src={resolveMediaUrl(beat.cover_art_obj)} alt={beat.title} className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.04]" /> : <div className="aspect-square w-full bg-[radial-gradient(circle_at_top,_rgba(255,95,31,0.42),_rgba(19,20,23,0.95)_62%)]" />}
                  </div>
                  <p className="mt-3 line-clamp-1 text-sm font-semibold text-white">{beat.title}</p>
                  <p className="mt-1 text-xs text-white/55">{formatReleaseYear(beat.created_at)} ? {beat.genre}</p>
                </button>
              ))}
            </div>
          </section>

          {featuredProducers.length > 0 ? (
            <section className="theme-surface rounded-[30px] p-6">
              <SectionHeader title="Featuring Other Producers" />
              <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
                {featuredProducers.map((producer) => (
                  <button key={producer.producer_id} type="button" onClick={() => router.push(`/producers/${producer.producer_id}`)} className="producer-soft-card w-[210px] flex-none rounded-[26px] p-4 text-left transition hover:bg-white/[0.07]">
                    {producer.avatar_obj ? <img src={resolveMediaUrl(producer.avatar_obj)} alt={producer.producer_name} className="h-20 w-20 rounded-full object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,#24423a,#0d1115)] text-2xl font-black text-white/85">{producer.producer_name.slice(0, 1).toUpperCase()}</div>}
                    <p className="mt-4 line-clamp-1 text-base font-semibold text-white">{producer.producer_name}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-white/58">{producer.headline || `@${producer.username}`}</p>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {topTags.map((entry) => (
            <section key={entry.tag} className="theme-surface rounded-[30px] p-6">
              <SectionHeader title={`${entry.tag} beats`} />
              <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
                {entry.beats.map((beat) => (
                  <button key={beat.id} type="button" onClick={() => router.push(`/beats/${beat.id}`)} className="group w-[180px] flex-none text-left">
                    <div className="producer-soft-card overflow-hidden rounded-[22px]">
                      {beat.cover_art_obj ? <img src={resolveMediaUrl(beat.cover_art_obj)} alt={beat.title} className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.04]" /> : <div className="aspect-square w-full bg-[radial-gradient(circle_at_top,_rgba(255,95,31,0.42),_rgba(19,20,23,0.95)_62%)]" />}
                    </div>
                    <p className="mt-3 line-clamp-1 text-sm font-semibold text-white">{beat.title}</p>
                    <p className="mt-1 text-xs text-white/55">{beat.genre} ? {beat.bpm} BPM</p>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-4 xl:app-sidebar-sticky">
          <section className="theme-surface rounded-[28px] p-5">
            <p className="text-sm font-semibold text-white">Quick beat list</p>
            <p className="mt-1 text-xs text-white/46">Your current top 5 for this filter.</p>
            <div className="mt-4 space-y-2">
              {sortedBeats.slice(0, 5).map((beat) => {
                const isCurrent = currentTrack?.id === beat.id;
                return (
                  <button key={beat.id} type="button" onClick={() => void handlePlay(beat, "producer-private-sidebar")} className="producer-soft-card flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.08]">
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

          <section className="theme-surface rounded-[28px] p-5">
            <p className="text-sm font-semibold text-white">Collection tabs</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { key: "beats", label: "Beats" },
                { key: "playlists", label: "Playlists" },
                { key: "history", label: "History" },
                { key: "drafts", label: "Drafts" },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => navigateProfileState({ tab: option.key as PrivateTab })}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${tab === option.key ? "border-[#8b4dff] bg-[#8b4dff] text-white" : "theme-soft theme-text-muted"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    );
  };

  const renderPlaylistsTab = () => (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="producer-dark-panel rounded-[26px] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/42">System playlist</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Listen later</h3>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">{library.listenLater.length} beats</span>
        </div>
        <div className="mt-4 space-y-3">
          {library.listenLater.map((beat) => (
            <BeatListRow
              key={`listen-later-${beat.id}`}
              beat={beat}
              detailHref={`/beats/${beat.id}`}
              artistHref={`/producers/${beat.producer}`}
              onPlay={() => {
                const liveBeat = beats.find((item) => item.id === beat.id);
                if (liveBeat) {
                  void handlePlay(liveBeat, "listen-later-playlist");
                } else {
                  router.push(`/beats/${beat.id}`);
                }
              }}
              actionLabel="Remove"
              actionTone="neutral"
              onAction={() => {
                void library.removeFromListenLater(beat.id).then(() => notify("Removed from Listen later."));
              }}
              message={notify}
            />
          ))}
          {library.listenLater.length === 0 ? <p className="text-sm text-white/55">No beats saved to Listen later yet.</p> : null}
        </div>
      </div>

      <div className="space-y-4">
        {library.playlists.map((playlist) => (
          <section key={playlist.id} className="producer-dark-panel rounded-[26px] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">Custom playlist</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{playlist.name}</h3>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">{playlist.beats.length} beats</span>
            </div>
            <div className="mt-4 space-y-3">
              {playlist.beats.map((beat) => (
                <BeatListRow
                  key={`${playlist.id}-${beat.id}`}
                  beat={beat}
                  detailHref={`/beats/${beat.id}`}
                  artistHref={`/producers/${beat.producer}`}
                  onPlay={() => {
                    const liveBeat = beats.find((item) => item.id === beat.id);
                    if (liveBeat) {
                      void handlePlay(liveBeat, `playlist-${playlist.id}`);
                    } else {
                      router.push(`/beats/${beat.id}`);
                    }
                  }}
                  actionLabel="Remove"
                  actionTone="neutral"
                  onAction={() => {
                    void library.removeBeatFromPlaylist(playlist.id, beat.id).then(() => notify(`Removed from ${playlist.name}.`));
                  }}
                  message={notify}
                />
              ))}
              {playlist.beats.length === 0 ? <p className="text-sm text-white/55">This playlist is empty.</p> : null}
            </div>
          </section>
        ))}
        {library.playlists.length === 0 ? <p className="producer-dark-panel rounded-[26px] p-5 text-sm text-white/55">No custom playlists yet. Use the three-dot menu on any beat to create one.</p> : null}
      </div>
    </section>
  );

  const renderHistoryTab = () => (
    <section className="space-y-3">
      {historyLoading ? <p className="text-sm text-white/55">Loading listening history...</p> : null}
      {history.map((item) => {
        const isCurrent = currentTrack?.id === item.beat.id;
        return (
          <BeatListRow
            key={item.id}
            beat={item.beat}
            detailHref={`/beats/${item.beat.id}`}
            artistHref={`/producers/${item.beat.producer}`}
            isCurrent={isCurrent}
            isPlaying={isCurrent && isPlaying}
            onPlay={() => void handlePlay(item.beat, "producer-history")}
            actionLabel={`Played ${item.play_count}x`}
            actionTone="neutral"
            onAction={() => router.push(`/beats/${item.beat.id}`)}
            message={notify}
          />
        );
      })}
      {!historyLoading && history.length === 0 ? <p className="text-sm text-white/55">No listening history yet.</p> : null}
      {history.length > 0 ? <p className="text-xs text-white/42">Showing the most recent listening history saved for this account.</p> : null}
    </section>
  );

  const renderAnalyticsTab = () => (
    <section className="producer-analytics-hero mt-4 overflow-hidden rounded-[28px] p-5 sm:p-6">
      {analyticsLoading && !dashboard ? (
        <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-8 text-sm text-white/58">
          Loading analytics overview...
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="theme-text-faint text-xs uppercase tracking-[0.24em]">Producer analytics</p>
          <h2 className="spotify-display theme-text-main mt-3 text-[2rem] leading-none sm:text-[2.8rem]">Overview</h2>
          <p className="theme-text-muted mt-3 max-w-2xl text-sm leading-6">
            Plays, sales, audience growth, and conversion for your producer profile.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {([
            { key: "7d", label: "7D" },
            { key: "30d", label: "30D" },
            { key: "90d", label: "90D" },
          ] as { key: RangeKey; label: string }[]).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => navigateProfileState({ tab: "analytics", range: option.key }, "replace")}
              className={`rounded-full px-4 py-2 text-sm transition ${
                selectedRange === option.key
                  ? "producer-analytics-filter producer-analytics-filter-active"
                  : "producer-analytics-filter"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="theme-text-quiet mt-3 text-xs uppercase tracking-[0.18em]">{currentRangeLabel}</div>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        <div className="producer-analytics-card rounded-[22px] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="theme-text-faint text-xs uppercase tracking-[0.18em]">Revenue</p>
            <WalletCards className="h-4 w-4 text-[#b79cff]" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <p className="theme-text-main mt-3 text-2xl font-semibold">Rs {formatCurrency(revenueTotal)}</p>
          <p className="theme-text-muted mt-1 text-sm">{dashboard?.purchases ?? 0} paid beat orders</p>
        </div>
        <div className="producer-analytics-card rounded-[22px] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="theme-text-faint text-xs uppercase tracking-[0.18em]">Followers</p>
            <Users className="h-4 w-4 text-[#9ee8dc]" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <p className="theme-text-main mt-3 text-2xl font-semibold">{formatCompact(dashboard?.follower_count ?? 0)}</p>
          <p className="theme-text-muted mt-1 text-sm">Audience following this producer profile</p>
        </div>
        <div className="producer-analytics-card rounded-[22px] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="theme-text-faint text-xs uppercase tracking-[0.18em]">Conversion</p>
            <ArrowUpRight className="h-4 w-4 text-[#ffb06d]" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <p className="theme-text-main mt-3 text-2xl font-semibold">{dashboard?.conversion_rate?.toFixed(1) ?? "0.0"}%</p>
          <p className="theme-text-muted mt-1 text-sm">{dashboard?.skip_events ?? 0} skip events in this range</p>
        </div>
        <div className="producer-analytics-card rounded-[22px] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="theme-text-faint text-xs uppercase tracking-[0.18em]">Hiring</p>
            <BadgeCheck className="h-4 w-4 text-[#ff9fc4]" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <p className="theme-text-main mt-3 text-2xl font-semibold">{dashboard?.hiring_inquiry_count ?? 0}</p>
          <p className="theme-text-muted mt-1 text-sm">{dashboard?.activity_drop_count ?? 0} activity drops logged</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_280px]">
        <section className="producer-analytics-panel rounded-[24px] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="theme-text-main text-lg font-semibold">Plays and sales trend</p>
              <p className="theme-text-muted mt-1 text-sm">Daily activity across the selected range.</p>
            </div>
            <div className="theme-text-muted flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em]">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#b89dff]" />
                <span>Plays</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full border border-[#ff9fc4] bg-transparent" />
                <span>Sales</span>
              </span>
            </div>
          </div>
          <svg viewBox="0 0 100 60" className="mt-5 h-[220px] w-full">
            {[12, 28, 44].map((line) => (
              <line key={line} x1="0" y1={line} x2="100" y2={line} stroke={theme === "light" ? "rgba(98,73,160,0.18)" : "rgba(255,255,255,0.08)"} strokeWidth="0.35" />
            ))}
            <polyline
              fill="none"
              stroke="#b89dff"
              strokeWidth="0.9"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={playsLine || "0,42 20,34 40,36 60,22 80,18 100,15"}
            />
            {playDots.map((point) => (
              <circle key={`play-${point.index}`} cx={point.x} cy={point.y} r="1.3" fill="#b89dff" />
            ))}
            <polyline
              fill="none"
              stroke="#ff9fc4"
              strokeWidth="0.85"
              strokeDasharray="2.4 1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={salesLine || "0,55 20,52 40,50 60,46 80,43 100,38"}
            />
            {salesDots.map((point) => (
              <circle key={`sale-${point.index}`} cx={point.x} cy={point.y} r="1.35" fill={theme === "light" ? "#ffffff" : "#0f0b17"} stroke="#ff9fc4" strokeWidth="0.7" />
            ))}
          </svg>
          <div className={`theme-text-muted mt-2 grid gap-2 text-[11px] uppercase tracking-[0.16em] ${analyticsLabels.length > 8 ? "grid-cols-4 sm:grid-cols-8" : "grid-cols-3 sm:grid-cols-6"}`}>
            {(analyticsLabels.length ? analyticsLabels : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </section>

        <aside className="producer-analytics-panel rounded-[24px] p-4">
          <p className="theme-text-main text-lg font-semibold">Best sold beats</p>
          <p className="theme-text-muted mt-1 text-sm">Your strongest sellers for this range, plus a quick health snapshot.</p>
          <div className="mt-4 space-y-3">
            {topSellingBeats.length ? (
              topSellingBeats.map((entry, index) => (
                <button
                  key={`${entry.beat.id}-${index}`}
                  type="button"
                  onClick={() => router.push(`/beats/${entry.beat.id}`)}
                  className="producer-analytics-item flex w-full items-center gap-3 rounded-[18px] p-3 text-left transition hover:bg-white/[0.06]"
                >
                  <span className="theme-text-faint w-5 text-xs font-semibold">{index + 1}</span>
                  <div className="h-12 w-12 overflow-hidden rounded-xl bg-white/[0.05]">
                    {entry.beat.cover_art_obj ? (
                      <img src={resolveMediaUrl(entry.beat.cover_art_obj)} alt={entry.beat.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(255,95,31,0.42),_rgba(19,20,23,0.95)_62%)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="theme-text-main line-clamp-1 text-sm font-semibold">{entry.beat.title}</p>
                    <p className="theme-text-muted mt-1 text-xs">{entry.sales_count} sales | Rs {formatCurrency(Number(entry.revenue ?? 0))}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="producer-analytics-item rounded-[18px] border-dashed p-4 text-sm theme-text-muted">
                No sales have been recorded in this range yet.
              </div>
            )}
          </div>
          <div className="mt-5 space-y-3">
            <div className="producer-analytics-item rounded-[18px] p-4">
              <p className="theme-text-faint text-xs uppercase tracking-[0.18em]">Top performer</p>
              <p className="theme-text-main mt-2 text-base font-semibold">{bestPerformer?.title ?? "No beat data yet"}</p>
              <p className="theme-text-muted mt-1 text-sm">{formatCompact(bestPerformer?.play_count ?? 0)} plays</p>
            </div>
            <div className="producer-analytics-item rounded-[18px] p-4">
              <p className="theme-text-faint text-xs uppercase tracking-[0.18em]">Trust</p>
              <p className="theme-text-main mt-2 text-base font-semibold">{trust?.trust_score ?? 0}/100</p>
              <p className="theme-text-muted mt-1 text-sm">{trust?.profile_completion ?? 0}% profile completion</p>
            </div>
            <div className="producer-analytics-item rounded-[18px] p-4">
              <p className="theme-text-faint text-xs uppercase tracking-[0.18em]">Purchase intent</p>
              <p className="theme-text-main mt-2 text-base font-semibold">{dashboard?.purchases ?? 0} purchases</p>
              <p className="theme-text-muted mt-1 text-sm">{dashboard?.plays ?? 0} plays tracked in the selected window</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );

  const renderDraftsTab = () => (
    <section className="producer-drafts-hero mt-4 overflow-hidden rounded-[28px] p-5 sm:p-6">
      {draftsLoading ? (
        <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-8 text-sm text-white/58">
          Loading saved drafts...
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">Upload drafts</p>
          <h2 className="spotify-display mt-3 text-[2rem] leading-none text-white sm:text-[2.8rem]">Saved Uploads</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
            Continue unfinished beat and sound-kit uploads right from your profile workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/producer/upload-wizard?flow=beat&fresh=1")}
          className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/84 transition hover:bg-white/[0.08]"
        >
          New upload
        </button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        <div className="producer-soft-card rounded-[22px] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/42">Total drafts</p>
          <p className="mt-3 text-2xl font-semibold text-white">{totalDrafts}</p>
          <p className="mt-1 text-sm text-white/58">Uploads waiting to be finished</p>
        </div>
        <div className="producer-soft-card rounded-[22px] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.18em] text-white/42">Beat drafts</p>
            <Music4 className="h-4 w-4 text-[#b89dff]" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-white">{beatDrafts.length}</p>
          <p className="mt-1 text-sm text-white/58">Metadata, media, and licensing in progress</p>
        </div>
        <div className="producer-soft-card rounded-[22px] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.18em] text-white/42">Sound-kit drafts</p>
            <Package className="h-4 w-4 text-[#9ee8dc]" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-white">{kitDrafts.length}</p>
          <p className="mt-1 text-sm text-white/58">Archive, preview, and pricing still in progress</p>
        </div>
        <div className="producer-soft-card rounded-[22px] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/42">Next step</p>
          <p className="mt-3 text-lg font-semibold text-white">{beatDrafts[0] || kitDrafts[0] ? "Resume a draft" : "Start a new upload"}</p>
          <p className="mt-1 text-sm text-white/58">{beatDrafts[0] || kitDrafts[0] ? "Open any saved card below and continue where you left off." : "No saved drafts found yet."}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <section className="producer-subpanel rounded-[24px] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-white">Beat drafts</p>
              <p className="mt-1 text-sm text-white/55">Resume unfinished beat uploads from the same card area as analytics.</p>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">{beatDrafts.length}</span>
          </div>
          <div className="mt-4 space-y-3">
            {beatDrafts.length ? beatDrafts.map((item) => (
              <article key={item.id} className="flex flex-wrap items-center gap-3 rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05] text-white/70">
                  <Music4 className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-white">{item.title || `Untitled beat #${item.id}`}</p>
                  <p className="mt-1 text-xs text-white/48">Step {Math.max(item.current_step, 1)} | Rs {item.base_price || "0.00"} | {item.commercial_mode || "Presets"}</p>
                  <p className="mt-1 text-xs text-white/38">Updated {formatDate(item.updated_at || item.created_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/producer/upload-wizard?flow=beat&draft=${item.id}`)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-white/80 transition hover:bg-white/[0.08]"
                  title="Edit draft"
                >
                  <Pencil className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={draftBusyId === `beat-${item.id}`}
                  onClick={() => void handleDeleteBeatDraft(item.id)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-white/80 transition hover:bg-white/[0.08] disabled:opacity-60"
                  title="Delete draft"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </button>
              </article>
            )) : (
              <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">
                No beat drafts saved yet.
              </div>
            )}
          </div>
        </section>

        <section className="producer-subpanel rounded-[24px] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-white">Sound-kit drafts</p>
              <p className="mt-1 text-sm text-white/55">Keep kits beside your producer metrics in the same workspace.</p>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">{kitDrafts.length}</span>
          </div>
          <div className="mt-4 space-y-3">
            {kitDrafts.length ? kitDrafts.map((item) => (
              <article key={item.id} className="flex flex-wrap items-center gap-3 rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05] text-white/70">
                  <Package className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-white">{item.title || `Untitled sound kit #${item.id}`}</p>
                  <p className="mt-1 text-xs text-white/48">Step {Math.max(item.current_step, 1)} | Rs {item.base_price || "0.00"} | {item.kit_type || "Draft"}</p>
                  <p className="mt-1 text-xs text-white/38">Updated {formatDate(item.updated_at || item.created_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/producer/upload-wizard?flow=kit&draft=${item.id}`)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-white/80 transition hover:bg-white/[0.08]"
                  title="Edit draft"
                >
                  <Pencil className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={draftBusyId === `kit-${item.id}`}
                  onClick={() => void handleDeleteKitDraft(item.id)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-white/80 transition hover:bg-white/[0.08] disabled:opacity-60"
                  title="Delete draft"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </button>
              </article>
            )) : (
              <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">
                No sound-kit drafts saved yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );


  if (!user?.is_producer) {
    return <div className="theme-surface rounded-[28px] p-6 text-sm theme-text-muted">Producer mode is required to use this page.</div>;
  }

  const avatarImageUrl = avatarPreview || resolveMediaUrl(profile?.avatar_obj);
  const profileDisplayName = profile?.producer_name || user.username;
  const profileInitial = profileDisplayName.slice(0, 1).toUpperCase() || "P";
  const profileGenres = profile?.genres ? profile.genres.split(",").map((item) => item.trim()).filter(Boolean) : [];

  return (
    <>
      {isEditModalOpen ? (
        <div className="theme-overlay fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto px-4 py-8 backdrop-blur-sm">
          <section className="theme-floating w-full max-w-2xl rounded-[30px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="theme-text-faint text-xs uppercase tracking-[0.18em]">Profile editor</p>
                <h3 className="theme-text-main mt-2 text-2xl font-semibold">Edit profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="theme-soft inline-flex h-10 w-10 items-center justify-center rounded-full theme-text-soft"
                aria-label="Close profile editor"
              >
                <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <label className="theme-text-soft block text-sm">
                <span className="theme-text-faint mb-2 block text-xs uppercase tracking-[0.18em]">Producer name</span>
                <input
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  placeholder="Your producer name"
                  className="theme-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
                />
              </label>
              <label className="theme-text-soft block text-sm">
                <span className="theme-text-faint mb-2 block text-xs uppercase tracking-[0.18em]">Description</span>
                <textarea
                  value={profileBio}
                  onChange={(event) => setProfileBio(event.target.value)}
                  placeholder="Describe your sound, style, and what artists can expect from you."
                  className="theme-input min-h-[120px] w-full rounded-2xl px-4 py-3 text-sm outline-none"
                />
              </label>
              <div className="theme-surface-muted rounded-2xl p-4">
                <span className="theme-text-faint block text-xs uppercase tracking-[0.18em]">Genres</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {genreOptions.map((genre) => {
                    const selected = selectedGenres.includes(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() =>
                          setSelectedGenres((current) =>
                            selected ? current.filter((item) => item !== genre) : [...current, genre],
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs transition ${
                          selected
                            ? "border-[#8b4dff]/80 bg-[#8b4dff]/18 text-white"
                            : "theme-soft theme-text-muted"
                        }`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="theme-soft w-full rounded-2xl border-dashed px-4 py-3 text-sm theme-text-soft"
              >
                {selectedAvatar ? `Selected image: ${selectedAvatar.name}` : "Choose profile photo"}
              </button>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="theme-soft rounded-full px-5 py-2.5 text-sm theme-text-soft"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleProfileSave().then((saved) => {
                      if (saved) {
                        setIsEditModalOpen(false);
                      }
                    });
                  }}
                  disabled={savingProfile}
                  className="rounded-full bg-gradient-to-r from-[#8b28ff] via-[#7b32ff] to-[#5b48ff] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
                >
                  {savingProfile ? "Saving..." : "Save profile changes"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <div className="producer-profile-scope grid gap-6 pb-20 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start">
        <aside className="xl:sticky xl:top-[calc(var(--app-header-height,112px)+1.5rem)]">
          <section className="theme-surface rounded-[30px] px-5 py-4">
            <div className="flex justify-center">
              <div className="relative">
                {avatarImageUrl ? (
                  <img src={avatarImageUrl} alt={profileDisplayName} className="h-32 w-32 rounded-full border object-cover" style={{ borderColor: "var(--line)" }} />
                ) : (
                  <div className="theme-avatar flex h-32 w-32 items-center justify-center rounded-full text-4xl font-black">
                    {profileInitial}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="theme-soft absolute bottom-2 right-2 inline-flex h-10 w-10 items-center justify-center rounded-full theme-text-soft"
                >
                  <Camera className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </div>
            </div>

            <div className="mt-4 text-center">
              <h2 className="spotify-display theme-text-main text-[2.1rem] leading-[0.92] sm:text-[2.5rem]">{profileDisplayName}</h2>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {profileGenres.length > 0 ? (
                  profileGenres.map((genre) => (
                    <span key={genre} className="theme-pill rounded-full px-3 py-1 text-xs">
                      {genre}
                    </span>
                  ))
                ) : (
                  <p className="theme-text-muted text-sm">Genre not set</p>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="theme-soft rounded-2xl px-3 py-2.5 text-center">
                <Play className="mx-auto h-4 w-4 text-[#a288ff]" strokeWidth={1.8} aria-hidden="true" />
                <p className="spotify-display theme-text-main mt-1.5 text-xl">{formatCompact(dashboard?.plays ?? 0)}</p>
                <p className="theme-text-faint text-[11px] uppercase tracking-[0.16em]">Plays</p>
              </div>
              <div className="theme-soft rounded-2xl px-3 py-2.5 text-center">
                <Heart className="mx-auto h-4 w-4 text-[#ff9fc4]" strokeWidth={1.8} aria-hidden="true" />
                <p className="spotify-display theme-text-main mt-1.5 text-xl">{formatCompact(dashboard?.likes ?? 0)}</p>
                <p className="theme-text-faint text-[11px] uppercase tracking-[0.16em]">Likes</p>
              </div>
              <div className="theme-soft rounded-2xl px-3 py-2.5 text-center">
                {dashboard?.verified || profile?.verified || trust?.verified ? <BadgeCheck className="mx-auto h-4 w-4 text-[#9ee8dc]" strokeWidth={1.8} aria-hidden="true" /> : <ShieldAlert className="mx-auto h-4 w-4 text-[#f4c784]" strokeWidth={1.8} aria-hidden="true" />}
                <p className="theme-text-main mt-1.5 text-sm font-bold">{dashboard?.verified || profile?.verified || trust?.verified ? "Verified" : "Not verified"}</p>
                <p className="theme-text-faint text-[11px] uppercase tracking-[0.16em]">Status</p>
              </div>
            </div>

            <div className="theme-soft mt-4 rounded-2xl p-4">
              <p className="theme-text-faint text-xs uppercase tracking-[0.18em]">Bio</p>
              <p className="theme-text-muted mt-1.5 text-sm leading-6">{profile?.bio || "No producer bio yet."}</p>
            </div>

            
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#8b28ff] via-[#7b32ff] to-[#5b48ff] px-4 py-2.5 text-sm font-semibold text-white"
            >
              <PencilLine className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Edit profile
            </button>
          </section>
        </aside>

        <section className="min-w-0 space-y-6">
          <section className="theme-surface rounded-[30px] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3" style={{ borderColor: "var(--line)" }}>
              <div>
                <p className="spotify-kicker theme-text-quiet text-[11px]">Producer profile</p>
                <h1 className="spotify-display theme-text-main mt-1 text-[2rem] sm:text-[2.9rem]">{profileDisplayName}</h1>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/producers/${user.id}`)}
                className="theme-soft rounded-full px-4 py-2 text-sm theme-text-soft"
              >
                Open public profile
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { key: "beats", label: "Beats" },
                { key: "playlists", label: "Playlists" },
                { key: "history", label: "History" },
                { key: "drafts", label: "Drafts" },
                { key: "analytics", label: "Analytics" },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => navigateProfileState({ tab: option.key as PrivateTab })}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${tab === option.key ? "border-[#8b4dff] bg-[#8b4dff] text-white" : "theme-soft theme-text-muted"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {tab === "beats" ? renderBeatTab() : null}
              {tab === "playlists" ? renderPlaylistsTab() : null}
              {tab === "history" ? renderHistoryTab() : null}
              {tab === "drafts" ? renderDraftsTab() : null}
              {tab === "analytics" ? renderAnalyticsTab() : null}
            </div>
          </section>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {message ? <div className="fixed right-6 top-24 z-[150] rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">{message}</div> : null}
        </section>
    </div>
    </>
  );
}
