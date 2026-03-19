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

type Beat = SavedBeatEntry & {
  play_count?: number;
  like_count?: number;
  created_at?: string;
  preview_audio_obj?: string | null;
  audio_file_obj?: string | null;
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

type ListeningHistoryItem = {
  id: number;
  beat: Beat;
  play_count: number;
  last_played_at: string;
};

type PrivateTab = "beats" | "playlists" | "history";
type TrackView = "recent" | "mostPlayed" | "topLiked";

function formatCompact(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return String(value);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ProducerPrivateProfilePage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlay, canPlay } = usePlayer();
  const library = useBeatLibrary(user?.id);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<ProducerProfile | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [trust, setTrust] = useState<TrustSummary | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [history, setHistory] = useState<ListeningHistoryItem[]>([]);
  const [tab, setTab] = useState<PrivateTab>("beats");
  const [trackView, setTrackView] = useState<TrackView>("recent");
  const [profileName, setProfileName] = useState("");
  const [profileHeadline, setProfileHeadline] = useState("");
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
        const [profileResult, beatsResult, trustResult, dashboardResult, historyResult] = await Promise.all([
          apiRequest<ProducerProfile>("/account/producer-profile/", { token }),
          apiRequest<Beat[]>(`/beats/?producer=${user.id}`),
          apiRequest<TrustSummary>(`/account/producer-trust/${user.id}/`),
          apiRequest<DashboardSummary>(`/analytics/producer/${user.id}/dashboard-summary/`),
          apiRequest<ListeningHistoryItem[]>("/analytics/listening/recent/", { token }),
        ]);
        setProfile(profileResult);
        setProfileName(profileResult.producer_name || "");
        setProfileHeadline(profileResult.headline || "");
        setSelectedAvatar(null);
        setAvatarPreview(resolveMediaUrl(profileResult.avatar_obj));
        setBeats(beatsResult);
        setTrust(trustResult);
        setDashboard(dashboardResult);
        setHistory(historyResult);
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

  const refreshHistory = async () => {
    if (!token) {
      return;
    }
    try {
      const result = await apiRequest<ListeningHistoryItem[]>("/analytics/listening/recent/", { token });
      setHistory(result);
    } catch {
      // ignore refresh errors inside playback interactions
    }
  };

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
      form.append("headline", profileHeadline.trim());
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
      setProfileHeadline(updatedProfile.headline || "");
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
    });
    try {
      await apiRequest("/analytics/listening/play/", {
        method: "POST",
        token,
        body: { beat_id: beat.id, source },
      });
      await refreshHistory();
    } catch {
      // ignore analytics errors in playback flow
    }
  };

  const renderBeatTab = () => (
    <section className="space-y-3">
      {sortedBeats.map((beat) => {
        const isCurrent = currentTrack?.id === beat.id;
        return (
          <BeatListRow
            key={beat.id}
            beat={beat}
            detailHref={`/beats/${beat.id}`}
            artistHref={`/producers/${beat.producer}`}
            isCurrent={isCurrent}
            isPlaying={isCurrent && isPlaying}
            onPlay={() => void handlePlay(beat, "producer-private-profile")}
            actionLabel={`Open Track - Rs ${beat.base_price}`}
            actionTone="neutral"
            onAction={() => router.push(`/beats/${beat.id}`)}
            message={notify}
          />
        );
      })}
      {sortedBeats.length === 0 ? <p className="text-sm text-white/55">No beats uploaded yet.</p> : null}
    </section>
  );

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
                library.removeFromListenLater(beat.id);
                notify("Removed from Listen later.");
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
                    library.removeBeatFromPlaylist(playlist.id, beat.id);
                    notify(`Removed from ${playlist.name}.`);
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
    return <div className="rounded-[28px] border border-white/10 bg-[#171a22] p-6 text-sm text-white/70">Producer mode is required to use this page.</div>;
  }

  const avatarImageUrl = avatarPreview || resolveMediaUrl(profile?.avatar_obj);
  const profileDisplayName = profile?.producer_name || user.username;
  const profileInitial = profileDisplayName.slice(0, 1).toUpperCase() || "P";

  return (
    <>
      {isEditModalOpen ? (
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-[#06070c]/78 px-4 py-8 backdrop-blur-sm">
          <section className="w-full max-w-2xl rounded-[30px] border border-white/10 bg-[#1c1f29] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.4)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">Profile editor</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Edit profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/72 hover:bg-white/[0.06]"
                aria-label="Close profile editor"
              >
                <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block text-sm text-white/72">
                <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-white/42">Producer name</span>
                <input
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  placeholder="Your producer name"
                  className="h-11 w-full rounded-2xl border border-white/10 bg-[#11131a] px-4 text-sm text-white outline-none placeholder:text-white/28"
                />
              </label>
              <label className="block text-sm text-white/72">
                <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-white/42">Headline</span>
                <input
                  value={profileHeadline}
                  onChange={(event) => setProfileHeadline(event.target.value)}
                  placeholder="Album-ready producer"
                  className="h-11 w-full rounded-2xl border border-white/10 bg-[#11131a] px-4 text-sm text-white outline-none placeholder:text-white/28"
                />
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-3 text-sm text-white/74 hover:bg-white/[0.04]"
              >
                {selectedAvatar ? `Selected image: ${selectedAvatar.name}` : "Choose profile photo"}
              </button>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-full border border-white/12 bg-white/[0.03] px-5 py-2.5 text-sm text-white/78 hover:bg-white/[0.06]"
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

      <div className="relative pb-20 lg:pl-[365px]">
        <aside className="lg:fixed lg:top-36 lg:left-[max(1.5rem,calc((100vw-1200px)/2))] lg:w-[340px]">
          <section className="rounded-[30px] border border-white/10 bg-[#1c1f29] px-5 py-4 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
            <div className="flex justify-center">
              <div className="relative">
                {avatarImageUrl ? (
                  <img src={avatarImageUrl} alt={profileDisplayName} className="h-32 w-32 rounded-full border border-white/10 object-cover" />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-[#2a3042] via-[#181b24] to-[#0c0f16] text-4xl font-black text-white/88">
                    {profileInitial}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#11131d] text-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                >
                  <Camera className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </div>
            </div>

            <div className="mt-4 text-center">
              <h2 className="text-[2rem] font-semibold leading-none text-white">{profileDisplayName}</h2>
              <p className="mt-2 text-sm text-[#b39bff]">{profile?.headline || "Private producer view"}</p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
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
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-center">
                {dashboard?.verified || profile?.verified || trust?.verified ? <BadgeCheck className="mx-auto h-4 w-4 text-[#9ee8dc]" strokeWidth={1.8} aria-hidden="true" /> : <ShieldAlert className="mx-auto h-4 w-4 text-[#f4c784]" strokeWidth={1.8} aria-hidden="true" />}
                <p className="mt-1.5 text-sm font-semibold text-white">{dashboard?.verified || profile?.verified || trust?.verified ? "Verified" : "Not verified"}</p>
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Status</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/42">Genre</p>
              <p className="mt-1.5 text-base text-white/82">{profile?.genres || "Genre not set"}</p>
            </div>

            <button type="button" onClick={() => router.push(`/producers/${user.id}`)} className="mt-4 w-full rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white/80 hover:bg-white/[0.06]">
              Open public profile
            </button>
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

        <section className="space-y-5 lg:pt-[18.5rem]">
        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[#1c1f29] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.22)] lg:fixed lg:top-36 lg:left-[calc(max(1.5rem,calc((100vw-1200px)/2))+365px)] lg:right-[max(1.5rem,calc((100vw-1200px)/2))] lg:z-30 lg:bg-[#1c1f29]/98 lg:backdrop-blur">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "beats", label: "Beats" },
              { key: "playlists", label: "Playlists" },
              { key: "history", label: "History" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setTab(option.key as PrivateTab)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  tab === option.key
                    ? "border-[#8b4dff] bg-[#8b4dff] text-white"
                    : "border-white/10 bg-white/[0.03] text-white/68 hover:bg-white/[0.06]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {tab === "beats" ? (
            <div className="mt-3 border-t border-white/8 pt-3">
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
          ) : null}
        </section>

        <div className="relative z-0">
          {tab === "beats" ? renderBeatTab() : null}
          {tab === "playlists" ? renderPlaylistsTab() : null}
          {tab === "history" ? renderHistoryTab() : null}
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {message ? <div className="fixed right-6 top-24 z-[150] rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">{message}</div> : null}
      </section>
    </div>
    </>
  );
}
