import { TrendingBeatShelf, type TrendingBeat } from "@/components/trending-beat-shelf";

export const revalidate = 3600;

const BACKEND_ORIGIN = (process.env.NEXT_PUBLIC_BACKEND_ORIGIN ?? "http://127.0.0.1:8000").replace(/\/$/, "");
const API_BASE = (() => {
  const configured = (process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/api/v1").trim();
  if (!configured) {
    return "/api/v1";
  }
  return configured.startsWith("/") ? configured : `/${configured}`;
})();

type TrendingSection = {
  beats: TrendingBeat[];
  error: string | null;
};

async function fetchTrending(path: string): Promise<TrendingSection> {
  const response = await fetch(`${BACKEND_ORIGIN}${API_BASE}${path}`, {
    next: { revalidate },
  });

  if (!response.ok) {
    return {
      beats: [],
      error: `Failed to load ${path} (${response.status})`,
    };
  }

  return {
    beats: (await response.json()) as TrendingBeat[],
    error: null,
  };
}

export default async function Page() {
  const [daily, weekly] = await Promise.all([
    fetchTrending("/beats/trending/daily/"),
    fetchTrending("/beats/trending/weekly/"),
  ]);

  return (
    <div className="space-y-6 pb-20">
      <section className="overflow-hidden rounded-[34px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(30,215,96,0.16),transparent_28%),linear-gradient(180deg,#16191c_0%,#0f1113_100%)] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.34)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8ef0b4]">BeatKosh Discovery</p>
        <h1 className="mt-4 max-w-[10ch] text-4xl font-semibold leading-[0.94] text-white md:text-6xl">Trending beats, built like shelves.</h1>
        <p className="mt-5 max-w-[760px] text-sm leading-6 text-white/65 md:text-base">
          The ranking still comes from the backend gravity algorithm, but the experience now feels like discovery rails instead of analytics panels.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/70">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Trending Today</span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Trending This Week</span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Carousel shelves</span>
        </div>
      </section>

      {daily.error ? <p className="text-sm text-[#ffb4a9]">{daily.error}</p> : null}
      <TrendingBeatShelf
        title="Trending Today"
        subtitle="The fastest-moving beats from the last 24 hours."
        beats={daily.beats}
      />

      {weekly.error ? <p className="text-sm text-[#ffb4a9]">{weekly.error}</p> : null}
      <TrendingBeatShelf
        title="Trending This Week"
        subtitle="The strongest discovery shelf from the last 7 days."
        beats={weekly.beats}
      />
    </div>
  );
}
