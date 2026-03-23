"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import { resolveMediaUrl } from "@/lib/api";

export type TrendingBeat = {
  beat_id: number;
  title: string;
  producer_id: number;
  producer_username: string;
  genre: string;
  bpm: number;
  base_price: string;
  cover_art_obj?: string | null;
  preview_audio_obj?: string | null;
  created_at: string;
  rank: number;
  trending_score: number;
  play_count: number;
  like_count: number;
  purchase_count: number;
  calculated_at: string;
};

function formatCalculatedAt(value?: string) {
  if (!value) {
    return "Awaiting refresh";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Awaiting refresh";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function RailHeader({
  title,
  subtitle,
  href,
  onPrev,
  onNext,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8ef0b4]">Trending Beats</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-white/55">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {href ? (
          <Link href={href} className="rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-white/72 transition hover:bg-white/[0.06] hover:text-white">
            See more
          </Link>
        ) : null}
        <button type="button" onClick={onPrev} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/72 transition hover:bg-white/[0.06] hover:text-white">
          <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
        <button type="button" onClick={onNext} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/72 transition hover:bg-white/[0.06] hover:text-white">
          <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function TrendingBeatCard({ beat }: { beat: TrendingBeat }) {
  const cover = resolveMediaUrl(beat.cover_art_obj);

  return (
    <Link
      href={`/beats/${beat.beat_id}`}
      className="group w-[190px] flex-none rounded-[22px] border border-white/8 bg-white/[0.03] p-3 transition hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.05]"
    >
      <div className="relative overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#17311f,#11151d_60%,#2f1a19)]">
        {cover ? (
          <img
            src={cover}
            alt={beat.title}
            className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="aspect-square w-full" />
        )}
        <div className="absolute left-3 top-3 rounded-full border border-white/12 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/88 backdrop-blur">
          #{beat.rank}
        </div>
      </div>
      <p className="mt-3 line-clamp-1 text-sm font-semibold text-white">{beat.title}</p>
      <p className="mt-1 line-clamp-1 text-xs text-white/58">{beat.producer_username}</p>
      <div className="mt-3 flex items-center justify-between text-[11px] text-white/48">
        <span>{beat.genre}</span>
        <span>{beat.bpm} BPM</span>
      </div>
      <p className="mt-2 line-clamp-1 text-[11px] text-white/62">Fresh momentum in the {beat.rank <= 5 ? "top tier" : "trending mix"}.</p>
    </Link>
  );
}

export function TrendingBeatShelf({
  title,
  subtitle,
  beats,
  href = "/beats",
}: {
  title: string;
  subtitle: string;
  beats: TrendingBeat[];
  href?: string;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const calculatedAt = beats[0]?.calculated_at;

  const scrollByCard = (direction: number) => {
    railRef.current?.scrollBy({ left: direction * 840, behavior: "smooth" });
  };

  return (
    <section className="rounded-[30px] border border-white/8 bg-[#111315]/94 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/58">
          Refreshed {formatCalculatedAt(calculatedAt)}
        </div>
      </div>
      <RailHeader title={title} subtitle={subtitle} href={href} onPrev={() => scrollByCard(-1)} onNext={() => scrollByCard(1)} />
      {beats.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-5 py-12 text-center text-sm text-white/55">
          No trending beats are available yet. Run the refresh command once and this rail will populate.
        </div>
      ) : (
        <div ref={railRef} className="flex gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {beats.map((beat) => (
            <TrendingBeatCard key={`${title}-${beat.beat_id}`} beat={beat} />
          ))}
        </div>
      )}
    </section>
  );
}
