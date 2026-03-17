"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";

type ProducerProfile = {
  producer_name: string;
  bio: string;
  genres: string;
  verified: boolean;
  rating: string;
  total_sales: number;
};

type Beat = {
  id: number;
  producer: number;
  title: string;
  producer_username?: string;
  genre: string;
  bpm: number;
  key?: string | null;
  mood?: string | null;
  base_price: string;
};

export default function ProducerProfilePage() {
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);
  const [profile, setProfile] = useState<ProducerProfile | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const [profileData, allBeats] = await Promise.all([
          apiRequest<ProducerProfile>(`/account/producers/by-user/${userId}/`),
          apiRequest<Beat[]>("/beats/"),
        ]);
        setProfile(profileData);
        setBeats(allBeats.filter((beat) => beat.producer === userId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load producer profile");
      }
    };
    void run();
  }, [userId]);

  const producerName = profile?.producer_name || "Producer";
  const producerGenres = profile?.genres || "Genres not set";
  const producerBio = profile?.bio || "No bio yet.";
  const profileInitial = producerName.slice(0, 1).toUpperCase() || "P";
  const followerCount = profile?.total_sales ? profile.total_sales * 3 + 120 : 649;
  const monthlyPlays = profile?.total_sales ? profile.total_sales * 42 + 1500 : 24900;

  const formatInr = (raw: string) => {
    const num = Number(raw);
    if (Number.isNaN(num)) {
      return `?${raw}`;
    }
    return `?${new Intl.NumberFormat("en-IN").format(num)}`;
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[350px_1fr]">
      <aside className="space-y-4">
        <section className="surface-panel overflow-hidden rounded-2xl p-4">
          <Link href="/beats" className="text-xs text-white/60 hover:text-white hover:underline">
            Back to beats
          </Link>
          <div className="mt-3 flex justify-center">
            <div className="flex h-44 w-44 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-[#31224c] via-[#232739] to-[#10131d] text-6xl font-black text-white/90">
              {profileInitial}
            </div>
          </div>
          <div className="mt-4 text-center">
            <h1 className="inline-flex items-center gap-2 text-3xl font-semibold tracking-tight">
              {producerName}
              {profile?.verified ? <span className="rounded-full bg-[#6a40ff] px-2 py-0.5 text-xs">Verified</span> : null}
              <span className="rounded-full bg-[#f0b429] px-2 py-0.5 text-xs font-semibold text-[#1a1200]">PRO</span>
            </h1>
            <p className="mt-2 text-lg text-[#b48eff]">The Big Producer</p>
            <p className="mt-1 text-sm text-white/68">{producerGenres}</p>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-lg">??</p>
              <p className="text-lg font-semibold">{followerCount}</p>
              <p className="text-xs text-white/55">Followers</p>
            </div>
            <div>
              <p className="text-lg">?</p>
              <p className="text-lg font-semibold">{(monthlyPlays / 1000).toFixed(1)}k</p>
              <p className="text-xs text-white/55">Plays</p>
            </div>
            <div>
              <p className="text-lg">?</p>
              <p className="text-lg font-semibold">{beats.length}</p>
              <p className="text-xs text-white/55">Beats</p>
            </div>
            <div>
              <p className="text-lg">?</p>
              <p className="text-lg font-semibold">{profile?.verified ? "Yes" : "No"}</p>
              <p className="text-xs text-white/55">Verified</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <button type="button" className="brand-btn px-4 py-2.5 text-base">
              Follow
            </button>
            <button type="button" className="rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-white/85">
              Share
            </button>
          </div>
        </section>

        <section className="surface-panel rounded-2xl p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">Recognition</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-sm text-white/80">{(monthlyPlays / 1000).toFixed(1)}k+ Plays</p>
              <span className="text-xl">??</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-sm text-white/80">Trending Now</p>
              <span className="text-xl">?</span>
            </div>
          </div>
        </section>

        <section className="surface-panel rounded-2xl p-4">
          <h2 className="text-2xl font-semibold">About me</h2>
          <p className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm leading-6 text-white/76">{producerBio}</p>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm text-white/70">
            <span className="rounded-full border border-white/10 px-3 py-1">Instagram</span>
            <span className="rounded-full border border-white/10 px-3 py-1">YouTube</span>
          </div>
        </section>
      </aside>

      <section className="surface-panel rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-4xl font-semibold tracking-tight">Beats</h2>
          <span className="text-white/60">?</span>
        </div>
        <div className="mt-3 space-y-2">
          {beats.map((beat) => (
            <article key={beat.id} className="grid items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 md:grid-cols-[auto_1fr_auto]">
              <button type="button" className="h-10 w-10 rounded-full border border-white/20 bg-white/5 text-sm">
                ?
              </button>

              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-md border border-white/10 bg-gradient-to-br from-[#2a3546] to-[#11151d] text-sm font-bold text-white/80">
                  {beat.title.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <Link href={`/beats/${beat.id}`} className="text-2xl font-semibold tracking-tight hover:underline">
                    {beat.title}
                  </Link>
                  <p className="text-lg text-white/70">
                    {producerName} {" | "} {beat.bpm} BPM {" | "} {beat.key || "N/A"} {" | "} {beat.genre}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-self-end">
                <button type="button" className="brand-btn px-6 py-2.5 text-2xl font-semibold">
                  {formatInr(beat.base_price)}
                </button>
                <button type="button" className="px-2 py-1 text-white/65">
                  ?
                </button>
              </div>
            </article>
          ))}
          {beats.length === 0 ? <p className="text-base text-white/60">No beats uploaded yet.</p> : null}
        </div>
        {error ? <p className="mt-3 text-base text-rose-300">{error}</p> : null}
      </section>
    </div>
  );
}
