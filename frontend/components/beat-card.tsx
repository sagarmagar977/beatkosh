"use client";

type License = {
  id: number;
  name: string;
  includes_wav?: boolean;
  includes_stems?: boolean;
  is_exclusive?: boolean;
};

type BeatCardProps = {
  beat: {
    id: number;
    title: string;
    genre: string;
    bpm: number;
    key?: string | null;
    mood?: string | null;
    base_price: string;
    producer_username: string;
    licenses?: License[];
  };
  compact?: boolean;
};

function summarizeLicenses(licenses: License[] | undefined) {
  if (!licenses || licenses.length === 0) return "Licensing details coming soon";
  if (licenses.some((license) => license.is_exclusive)) {
    return `${licenses.length} license options including exclusive rights`;
  }
  return `${licenses.length} license options from MP3 to WAV use`;
}

export function BeatCard({ beat, compact = false }: BeatCardProps) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-white/10 bg-[#11151d] text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="border-b border-white/10 bg-[linear-gradient(135deg,#251a12_0%,#11151d_40%,#1d2736_100%)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#f6b067]">Beat Preview</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">{beat.title}</h3>
            <p className="mt-1 text-sm text-white/68">by {beat.producer_username}</p>
          </div>
          <span className="rounded-full border border-[#f6b067]/30 bg-[#f6b067]/10 px-3 py-1 text-xs font-medium text-[#ffd2a2]">
            From ${beat.base_price}
          </span>
        </div>
        <div className="mt-5 h-12 rounded-full bg-white/5 px-4 py-3">
          <div className="flex h-full items-center gap-1.5">
            {Array.from({ length: 22 }).map((_, index) => (
              <span
                key={index}
                className="block flex-1 rounded-full bg-gradient-to-t from-[#f6b067]/30 to-[#77d6c8]"
                style={{ height: `${40 + ((index * 17) % 45)}%` }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className={`space-y-4 p-5 ${compact ? "" : "min-h-[220px]"}`}>
        <div className="flex flex-wrap gap-2 text-xs text-white/75">
          <span className="rounded-full bg-white/6 px-3 py-1">{beat.genre}</span>
          <span className="rounded-full bg-white/6 px-3 py-1">{beat.bpm} BPM</span>
          {beat.key ? <span className="rounded-full bg-white/6 px-3 py-1">Key {beat.key}</span> : null}
          {beat.mood ? <span className="rounded-full bg-white/6 px-3 py-1">{beat.mood}</span> : null}
        </div>
        <p className="text-sm leading-6 text-white/68">{summarizeLicenses(beat.licenses)}</p>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Trust</p>
            <p className="text-sm text-white/80">Verification-ready producer profile and transparent licensing</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/82 hover:border-white/25 hover:bg-white/5">
              Preview
            </button>
            <button className="rounded-full bg-[#f6b067] px-4 py-2 text-sm font-medium text-[#20150e] hover:bg-[#ffc789]">
              Add to cart
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
