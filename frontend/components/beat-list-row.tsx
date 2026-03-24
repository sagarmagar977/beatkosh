"use client";

import { Clock3, EllipsisVertical, ListMusic, Pause, Play, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { resolveMediaUrl } from "@/lib/api";
import { SavedBeatEntry, useBeatLibrary } from "@/lib/beat-library";

type BeatListRowProps = {
  beat: SavedBeatEntry;
  artistHref?: string;
  detailHref?: string;
  isCurrent?: boolean;
  isPlaying?: boolean;
  onPlay: () => void;
  actionLabel: string;
  onAction: () => void;
  actionTone?: "brand" | "neutral";
  actionState?: "default" | "success";
  message?: (text: string) => void;
  onAddToQueue?: () => void;
};

function uniqueTags(beat: SavedBeatEntry) {
  return Array.from(new Set([...(beat.tag_names ?? []), beat.genre, beat.mood].filter(Boolean))).slice(0, 4) as string[];
}

export function BeatListRow({
  beat,
  artistHref,
  detailHref,
  isCurrent = false,
  isPlaying = false,
  onPlay,
  onAction,
  actionLabel,
  actionTone = "brand",
  actionState = "default",
  message,
  onAddToQueue,
}: BeatListRowProps) {
  const router = useRouter();
  const { token, user } = useAuth();
  const library = useBeatLibrary(user?.id, token);
  const [menuOpen, setMenuOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [includeListenLater, setIncludeListenLater] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  const tags = useMemo(() => uniqueTags(beat), [beat]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current || menuRef.current.contains(event.target as Node)) {
        return;
      }
      setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const coverUrl = resolveMediaUrl((beat as SavedBeatEntry & { cover_art_obj?: string | null }).cover_art_obj);

  const requireSession = () => {
    if (token) {
      return true;
    }
    router.push("/auth/login");
    return false;
  };

  const notify = (text: string) => {
    message?.(text);
  };

  const openPlaylistModal = () => {
    if (!requireSession()) {
      return;
    }
    setIncludeListenLater(library.isInListenLater(beat.id));
    setSelectedIds(library.getPlaylistMembership(beat.id));
    setNewPlaylistName("");
    setPlaylistOpen(true);
    setMenuOpen(false);
  };

  const handleListenLater = () => {
    if (!requireSession()) {
      return;
    }
    if (library.isInListenLater(beat.id)) {
      notify("Already in Listen later.");
    } else {
      void library.addToListenLater(beat).then(() => notify("Saved to Listen later."));
    }
    setMenuOpen(false);
  };

  const handleAddToQueueClick = () => {
    onAddToQueue?.();
    setMenuOpen(false);
  };

  const handleShare = async () => {
    const url = detailHref ? `${window.location.origin}${detailHref}` : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: beat.title, text: `${beat.title} by ${beat.producer_username}`, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      notify("Share link ready.");
    } catch {
      notify("Could not share this beat right now.");
    }
    setMenuOpen(false);
  };

  const handlePlaylistSave = () => {
    if (!requireSession()) {
      return;
    }
    void library.saveBeatCollections(beat, {
      includeListenLater,
      playlistIds: selectedIds,
      newPlaylistName,
    }).then(() => {
      setPlaylistOpen(false);
      setMenuOpen(false);
      notify("Playlist saved.");
    });
  };

  return (
    <>
      <article
        className={`rounded-[22px] border px-3 py-3 transition ${
          isCurrent
            ? "theme-soft-strong shadow-[var(--panel-shadow-soft)]"
            : "theme-soft"
        }`}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <button
              type="button"
              onClick={onPlay}
              className={`mt-1 inline-flex h-11 w-11 flex-none items-center justify-center rounded-full border text-sm ${
                isCurrent && isPlaying ? "border-[#8b28ff] bg-[#8b28ff] text-white" : "theme-soft theme-text-soft"
              }`}
            >
              {isCurrent && isPlaying ? <Pause className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" /> : <Play className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
            </button>

            {coverUrl ? (
              <img src={coverUrl} alt={beat.title} className="h-16 w-16 rounded-2xl border object-cover" style={{ borderColor: "var(--line)" }} />
            ) : (
              <div className="theme-avatar flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-bold">
                {beat.title.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  {detailHref ? (
                    <Link href={detailHref} className="theme-text-main block truncate text-xl font-semibold tracking-tight hover:underline">
                      {beat.title}
                    </Link>
                  ) : (
                    <p className="theme-text-main truncate text-xl font-semibold tracking-tight">{beat.title}</p>
                  )}
                  <div className="theme-text-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    {artistHref ? (
                      <Link href={artistHref} className="theme-text-soft font-medium hover:underline">
                        {beat.producer_username}
                      </Link>
                    ) : (
                      <span className="theme-text-soft font-medium">{beat.producer_username}</span>
                    )}
                    <span>{beat.bpm} BPM</span>
                    <span>{beat.key || "Key N/A"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <div className="flex flex-wrap gap-2 xl:justify-end">
              {tags.map((tag) => (
                <span key={tag} className="theme-pill rounded-full px-3 py-1 text-xs">
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 xl:justify-end">
              <button
                type="button"
                onClick={onAction}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  actionTone === "brand"
                    ? actionState === "success"
                      ? "border border-emerald-300/30 bg-emerald-500/15 text-emerald-100"
                      : "bg-gradient-to-r from-[#8b28ff] via-[#7b32ff] to-[#5b48ff] text-white"
                    : "theme-soft theme-text-soft"
                }`}
              >
                {actionLabel}
              </button>
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((current) => !current)}
                  className="theme-soft theme-text-soft inline-flex h-10 w-10 items-center justify-center rounded-full"
                >
                  <EllipsisVertical className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </button>
                {menuOpen ? (
                  <div className="theme-menu absolute right-0 top-12 z-20 w-56 rounded-2xl p-2">
                    <button type="button" onClick={handleListenLater} className="theme-soft theme-text-soft flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm">
                      <Clock3 className="h-4 w-4 text-[#9f8cff]" strokeWidth={1.8} aria-hidden="true" />
                      Listen later
                    </button>
                    <button type="button" onClick={openPlaylistModal} className="theme-soft theme-text-soft flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm">
                      <Play className="h-4 w-4 text-[#9f8cff]" strokeWidth={1.8} aria-hidden="true" />
                      Add to playlist
                    </button>
                    {onAddToQueue ? (
                      <button type="button" onClick={handleAddToQueueClick} className="theme-soft theme-text-soft flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm">
                        <ListMusic className="h-4 w-4 text-[#9f8cff]" strokeWidth={1.8} aria-hidden="true" />
                        Add to queue
                      </button>
                    ) : null}
                    <button type="button" onClick={() => void handleShare()} className="theme-soft theme-text-soft flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm">
                      <Share2 className="h-4 w-4 text-[#9f8cff]" strokeWidth={1.8} aria-hidden="true" />
                      Share
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </article>

      {playlistOpen ? (
        <div className="theme-overlay fixed inset-0 z-[140] flex items-start justify-center px-4 pt-24 backdrop-blur-sm" onClick={() => setPlaylistOpen(false)}>
          <section className="theme-floating w-full max-w-[540px] rounded-[28px] p-5" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="theme-text-faint text-xs font-semibold uppercase tracking-[0.24em]">Save Beat</p>
                <h3 className="theme-text-main mt-2 text-2xl font-semibold">Add to playlist</h3>
                <p className="theme-text-muted mt-1 text-sm">Inspired by YouTube: save this beat to Listen later or one of your playlists.</p>
              </div>
              <button type="button" onClick={() => setPlaylistOpen(false)} className="theme-soft theme-text-soft rounded-full px-3 py-1.5 text-xs">
                Close
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <label className="theme-soft theme-text-soft flex items-center justify-between rounded-2xl px-4 py-3 text-sm">
                <span>Listen later</span>
                <input type="checkbox" checked={includeListenLater} onChange={(event) => setIncludeListenLater(event.target.checked)} className="h-4 w-4 accent-[#8b28ff]" />
              </label>

              <div className="theme-soft rounded-2xl p-4">
                <p className="theme-text-faint text-xs uppercase tracking-[0.18em]">Your playlists</p>
                <div className="mt-3 space-y-2">
                  {library.playlists.map((playlist) => (
                    <label key={playlist.id} className="theme-soft theme-text-soft flex items-center justify-between rounded-xl px-3 py-2 text-sm">
                      <span>{playlist.name}</span>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(playlist.id)}
                        onChange={(event) => {
                          setSelectedIds((current) =>
                            event.target.checked ? [...current, playlist.id] : current.filter((item) => item !== playlist.id),
                          );
                        }}
                        className="h-4 w-4 accent-[#8b28ff]"
                      />
                    </label>
                  ))}
                  {library.playlists.length === 0 ? <p className="theme-text-muted text-sm">No custom playlists yet.</p> : null}
                </div>
              </div>

              <div className="theme-soft rounded-2xl border-dashed p-4">
                <p className="theme-text-faint text-xs uppercase tracking-[0.18em]">Create new playlist</p>
                <input
                  value={newPlaylistName}
                  onChange={(event) => setNewPlaylistName(event.target.value)}
                  placeholder="Late night rap ideas"
                  className="theme-input mt-3 h-11 w-full rounded-2xl px-4 text-sm outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPlaylistOpen(false)} className="theme-soft theme-text-soft rounded-full px-4 py-2 text-sm">
                Cancel
              </button>
              <button type="button" onClick={handlePlaylistSave} className="rounded-full bg-gradient-to-r from-[#8b28ff] via-[#7b32ff] to-[#5b48ff] px-5 py-2 text-sm font-semibold text-white">
                Save
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}






