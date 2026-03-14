"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { apiRequest, resolveMediaUrl } from "@/lib/api";

type License = { id: number; name: string; includes_stems?: boolean; is_exclusive?: boolean };

type Beat = {
  id: number;
  producer: number;
  producer_username: string;
  title: string;
  genre: string;
  bpm: number;
  key?: string | null;
  mood?: string | null;
  base_price: string;
  preview_audio_obj?: string | null;
  audio_file_obj?: string | null;
  licenses?: License[];
};

export default function BeatDetailPage() {
  const params = useParams<{ id: string }>();
  const [beat, setBeat] = useState<Beat | null>(null);
  const [related, setRelated] = useState<Beat[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const beatId = Number(params.id);
        const [detail, all] = await Promise.all([apiRequest<Beat>(`/beats/${beatId}/`), apiRequest<Beat[]>("/beats/")]);
        setBeat(detail);
        setRelated(all.filter((item) => item.id !== beatId).slice(0, 8));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load track details");
      }
    };
    void run();
  }, [params.id]);

  const previewUrl = useMemo(() => resolveMediaUrl(beat?.preview_audio_obj || beat?.audio_file_obj), [beat]);

  return (
    <div className="grid gap-5 lg:grid-cols-[330px_1fr]">
      <aside className="surface-panel rounded-xl p-4">
        <Link href="/beats" className="text-xs text-white/65 hover:underline">
          Back to beats
        </Link>
        <div className="mt-3 h-44 rounded-md bg-gradient-to-br from-[#5f153d] to-[#1f202b]" />
        <h1 className="mt-3 text-xl font-semibold">{beat?.title ?? "Loading..."}</h1>
        <p className="text-sm text-white/60">
          by{" "}
          {beat ? (
            <Link href={`/producers/${beat.producer}`} className="underline-offset-2 hover:underline">
              {beat.producer_username}
            </Link>
          ) : (
            "..."
          )}
        </p>
        <p className="mt-2 text-sm text-white/65">
          {beat?.bpm ?? "--"} BPM • {beat?.key || "N/A"} • {beat?.genre || "--"}
        </p>
        {previewUrl ? <audio controls className="mt-3 w-full" src={previewUrl} /> : null}
      </aside>

      <section className="space-y-5">
        <section className="surface-panel rounded-xl p-4">
          <h2 className="text-lg font-semibold">License Options</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {(beat?.licenses ?? []).map((license) => (
              <article key={license.id} className="app-card p-3">
                <p className="font-semibold">{license.name}</p>
                <p className="mt-1 text-xs text-white/60">
                  {license.includes_stems ? "Includes stems" : "Standard"}
                  {license.is_exclusive ? " • Exclusive" : ""}
                </p>
                <button type="button" className="brand-btn mt-3 w-full px-3 py-2 text-sm">
                  Rs {beat?.base_price ?? "--"}
                </button>
              </article>
            ))}
            {(beat?.licenses ?? []).length === 0 ? <p className="text-sm text-white/60">No licenses configured yet.</p> : null}
          </div>
        </section>

        <section className="surface-panel rounded-xl p-4">
          <h2 className="text-lg font-semibold">Related Tracks</h2>
          <div className="mt-3 space-y-2">
            {related.map((item) => (
              <article key={item.id} className="rounded-md border border-white/10 bg-[#131625] px-3 py-2">
                <Link href={`/beats/${item.id}`} className="font-medium hover:underline">
                  {item.title}
                </Link>
                <p className="text-xs text-white/60">
                  {item.producer_username} • {item.bpm} BPM • {item.genre}
                </p>
              </article>
            ))}
            {related.length === 0 ? <p className="text-sm text-white/60">No related tracks yet.</p> : null}
          </div>
        </section>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </section>
    </div>
  );
}
