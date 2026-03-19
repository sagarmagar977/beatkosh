"use client";

import { Clock3, EllipsisVertical, Pause, Play, Share2 } from "lucide-react";
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
}: BeatListRowProps) {
  const router = useRouter();
  const { token, user } = useAuth();
  const library = useBeatLibrary(user?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

  const coverUrl = resolveMediaUrl(beat.cover_art_obj);

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
      library.addToListenLater(beat);
      notify("Saved to Listen later.");
    }
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
    library.saveBeatCollections(beat, {
      includeListenLater,
      playlistIds: selectedIds,
      newPlaylistName,
    });
    setPlaylistOpen(false);
    setMenuOpen(false);
    notify("Playlist saved.");
  };

  return (
    <>
      <article
        className={`rounded-[22px] border px-3 py-3 transition ${
          isCurrent
            ? "border-white/10 bg-white/[0.05] shadow-[0_18px_40px_rgba(0,0,0,0.14)]"
            : "border-transparent bg-transparent hover:border-white/8 hover:bg-white/[0.04]"
        }`}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <button
              type="button"
              onClick={onPlay}
              className={`mt-1 inline-flex h-11 w-11 flex-none items-center justify-center rounded-full border text-sm ${
                isCurrent && isPlaying ? "border-[#8b28ff] bg-[#8b28ff] text-white" : "border-white/15 bg-white/5 text-white/84"
              }`}
            >
              {isCurrent && isPlaying ? <Pause className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" /> : <Play className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
            </button>

            {coverUrl ? (
              <img src={coverUrl} alt={beat.title} className="h-16 w-16 rounded-2xl border border-white/10 object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#263044] to-[#12151d] text-lg font-bold text-white/82">
                {beat.title.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  {detailHref ? (
                    <Link href={detailHref} className="block truncate text-xl font-semibold tracking-tight text-white hover:underline">
                      {beat.title}
                    </Link>
                  ) : (
                    <p className="truncate text-xl font-semibold tracking-tight text-white">{beat.title}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/64">
                    {artistHref ? (
                      <Link href={artistHref} className="font-medium text-white/78 hover:underline">
                        {beat.producer_username}
                      </Link>
                    ) : (
                      <span className="font-medium text-white/78">{beat.producer_username}</span>
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
                <span key={tag} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/66">
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
                    : "border border-white/12 bg-white/[0.04] text-white/84"
                }`}
              >
                {actionLabel}
              </button>
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((current) => !current)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white/76"
                >
                  <EllipsisVertical className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </button>
                {menuOpen ? (
                  <div className="absolute right-0 top-12 z-20 w-56 rounded-2xl border border-white/12 bg-[#12141d] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                    <button type="button" onClick={handleListenLater} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-white/80 hover:bg-white/[0.06]">
                      <Clock3 className="h-4 w-4 text-[#9f8cff]" strokeWidth={1.8} aria-hidden="true" />
                      Listen later
                    </button>
                    <button type="button" onClick={openPlaylistModal} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-white/80 hover:bg-white/[0.06]">
                      <Play className="h-4 w-4 text-[#9f8cff]" strokeWidth={1.8} aria-hidden="true" />
                      Add to playlist
                    </button>
                    <button type="button" onClick={() => void handleShare()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-white/80 hover:bg-white/[0.06]">
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
        <div className="fixed inset-0 z-[140] flex items-start justify-center bg-black/70 px-4 pt-24 backdrop-blur-sm" onClick={() => setPlaylistOpen(false)}>
          <section className="w-full max-w-[540px] rounded-[28px] border border-white/12 bg-[#181b24] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.46)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/42">Save Beat</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Add to playlist</h3>
                <p className="mt-1 text-sm text-white/58">Inspired by YouTube: save this beat to Listen later or one of your playlists.</p>
              </div>
              <button type="button" onClick={() => setPlaylistOpen(false)} className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/70">
                Close
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/84">
                <span>Listen later</span>
                <input type="checkbox" checked={includeListenLater} onChange={(event) => setIncludeListenLater(event.target.checked)} className="h-4 w-4 accent-[#8b28ff]" />
              </label>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">Your playlists</p>
                <div className="mt-3 space-y-2">
                  {library.playlists.map((playlist) => (
                    <label key={playlist.id} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80">
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
                  {library.playlists.length === 0 ? <p className="text-sm text-white/52">No custom playlists yet.</p> : null}
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">Create new playlist</p>
                <input
                  value={newPlaylistName}
                  onChange={(event) => setNewPlaylistName(event.target.value)}
                  placeholder="Late night rap ideas"
                  className="mt-3 h-11 w-full rounded-2xl border border-white/10 bg-[#11131a] px-4 text-sm text-white outline-none placeholder:text-white/30"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPlaylistOpen(false)} className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/70">
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
