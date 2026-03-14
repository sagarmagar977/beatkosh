"use client";

import { useEffect, useState } from "react";

import { FeatureTrackList } from "@/components/feature-track-list";
import { ReferenceScreenGrid } from "@/components/reference-screen-grid";
import { Beat22Summary, fetchBeat22Summary } from "@/lib/reference";

export default function ReferenceHubPage() {
  const [summary, setSummary] = useState<Beat22Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setSummary(await fetchBeat22Summary());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load references");
      }
    };
    void run();
  }, []);

  const artistScreens = summary?.roles.artist.screens.slice(0, 9) ?? [];
  const producerScreens = summary?.roles.producer.screens.slice(0, 9) ?? [];

  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-[34px] p-6 md:p-8">
        <p className="eyebrow">Beat22 alignment</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Reference Hub for artist and producer UX parity</h1>
        <p className="mt-3 max-w-3xl text-white/68">
          This hub reads from <code>reference resource/beat22</code> and maps each reference to frontend and backend feature tracks.
        </p>
        {summary ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Total screens</p>
              <p className="mt-2 text-3xl font-semibold">{summary.totals.screens}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Artist references</p>
              <p className="mt-2 text-3xl font-semibold">{summary.roles.artist.screen_count}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Producer references</p>
              <p className="mt-2 text-3xl font-semibold">{summary.roles.producer.screen_count}</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Artist track</p>
          <h2 className="mt-2 text-2xl font-semibold">Frontend/backend implementation status</h2>
          {summary ? <div className="mt-4"><FeatureTrackList tracks={summary.feature_map.artist} /></div> : null}
        </div>
        <div className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Producer track</p>
          <h2 className="mt-2 text-2xl font-semibold">Frontend/backend implementation status</h2>
          {summary ? <div className="mt-4"><FeatureTrackList tracks={summary.feature_map.producer} /></div> : null}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Artist references</p>
          <h2 className="mt-2 text-2xl font-semibold">Top reference screens</h2>
        </div>
        <ReferenceScreenGrid screens={artistScreens} />
      </section>

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Producer references</p>
          <h2 className="mt-2 text-2xl font-semibold">Top reference screens</h2>
        </div>
        <ReferenceScreenGrid screens={producerScreens} />
      </section>

      {error ? <p className="text-sm text-[#ffb4a9]">{error}</p> : null}
    </div>
  );
}
