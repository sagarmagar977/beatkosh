"use client";

import { Heart, Info, ListMusic, Minimize2, Pause, Play, Repeat, Share2, ShoppingCart, Shuffle, SkipBack, SkipForward, Volume2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { usePlayer } from "@/context/player-context";
import { apiRequest } from "@/lib/api";

function formatClock(value: number) {
  const v = Number.isFinite(value) ? Math.floor(value) : 0;
  const min = Math.floor(v / 60);
  const sec = v % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function GlobalPlayer() {
  const router = useRouter();
  const { token } = useAuth();
  const {
    currentTrack,
    queue,
    queueIndex,
    isPlaying,
    isLooping,
    isShuffling,
    currentTime,
    duration,
    volume,
    hasNext,
    hasPrevious,
    togglePlay,
    toggleLoop,
    toggleShuffle,
    playNext,
    playPrevious,
    playQueueIndex,
    removeFromQueue,
    setVolumeLevel,
    stopPlayback,
  } = usePlayer();
  const [likedTrackId, setLikedTrackId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  const progress = useMemo(() => (duration > 0 ? (currentTime / duration) * 100 : 0), [currentTime, duration]);

  useEffect(() => {
    if (!isQueueOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsQueueOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isQueueOpen]);

  if (!currentTrack) {
    return null;
  }

  const liked = likedTrackId === currentTrack.id;
  const queueCount = queue.length;

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 1800);
  };

  const handleShare = async () => {
    const shareUrl = currentTrack.beatUrl ? `${window.location.origin}${currentTrack.beatUrl}` : window.location.href;
    await navigator.clipboard.writeText(shareUrl);
    notify("Track link copied.");
  };

  const handleLike = async () => {
    if (!token) {
      router.push("/auth/login");
      return;
    }
    if (liked) {
      await apiRequest(`/account/likes/beats/${currentTrack.id}/`, { method: "DELETE", token });
      setLikedTrackId(null);
      notify("Removed from likes.");
      return;
    }
    await apiRequest(`/account/likes/beats/${currentTrack.id}/`, { method: "POST", token, body: {} });
    setLikedTrackId(currentTrack.id);
    notify("Added to likes.");
  };

  const handleAddToCart = async () => {
    if (!token) {
      router.push("/auth/login");
      return;
    }
    if (!currentTrack.defaultLicenseId) {
      notify("Select a license from the beat page first.");
      return;
    }
    await apiRequest("/orders/create/", {
      method: "POST",
      token,
      body: {
        items: [{ product_type: "beat", product_id: currentTrack.id, license_id: currentTrack.defaultLicenseId }],
      },
    });
    notify("Added to cart.");
    router.push("/orders");
  };

  const handleClosePlayer = () => {
    setIsQueueOpen(false);
    setIsMinimized(false);
    stopPlayback(true);
  };

  const queueDrawer = (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/38 backdrop-blur-[1px] transition ${isQueueOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setIsQueueOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed right-0 top-[calc(var(--app-header-height,112px)+12px)] z-50 h-[calc(100vh-var(--app-header-height,112px)-6.75rem)] w-full max-w-[360px] border-l border-white/10 bg-[#0d0f12]/96 shadow-[-24px_0_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition-transform duration-300 ${isQueueOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">Queue</p>
              <p className="mt-1 text-sm font-semibold text-white">{queueCount} tracks lined up</p>
            </div>
            <button
              type="button"
              onClick={() => setIsQueueOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/68 transition hover:bg-white/6 hover:text-white"
              aria-label="Close queue"
            >
              <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
          <div className="border-b border-white/10 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Now playing</p>
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#31d17b]/20 bg-[#31d17b]/10 p-3">
              {currentTrack.coverUrl ? (
                <img src={currentTrack.coverUrl} alt={currentTrack.title} className="h-12 w-12 rounded-xl object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/8 text-xs font-semibold text-white/70">
                  {(currentTrack.coverText || currentTrack.title).slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{currentTrack.title}</p>
                <p className="truncate text-xs text-white/55">{currentTrack.artist}</p>
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {queue.length > 0 ? (
              <div className="space-y-2">
                {queue.map((track, index) => {
                  const active = index === queueIndex || track.id === currentTrack.id;
                  return (
                    <div
                      key={`${track.id}-${index}`}
                      className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 transition ${active ? "border-[#31d17b]/25 bg-[#31d17b]/10" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                    >
                      <button
                        type="button"
                        onClick={() => void playQueueIndex(index)}
                        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${active ? "bg-white text-black" : "bg-white/8 text-white/76"}`}
                        aria-label={`Play ${track.title}`}
                      >
                        {active && isPlaying ? <Pause className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> : <Play className="ml-0.5 h-4 w-4 fill-current" strokeWidth={2} aria-hidden="true" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${active ? "text-white" : "text-white/86"}`}>{track.title}</p>
                        <p className="truncate text-xs text-white/52">{track.artist}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeFromQueue(track.id)}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/55 transition hover:bg-white/7 hover:text-white"
                        aria-label={`Remove ${track.title} from queue`}
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/55">
                Add beats to the queue from the three-dot menus while you browse.
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );

  if (isMinimized) {
    return (
      <>
        {queueDrawer}
        <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#070809]/94 px-3 py-2 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[1380px] items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/74 transition hover:bg-white/10 hover:text-white"
              aria-label="Expand player"
            >
              <Play className="ml-0.5 h-3.5 w-3.5 fill-current" strokeWidth={2} aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="truncate text-xs font-semibold text-white/88">{currentTrack.title}</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsQueueOpen((current) => !current)}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-white/8 hover:text-white ${isQueueOpen ? "text-white" : "text-white/72"}`}
                    aria-label="Toggle queue"
                  >
                    <ListMusic className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void togglePlay()}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/72 transition hover:bg-white/8 hover:text-white"
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" strokeWidth={2} aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMinimized(false)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/72 transition hover:bg-white/8 hover:text-white"
                    aria-label="Expand player"
                  >
                    <Minimize2 className="h-3.5 w-3.5 rotate-180" strokeWidth={1.9} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClosePlayer}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/72 transition hover:bg-white/8 hover:text-white"
                    aria-label="Close player"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-1 rounded-full bg-[#31d17b] transition-[width] duration-150" style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
            </div>
          </div>
        </footer>
      </>
    );
  }

  return (
    <>
      {queueDrawer}
      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#070809]/94 px-3 py-2 backdrop-blur-2xl">
        <div className="mx-auto max-w-[1380px]">
          <div className="grid gap-2 md:gap-3 xl:grid-cols-[minmax(220px,1fr)_minmax(360px,520px)_minmax(220px,1fr)] xl:items-center">
            <div className="flex min-w-0 items-center gap-3">
              {currentTrack.coverUrl ? (
                <img src={currentTrack.coverUrl} alt={currentTrack.title} className="h-12 w-12 rounded-lg border border-white/10 object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-[#2a3546] to-[#11151d] text-xs font-semibold text-white/80">
                  {(currentTrack.coverText || currentTrack.title).slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{currentTrack.title}</p>
                <p className="truncate text-xs text-white/60">{currentTrack.artist}</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-1.5 text-white/78">
                <button
                  type="button"
                  onClick={toggleShuffle}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/6 ${isShuffling ? "text-[#31d17b]" : "text-white/50"}`}
                  aria-label="Shuffle"
                >
                  <Shuffle className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => void playPrevious()}
                  disabled={!hasPrevious}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/78 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:text-white/20"
                  aria-label="Previous"
                >
                  <SkipBack className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => void togglePlay()}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.14)] transition hover:scale-[1.02]"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="h-5 w-5" strokeWidth={2} aria-hidden="true" /> : <Play className="ml-0.5 h-5 w-5 fill-current" strokeWidth={2} aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  onClick={() => void playNext()}
                  disabled={!hasNext}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/78 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:text-white/20"
                  aria-label="Next"
                >
                  <SkipForward className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={toggleLoop}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/6 ${isLooping ? "text-[#31d17b]" : "text-white/50"}`}
                  aria-label="Repeat"
                >
                  <Repeat className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
              <div className="flex w-full items-center gap-2.5">
                <span className="w-9 text-right text-[11px] text-white/42">{formatClock(currentTime)}</span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-1 rounded-full bg-[#31d17b] transition-[width] duration-150" style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
                <span className="w-9 text-[11px] text-white/42">{formatClock(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={() => setIsQueueOpen((current) => !current)}
                className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/5 ${isQueueOpen ? "text-white" : "text-white/68"}`}
                aria-label="Toggle queue"
              >
                <ListMusic className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                {queueCount > 1 ? <span className="absolute -right-1 -top-1 rounded-full bg-[#31d17b] px-1 text-[9px] font-semibold text-black">{queueCount}</span> : null}
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/68 hover:bg-white/5"
                aria-label="Minimize player"
              >
                <Minimize2 className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleClosePlayer}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/68 hover:bg-white/5"
                aria-label="Close player"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => void handleShare()} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/68 hover:bg-white/5">
                <Share2 className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => void handleLike()} className={`inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/5 ${liked ? "text-[#ffb8ce]" : "text-white/68"}`}>
                <Heart className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
              </button>
              <Link href={currentTrack.beatUrl || "/orders"} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/68 hover:bg-white/5">
                <Info className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
              </Link>
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 lg:inline-flex">
                <Volume2 className="h-3.5 w-3.5 text-white/68" strokeWidth={1.8} aria-hidden="true" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(event) => setVolumeLevel(Number(event.target.value))}
                  className="w-20 accent-[#31d17b]"
                />
              </div>
              <button type="button" onClick={() => void handleAddToCart()} className="inline-flex min-w-[112px] items-center justify-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-black">
                <ShoppingCart className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                {currentTrack.price ? `Rs ${currentTrack.price}` : "Buy"}
              </button>
            </div>
          </div>
          {message ? <p className="mt-1 text-right text-[11px] text-[#9fe6ba]">{message}</p> : null}
        </div>
      </footer>
    </>
  );
}
