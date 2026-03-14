"use client";

import Link from "next/link";

import { usePlayer } from "@/context/player-context";

function formatClock(value: number) {
  const v = Number.isFinite(value) ? Math.floor(value) : 0;
  const min = Math.floor(v / 60);
  const sec = v % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function GlobalPlayer() {
  const { currentTrack, isPlaying, currentTime, duration, volume, togglePlay, seekTo, setVolumeLevel } = usePlayer();

  if (!currentTrack) {
    return null;
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#090a11]/98 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto grid max-w-[1240px] items-center gap-3 lg:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-white/10 bg-gradient-to-br from-[#2a3546] to-[#11151d] text-xs font-semibold text-white/80">
            {(currentTrack.coverText || currentTrack.title).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{currentTrack.title}</p>
            <p className="text-xs text-white/60">
              {currentTrack.artist}
              {currentTrack.bpm ? ` • ${currentTrack.bpm} BPM` : ""}
              {currentTrack.key ? ` • ${currentTrack.key}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => void togglePlay()} className="h-10 w-10 rounded-full border border-white/15 bg-white/5 text-sm">
            {isPlaying ? "❚❚" : "▶"}
          </button>
          <span className="w-12 text-xs text-white/65">{formatClock(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="w-[38vw] max-w-[560px] accent-[#8b28ff]"
          />
          <span className="w-12 text-xs text-white/65">{formatClock(duration)}</span>
        </div>

        <div className="flex items-center justify-end gap-3">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolumeLevel(Number(e.target.value))}
            className="w-24 accent-[#8b28ff]"
          />
          <Link href="/orders" className="brand-btn px-4 py-2 text-sm">
            {currentTrack.price ? `₹${currentTrack.price}` : "Buy"}
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-2 h-1 max-w-[1240px] rounded-full bg-white/12">
        <div className="h-1 rounded-full bg-[#8b28ff]" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
    </footer>
  );
}
