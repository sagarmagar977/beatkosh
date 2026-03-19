"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { apiRequest } from "@/lib/api";

type License = { id: number; name: string; is_exclusive?: boolean; includes_stems?: boolean };
type Beat = {
  id: number;
  producer: number;
  producer_username: string;
  title: string;
  genre: string;
  beat_type?: string;
  mood?: string;
  bpm: number;
  base_price: string;
  licenses?: License[];
  storefront_flags?: { free_download?: boolean; stems_available?: boolean; exclusive_available?: boolean };
};
type RecommendationFeed = { based_on: string; beats: Beat[] };
type Producer = {
  producer_id: number;
  producer_name: string;
  username: string;
  headline?: string;
  genres?: string;
  trust_score?: number;
  badges?: string[];
  service_offerings?: string[];
  accepts_album_projects?: boolean;
  accepts_custom_singles?: boolean;
};

export default function HomePage() {
  const { token, user } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendationFeed | null>(null);
  const [producers, setProducers] = useState<Producer[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const [recData, producerData] = await Promise.all([
          apiRequest<RecommendationFeed>("/analytics/recommendations/beats/", { token }),
          apiRequest<Producer[]>("/account/producer-discovery/"),
        ]);
        setRecommendations(recData);
        setProducers(producerData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load BeatKosh home");
      }
    };
    void run();
  }, [token]);

  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-[34px] p-6 md:p-8">
        <p className="eyebrow">BeatKosh</p>
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr] xl:items-end">
          <div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Nepal&apos;s beat marketplace and custom production workspace.
            </h1>
            <p className="mt-4 max-w-3xl text-white/68">
              Buy ready-made beats with instant licensing, or hire a producer for a custom single, EP, or full album.
              The current product stays intact, but the experience now leads with the two journeys BeatKosh is built for.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/beats" className="brand-btn px-5 py-3 text-sm">
                Instant Beat Licensing
              </Link>
              <Link href="/projects" className="rounded-full border border-white/12 px-5 py-3 text-sm text-white/84 hover:bg-white/5">
                Hire for Custom Work
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <article className="rounded-[28px] border border-white/10 bg-[#0d1218] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Journey 01</p>
              <h2 className="mt-3 text-2xl font-semibold">Instant beat licensing</h2>
              <p className="mt-2 text-sm text-white/62">
                Browse beats, preview licensing options, compare stems and exclusive rights, and buy without leaving the marketplace flow.
              </p>
            </article>
            <article className="rounded-[28px] border border-white/10 bg-[#0d1218] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Journey 02</p>
              <h2 className="mt-3 text-2xl font-semibold">Custom single or full album</h2>
              <p className="mt-2 text-sm text-white/62">
                Send structured briefs, agree on milestones, review deliverables, and keep long-form collaboration inside BeatKosh.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="surface-panel rounded-[30px] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Recommended beats</p>
              <h2 className="mt-2 text-2xl font-semibold">Curated from your catalog behavior</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/62">
              {recommendations?.based_on ?? "catalog signals"}
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(recommendations?.beats ?? []).slice(0, 6).map((beat) => (
              <article key={beat.id} className="rounded-[24px] border border-white/10 bg-[#0d1218] p-4">
                <div className="h-24 rounded-2xl bg-gradient-to-br from-[#1c4138] via-[#10262c] to-[#1b1524]" />
                <Link href={`/beats/${beat.id}`} className="mt-3 block text-lg font-semibold hover:underline">
                  {beat.title}
                </Link>
                <p className="mt-1 text-sm text-white/60">
                  {beat.producer_username} | {beat.genre} | {beat.bpm} BPM
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
                  {beat.storefront_flags?.stems_available ? <span className="rounded-full border border-white/10 px-2 py-1">Stems</span> : null}
                  {beat.storefront_flags?.exclusive_available ? <span className="rounded-full border border-white/10 px-2 py-1">Exclusive</span> : null}
                  {beat.storefront_flags?.free_download ? <span className="rounded-full border border-white/10 px-2 py-1">Free MP3</span> : null}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-white/70">Rs {beat.base_price}</span>
                  <Link href={`/beats/${beat.id}`} className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/84 hover:bg-white/5">
                    View details
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Producers ready to hire</p>
          <h2 className="mt-2 text-2xl font-semibold">Trust-first discovery</h2>
          <div className="mt-5 space-y-3">
            {producers.slice(0, 5).map((producer) => (
              <article key={producer.producer_id} className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/producers/${producer.producer_id}`} className="font-semibold hover:underline">
                      {producer.producer_name || producer.username}
                    </Link>
                    <p className="mt-1 text-sm text-white/60">{producer.headline || producer.genres || "BeatKosh producer"}</p>
                  </div>
                  <span className="rounded-full border border-[#77d6c8]/25 bg-[#77d6c8]/10 px-3 py-1 text-xs text-[#9ee8dc]">
                    Trust {producer.trust_score ?? 0}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
                  {(producer.badges ?? []).slice(0, 3).map((badge) => (
                    <span key={badge} className="rounded-full border border-white/10 px-2 py-1">{badge}</span>
                  ))}
                </div>
                <p className="mt-3 text-sm text-white/62">
                  {(producer.service_offerings ?? []).slice(0, 2).join(" | ") || "Custom production available"}
                </p>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="surface-panel rounded-[30px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Execution-ready collaboration</p>
            <h2 className="mt-2 text-2xl font-semibold">BeatKosh keeps the marketplace and adds deeper studio work</h2>
          </div>
          <div className="flex gap-3 text-sm text-white/62">
            <span className="rounded-full border border-white/10 px-3 py-1.5">Milestone projects</span>
            <span className="rounded-full border border-white/10 px-3 py-1.5">Producer trust</span>
            <span className="rounded-full border border-white/10 px-3 py-1.5">Smart discovery</span>
          </div>
        </div>
        {user ? <p className="mt-4 text-sm text-white/58">Signed in as {user.username}. Your recommendations and trust-aware discovery are active.</p> : null}
      </section>

      {error ? <p className="text-sm text-[#ffb4a9]">{error}</p> : null}
    </div>
  );
}
