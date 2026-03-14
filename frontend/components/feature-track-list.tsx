"use client";

import Link from "next/link";

import { FeatureTrack } from "@/lib/reference";

const statusClass: Record<FeatureTrack["status"], string> = {
  live: "border-[#77d6c8]/35 bg-[#77d6c8]/12 text-[#9ee8dc]",
  in_progress: "border-[#f6b067]/30 bg-[#f6b067]/12 text-[#ffd2a2]",
  planned: "border-white/15 bg-white/5 text-white/72",
};

type Props = {
  tracks: FeatureTrack[];
};

export function FeatureTrackList({ tracks }: Props) {
  return (
    <div className="space-y-3">
      {tracks.map((track) => (
        <article key={track.key} className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">{track.title}</p>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.15em] ${statusClass[track.status]}`}>
              {track.status.replace("_", " ")}
            </span>
          </div>
          <p className="mt-2 text-xs text-white/55">Depends on: {track.backend_dependencies.join(" • ")}</p>
          <Link href={track.frontend_route} className="mt-3 inline-block rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/78 hover:bg-white/5">
            Open {track.frontend_route}
          </Link>
        </article>
      ))}
    </div>
  );
}
