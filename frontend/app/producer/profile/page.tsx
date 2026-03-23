"use client";

import { BadgeCheck, Camera, Heart, PencilLine, Play, ShieldAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { BeatListRow } from "@/components/beat-list-row";
import { usePlayer } from "@/context/player-context";
import { apiRequest, resolveMediaUrl } from "@/lib/api";
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

type DashboardSummary = {
  follower_count: number;
  verified: boolean;
  plays: number;
  likes: number;
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


type PrivateTab = "beats" | "playlists" | "history";
type TrackView = "recent" | "mostPlayed" | "topLiked";

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

function formatReleaseYear(raw?: string) {
  if (!raw) return "New release";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "New release";
  return parsed.getFullYear().toString();
}

export default function ProducerPrivateProfilePage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlay, canPlay } = usePlayer();
  const library = useBeatLibrary(user?.id, token);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<ProducerProfile | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [trust, setTrust] = useState<TrustSummary | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [history, setHistory] = useState<ListeningHistoryItem[]>([]);
  const [tab, setTab] = useState<PrivateTab>("beats");
  const [trackView, setTrackView] = useState<TrackView>("recent");
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [genreOptions, setGenreOptions] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !user?.is_producer) {
      return;
    }

    const run = async () => {
      try {
        const [profileResult, beatsResult, trustResult, dashboardResult, historyResult, metadataOptions] = await Promise.all([
          apiRequest<ProducerProfile>("/account/producer-profile/", { token }),
          apiRequest<Beat[]>(`/beats/?producer=${user.id}`),
          apiRequest<TrustSummary>(`/account/producer-trust/${user.id}/`),
          apiRequest<DashboardSummary>(`/analytics/producer/${user.id}/dashboard-summary/`),
          apiRequest<ListeningHistoryItem[]>("/analytics/listening/recent/", { token }),
          apiRequest<BeatMetadataOptions>("/beats/metadata-options/"),
        ]);
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
        setDashboard(dashboardResult);
        setHistory(historyResult);
        setGenreOptions(metadataOptions.genres);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load your producer profile");
      }
    };

    void run();
  }, [token, user]);

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

  const renderBeatTab = () => {
    const heroBeat = sortedBeats[0] || beats[0] || null;

    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[#121314]">
            <div
              className="relative p-6 sm:p-8"
              style={{
                background: heroBeat?.cover_art_obj
                  ? `linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(18,19,20,0.9) 72%), url(${resolveMediaUrl(heroBeat.cover_art_obj)}) center/cover`
                  : "linear-gradient(135deg, #ef3f23 0%, #7c1016 45%, #121314 100%)",
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Your producer space</p>
              <h2 className="spotify-display mt-4 max-w-[720px] text-[3rem] leading-[0.9] text-white sm:text-[4.2rem]">{profileDisplayName}</h2>
              <p className="mt-3 max-w-[640px] text-sm leading-6 text-white/72">{profile?.headline || "Manage your top beats, recent drops, playlists, and listening worlds from one profile hub."}</p>
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
                <button type="button" onClick={() => router.push("/producer/upload-wizard")} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-3 text-sm text-white/85">
                  Upload new beat
                </button>
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
                    onClick={() => setTrackView(option.key as TrackView)}
                    className={`rounded-full px-4 py-2 text-sm transition ${trackView === option.key ? "bg-white text-black" : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"}`}
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
                    className="flex w-full items-center gap-4 rounded-[22px] px-3 py-3 text-left transition hover:bg-white/[0.04]"
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
                  <div className="overflow-hidden rounded-[22px] bg-white/[0.04]">
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
                  <button key={producer.producer_id} type="button" onClick={() => router.push(`/producers/${producer.producer_id}`)} className="w-[210px] flex-none rounded-[26px] bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.07]">
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
                    <div className="overflow-hidden rounded-[22px] bg-white/[0.04]">
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
                  <button key={beat.id} type="button" onClick={() => void handlePlay(beat, "producer-private-sidebar")} className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-3 text-left transition hover:bg-white/[0.08]">
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
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setTab(option.key as PrivateTab)}
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
      <div className="rounded-[26px] border border-white/10 bg-[#171a22] p-5">
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
          <section key={playlist.id} className="rounded-[26px] border border-white/10 bg-[#171a22] p-5">
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
        {library.playlists.length === 0 ? <p className="rounded-[26px] border border-white/10 bg-[#171a22] p-5 text-sm text-white/55">No custom playlists yet. Use the three-dot menu on any beat to create one.</p> : null}
      </div>
    </section>
  );

  const renderHistoryTab = () => (
    <section className="space-y-3">
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
      {history.length === 0 ? <p className="text-sm text-white/55">No listening history yet.</p> : null}
      {history.length > 0 ? <p className="text-xs text-white/42">Showing the most recent listening history saved for this account.</p> : null}
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

      <div className="relative pb-20 xl:pl-[365px]">
        <aside className="mb-6 xl:fixed xl:left-[max(1.5rem,calc((100vw-1200px)/2))] xl:top-[calc(var(--app-header-height,112px)+1.5rem)] xl:mb-0 xl:w-[340px]">
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

        <section className="space-y-6">
          <section className="theme-surface rounded-[30px] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3" style={{ borderColor: "var(--line)" }}>
              <div>
                <p className="spotify-kicker theme-text-quiet text-[11px]">Producer studio</p>
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
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setTab(option.key as PrivateTab)}
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
            </div>
          </section>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {message ? <div className="fixed right-6 top-24 z-[150] rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">{message}</div> : null}
        </section>
    </div>
    </>
  );
}
