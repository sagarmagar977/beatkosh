"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { CatalogCardSkeleton } from "@/components/catalog-card-skeleton";
import { apiRequest, resolveMediaUrl } from "@/lib/api";

type SoundKit = {
  id: number;
  title: string;
  producer_username: string;
  kit_type: string;
  base_price: string;
  preview_audio_obj?: string | null;
  cover_art_obj?: string | null;
  tags?: string[];
};

export default function CatalogPage() {
  const [kits, setKits] = useState<SoundKit[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await apiRequest<SoundKit[]>("/soundkits/");
        setKits(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sound kits");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return kits;
    }
    return kits.filter((kit) => {
      return (
        kit.title.toLowerCase().includes(q) ||
        (kit.kit_type ?? "").toLowerCase().includes(q) ||
        kit.producer_username.toLowerCase().includes(q)
      );
    });
  }, [kits, query]);

  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-xl p-4">
        <h1 className="text-2xl font-semibold">Top Sound Kits</h1>
        <p className="mt-1 text-sm text-white/60">Real catalog data from backend sound-kit API.</p>
        <input
          className="mt-4 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 outline-none placeholder:text-white/35"
          placeholder="Search sound kits"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </section>

      <section className="surface-panel rounded-xl p-4">
        {loading ? (
          <>
            <p className="text-sm text-white/60">Loading sound kits...</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <CatalogCardSkeleton key={index} />
              ))}
            </div>
          </>
        ) : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {!loading && !error ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {filtered.map((kit) => {
              const cover = resolveMediaUrl(kit.cover_art_obj);
              const preview = resolveMediaUrl(kit.preview_audio_obj);
              return (
                <article key={kit.id} className="app-card p-3">
                  {cover ? (
                    <Image src={cover} alt={kit.title} width={320} height={96} className="h-24 w-full rounded-md object-cover" />
                  ) : (
                    <div className="h-24 rounded-md bg-gradient-to-br from-[#3a2f4b] to-[#6d4b1f]" />
                  )}
                  <p className="mt-3 font-semibold">{kit.title}</p>
                  <p className="text-xs text-white/55">
                    {kit.producer_username} • {kit.kit_type || "Sound Kit"}
                  </p>
                  {preview ? <audio controls className="mt-2 w-full" src={preview} /> : null}
                  <button type="button" className="brand-btn mt-3 w-full px-3 py-2 text-sm">
                    Rs {kit.base_price}
                  </button>
                </article>
              );
            })}
            {filtered.length === 0 ? <p className="text-sm text-white/60">No sound kits found.</p> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
