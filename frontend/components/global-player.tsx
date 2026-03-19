"use client";

import { BarChart3, Heart, Info, Pause, Play, Repeat, Share2, ShoppingCart, SkipBack, SkipForward, Volume2 } from "lucide-react";
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

function formatCompactNumber(value?: number | null) {
  if (!value) {
    return "0";
  }
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function GlobalPlayer() {
  const router = useRouter();
  const { token } = useAuth();
  const {
    currentTrack,
    isPlaying,
    isLooping,
    currentTime,
    duration,
    volume,
    togglePlay,
    toggleLoop,
    setVolumeLevel,
  } = usePlayer();
  const [liked, setLiked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const progress = useMemo(() => (duration > 0 ? (currentTime / duration) * 100 : 0), [currentTime, duration]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLiked(false);
  }, [currentTrack?.id]);

  if (!currentTrack) {
    return null;
  }

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
      setLiked(false);
      notify("Removed from likes.");
      return;
    }
    await apiRequest(`/account/likes/beats/${currentTrack.id}/`, { method: "POST", token, body: {} });
    setLiked(true);
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
    <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#090a11]/98 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto mb-3 h-1 max-w-[1240px] rounded-full bg-white/12">
        <div className="h-1 rounded-full bg-[#b58bff]" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-4 xl:flex-nowrap">
        <div className="flex items-center gap-2 text-white/65">
          <button type="button" disabled className="inline-flex h-10 w-10 items-center justify-center rounded-full">
            <SkipBack className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => void togglePlay()} className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-[0_8px_30px_rgba(255,255,255,0.14)]">
            {isPlaying ? <Pause className="h-6 w-6" strokeWidth={2} aria-hidden="true" /> : <Play className="ml-0.5 h-6 w-6 fill-current" strokeWidth={2} aria-hidden="true" />}
          </button>
          <button type="button" disabled className="inline-flex h-10 w-10 items-center justify-center rounded-full">
            <SkipForward className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm text-white/65">
          <span>{formatClock(currentTime)}</span>
          <span className="text-white/35">/</span>
          <span>{formatClock(duration)}</span>
        </div>

        <div className="flex items-center gap-2 text-white/78">
          <button type="button" onClick={() => void handleShare()} aria-label="Share" title="Share" className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/5">
            <Share2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => void handleLike()} aria-label="Like" title="Like" className={`inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/5 ${liked ? "text-[#ffb8ce]" : "text-white/78"}`}>
            <Heart className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>

        <div className="flex min-w-0 items-center gap-4 xl:ml-8 xl:flex-1">
          {currentTrack.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentTrack.coverUrl} alt={currentTrack.title} className="h-14 w-14 rounded-md border border-white/10 object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-md border border-white/10 bg-gradient-to-br from-[#2a3546] to-[#11151d] text-sm font-semibold text-white/80">
              {(currentTrack.coverText || currentTrack.title).slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-2xl font-semibold leading-none text-white xl:text-[34px]">{currentTrack.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
              <span>{currentTrack.artist}</span>
              {currentTrack.bpm ? <span className="font-semibold text-[#f3d28c]">{currentTrack.bpm} BPM</span> : null}
              {typeof currentTrack.playCount === "number" ? (
                <span className="inline-flex items-center gap-1 text-white/78">
                  <Play className="h-3.5 w-3.5 fill-current" strokeWidth={1.8} aria-hidden="true" />
                  {formatCompactNumber(currentTrack.playCount)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href={currentTrack.beatUrl || "/orders"} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/72 hover:bg-white/5">
            <Info className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={toggleLoop}
            aria-label="Repeat"
            title="Repeat"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/5 ${isLooping ? "text-[#d4b0ff]" : "text-white/72"}`}
          >
            <Repeat className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </button>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/75 lg:inline-flex">
            <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
            {formatCompactNumber(currentTrack.playCount)} plays
          </div>
          <Volume2 className="h-5 w-5 text-white" strokeWidth={1.8} aria-hidden="true" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolumeLevel(Number(e.target.value))}
            className="w-28 accent-[#b58bff]"
          />
          <button type="button" onClick={() => void handleAddToCart()} className="brand-btn inline-flex min-w-[140px] items-center justify-center gap-2 px-5 py-3 text-xl font-semibold">
            <ShoppingCart className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            {currentTrack.price ? `Rs ${currentTrack.price}` : "Buy"}
          </button>
        </div>
      </div>
      {message ? <p className="mx-auto mt-2 max-w-[1240px] text-right text-xs text-[#d2b0ff]">{message}</p> : null}
    </footer>
  );
}
