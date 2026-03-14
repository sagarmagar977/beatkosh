"use client";

import Image from "next/image";

import { ReferenceScreen, toProxyImageUrl } from "@/lib/reference";

type Props = {
  screens: ReferenceScreen[];
};

export function ReferenceScreenGrid({ screens }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {screens.map((screen) => (
        <article key={`${screen.role}-${screen.slug}`} className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0d1218]">
          <div className="relative h-44 w-full">
            <Image
              src={toProxyImageUrl(screen.image_url)}
              alt={screen.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="space-y-3 p-4">
            <p className="text-sm font-medium text-white">{screen.title}</p>
            <p className="text-xs text-white/52">{screen.file_name}</p>
            <div className="flex flex-wrap gap-2">
              {screen.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-white/70">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
