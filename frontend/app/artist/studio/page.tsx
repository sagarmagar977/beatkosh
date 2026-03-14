"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BeatCard } from "@/components/beat-card";
import { FeatureTrackList } from "@/components/feature-track-list";
import { ReferenceScreenGrid } from "@/components/reference-screen-grid";
import { apiRequest } from "@/lib/api";
import { Beat22Summary, fetchBeat22Summary } from "@/lib/reference";

type Beat = {
  id: number;
  title: string;
  genre: string;
  bpm: number;
  key?: string | null;
  mood?: string | null;
  base_price: string;
  producer_username: string;
  licenses?: { id: number; name: string }[];
};

export default function ArtistStudioPage() {
  const [summary, setSummary] = useState<Beat22Summary | null>(null);
  const [trending, setTrending] = useState<Beat[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const [referenceData, trendingData] = await Promise.all([
          fetchBeat22Summary(),
          apiRequest<Beat[]>("/beats/trending/"),
        ]);
        setSummary(referenceData);
        setTrending(trendingData.slice(0, 4));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load artist studio");
      }
    };
    void run();
  }, []);

  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-[34px] p-6 md:p-8">
        <p className="eyebrow">Artist Studio</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Beat22-style artist dashboard and discovery flow</h1>
        <p className="mt-3 max-w-3xl text-white/68">
          This screen combines dashboard controls, discovery, and cart intent inspired by your `artist` references.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/beats" className="rounded-full bg-[#f6b067] px-4 py-2.5 font-medium text-[#20150e]">Browse beats</Link>
          <Link href="/orders" className="rounded-full border border-white/10 px-4 py-2.5 text-white/82 hover:bg-white/5">Open cart</Link>
          <Link href="/library" className="rounded-full border border-white/10 px-4 py-2.5 text-white/82 hover:bg-white/5">Open library</Link>
          <Link href="/verification" className="rounded-full border border-white/10 px-4 py-2.5 text-white/82 hover:bg-white/5">Trust and verification</Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <div>
            <p className="eyebrow">Trending</p>
            <h2 className="mt-2 text-2xl font-semibold">Reference-aligned discovery</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {trending.map((beat) => <BeatCard key={beat.id} beat={beat} compact />)}
          </div>
        </div>
        <aside className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Delivery track</p>
          <h2 className="mt-2 text-2xl font-semibold">Artist feature map</h2>
          {summary ? <div className="mt-4"><FeatureTrackList tracks={summary.feature_map.artist} /></div> : null}
        </aside>
      </section>

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Reference mapping</p>
          <h2 className="mt-2 text-2xl font-semibold">Artist screen references</h2>
        </div>
        <ReferenceScreenGrid screens={summary?.roles.artist.screens.slice(0, 12) ?? []} />
      </section>

      {error ? <p className="text-sm text-[#ffb4a9]">{error}</p> : null}
    </div>
  );
}
