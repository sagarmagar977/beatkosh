import Image from "next/image";
import Link from "next/link";

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
    return "Not refreshed yet";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not refreshed yet";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatScore(score: number) {
  if (score >= 10) {
    return score.toFixed(1);
  }
  if (score >= 1) {
    return score.toFixed(2);
  }
  return score.toFixed(4);
}

export function TrendingBeatsGrid({
  title,
  subtitle,
  beats,
}: {
  title: string;
  subtitle: string;
  beats: TrendingBeat[];
}) {
  const calculatedAt = beats[0]?.calculated_at;

  return (
    <section className="rounded-[30px] border border-white/8 bg-[#111315]/94 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8ef0b4]">Trending Beats</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">{title}</h2>
          <p className="mt-2 text-sm text-white/58">{subtitle}</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/65">
          Refreshed {formatCalculatedAt(calculatedAt)}
        </div>
      </div>

      {beats.length === 0 ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-5 py-12 text-center text-sm text-white/55">
          No trending beats are available yet. Run the refresh command once and this section will populate.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {beats.map((beat) => {
            const cover = resolveMediaUrl(beat.cover_art_obj);
            return (
              <Link
                key={`${title}-${beat.beat_id}`}
                href={`/beats/${beat.beat_id}`}
                className="group overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-3 transition hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.06]"
              >
                <div className="relative overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#17311f,#151922_58%,#291819)]">
                  {cover ? (
                    <Image
                      src={cover}
                      alt={beat.title}
                      fill
                      sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition duration-300 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="aspect-square w-full" />
                  )}
                  <div className="absolute left-3 top-3 inline-flex items-center rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                    #{beat.rank}
                  </div>
                </div>

                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="line-clamp-1 text-base font-semibold text-white">{beat.title}</p>
                    <p className="mt-1 line-clamp-1 text-sm text-white/62">{beat.producer_username}</p>
                  </div>
                  <div className="rounded-full border border-[#8ef0b4]/20 bg-[#8ef0b4]/10 px-2.5 py-1 text-[11px] font-semibold text-[#8ef0b4]">
                    {beat.genre}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/70">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Plays</p>
                    <p className="mt-1 text-sm font-semibold text-white">{beat.play_count}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Likes</p>
                    <p className="mt-1 text-sm font-semibold text-white">{beat.like_count}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Purchases</p>
                    <p className="mt-1 text-sm font-semibold text-white">{beat.purchase_count}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Score</p>
                    <p className="mt-1 text-sm font-semibold text-white">{formatScore(beat.trending_score)}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-white/48">
                  <span>{beat.bpm} BPM</span>
                  <span>Rs {beat.base_price}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
