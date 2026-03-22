"use client";

import { Heart, Info, Pause, Play, Repeat, Share2, ShoppingCart, Shuffle, SkipBack, SkipForward, Volume2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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
    setVolumeLevel,
  } = usePlayer();
  const [likedTrackId, setLikedTrackId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const progress = useMemo(() => (duration > 0 ? (currentTime / duration) * 100 : 0), [currentTime, duration]);

  if (!currentTrack) {
    return null;
  }

  const liked = likedTrackId === currentTrack.id;

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

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#070809]/96 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto max-w-[1380px]">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(460px,560px)_minmax(0,1fr)] xl:items-center">
          <div className="flex min-w-0 items-center gap-3">
            {currentTrack.coverUrl ? (
              <img src={currentTrack.coverUrl} alt={currentTrack.title} className="h-14 w-14 rounded-xl border border-white/10 object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-[#2a3546] to-[#11151d] text-sm font-semibold text-white/80">
                {(currentTrack.coverText || currentTrack.title).slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-white">{currentTrack.title}</p>
              <p className="truncate text-sm text-white/65">{currentTrack.artist}</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-white/78">
              <button
                type="button"
                onClick={toggleShuffle}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/6 ${isShuffling ? "text-[#31d17b]" : "text-white/55"}`}
                aria-label="Shuffle"
              >
                <Shuffle className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => void playPrevious()}
                disabled={!hasPrevious}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/78 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:text-white/20"
                aria-label="Previous"
              >
                <SkipBack className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => void togglePlay()}
                className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-[0_8px_30px_rgba(255,255,255,0.14)]"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="h-6 w-6" strokeWidth={2} aria-hidden="true" /> : <Play className="ml-0.5 h-6 w-6 fill-current" strokeWidth={2} aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => void playNext()}
                disabled={!hasNext}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/78 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:text-white/20"
                aria-label="Next"
              >
                <SkipForward className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={toggleLoop}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/6 ${isLooping ? "text-[#31d17b]" : "text-white/55"}`}
                aria-label="Repeat"
              >
                <Repeat className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            <div className="flex w-full items-center gap-3">
              <span className="w-10 text-right text-xs text-white/50">{formatClock(currentTime)}</span>
              <div className="h-1.5 flex-1 rounded-full bg-white/10">
                <div className="h-1.5 rounded-full bg-[#31d17b]" style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
              <span className="w-10 text-xs text-white/50">{formatClock(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <button type="button" onClick={() => void handleShare()} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/72 hover:bg-white/5">
              <Share2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => void handleLike()} className={`inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/5 ${liked ? "text-[#ffb8ce]" : "text-white/72"}`}>
              <Heart className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </button>
            <Link href={currentTrack.beatUrl || "/orders"} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/72 hover:bg-white/5">
              <Info className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </Link>
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 lg:inline-flex">
              <Volume2 className="h-4 w-4 text-white/72" strokeWidth={1.8} aria-hidden="true" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(event) => setVolumeLevel(Number(event.target.value))}
                className="w-24 accent-[#31d17b]"
              />
            </div>
            <button type="button" onClick={() => void handleAddToCart()} className="inline-flex min-w-[128px] items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black">
              <ShoppingCart className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              {currentTrack.price ? `Rs ${currentTrack.price}` : "Buy"}
            </button>
          </div>
        </div>
        {message ? <p className="mt-2 text-right text-xs text-[#9fe6ba]">{message}</p> : null}
      </div>
    </footer>
  );
}
