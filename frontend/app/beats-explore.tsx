"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { usePlayer } from "@/context/player-context";
import { apiRequest, resolveMediaUrl } from "@/lib/api";

type Beat = {
  id: number;
  producer: number;
  title: string;
  producer_username: string;
  genre: string;
  bpm: number;
  key?: string | null;
  mood?: string | null;
  base_price: string;
  preview_audio_obj?: string | null;
  audio_file_obj?: string | null;
  non_exclusive_wav_enabled?: boolean;
  non_exclusive_wav_fee?: string;
  non_exclusive_stems_enabled?: boolean;
  non_exclusive_stems_fee?: string;
  exclusive_enabled?: boolean;
  exclusive_license_fee?: string;
  non_exclusive_publishing_rights?: string;
  non_exclusive_master_recordings?: string;
  non_exclusive_license_period?: string;
  exclusive_publishing_rights?: string;
};

type LicenseKey = "wav" | "stems" | "exclusive";

const filters = ["Beat Type", "Moods", "Tempo", "Genre", "Keys", "Instruments", "Price"];
const topFilters = ["Trending Beats", "Wav under Rs999", "Wav + Stems under Rs1,999", "Beats with Exclusive"];

export function BeatsExplorePage({
  title,
  endpoint,
  genreFilter,
}: {
  title: string;
  endpoint: string;
  genreFilter?: string | null;
}) {
  const router = useRouter();
  const { token } = useAuth();
  const [beats, setBeats] = useState<Beat[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [licenseModalBeat, setLicenseModalBeat] = useState<Beat | null>(null);
  const [selectedLicense, setSelectedLicense] = useState<LicenseKey>("wav");
  const { currentTrack, isPlaying, playTrack, togglePlay, canPlay } = usePlayer();

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const data = await apiRequest<Beat[]>(endpoint);
        setBeats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load beats");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [endpoint]);

  const filtered = useMemo(() => {
    const base = genreFilter ? beats.filter((beat) => beat.genre === genreFilter) : beats;
    const q = query.trim().toLowerCase();
    if (!q) {
      return base;
    }
    return base.filter((beat) => {
      return (
        beat.title.toLowerCase().includes(q) ||
        beat.producer_username.toLowerCase().includes(q) ||
        beat.genre.toLowerCase().includes(q) ||
        (beat.mood ?? "").toLowerCase().includes(q)
      );
    });
  }, [beats, genreFilter, query]);

  const licenseOptions = useMemo(() => {
    if (!licenseModalBeat) {
      return [] as Array<{ key: LicenseKey; label: string; price: string; nature: string; format: string }>;
    }
    const rows: Array<{ key: LicenseKey; label: string; price: string; nature: string; format: string }> = [];
    if (licenseModalBeat.non_exclusive_wav_enabled !== false) {
      rows.push({
        key: "wav",
        label: "WAV",
        price: licenseModalBeat.non_exclusive_wav_fee || licenseModalBeat.base_price,
        nature: "Non-Exclusive",
        format: "WAV File",
      });
    }
    if (licenseModalBeat.non_exclusive_stems_enabled) {
      rows.push({
        key: "stems",
        label: "WAV + STEMS",
        price: licenseModalBeat.non_exclusive_stems_fee || licenseModalBeat.base_price,
        nature: "Non-Exclusive",
        format: "WAV + STEMS",
      });
    }
    if (licenseModalBeat.exclusive_enabled) {
      rows.push({
        key: "exclusive",
        label: "EXCLUSIVE",
        price: licenseModalBeat.exclusive_license_fee || licenseModalBeat.base_price,
        nature: "Exclusive",
        format: "All rights transfer",
      });
    }
    if (rows.length === 0) {
      rows.push({ key: "wav", label: "WAV", price: licenseModalBeat.base_price, nature: "Non-Exclusive", format: "WAV File" });
    }
    return rows;
  }, [licenseModalBeat]);

  const selectedLicenseInfo = licenseOptions.find((item) => item.key === selectedLicense) ?? licenseOptions[0];

  useEffect(() => {
    if (licenseOptions.length > 0 && !licenseOptions.some((item) => item.key === selectedLicense)) {
      setSelectedLicense(licenseOptions[0].key);
    }
  }, [licenseOptions, selectedLicense]);

  const handlePlayAttempt = (beat: Beat, playbackUrl: string, isCurrent: boolean) => {
    if (!token || !canPlay) {
      router.push("/auth/login");
      return;
    }
    if (!playbackUrl) {
      return;
    }
    if (isCurrent) {
      void togglePlay();
      return;
    }
    void playTrack({
      id: beat.id,
      title: beat.title,
      artist: beat.producer_username,
      bpm: beat.bpm,
      key: beat.key,
      genre: beat.genre,
      price: beat.base_price,
      coverText: beat.title,
      audioUrl: playbackUrl,
    });
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-xl p-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <button type="button" className="chip active">
            Refresh
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {topFilters.map((item, idx) => (
            <button key={item} type="button" className={`chip ${idx === 0 ? "active" : ""}`}>
              {item}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[220px_1fr_auto]">
          <input
            className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 outline-none placeholder:text-white/35"
            placeholder="Search beats"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button key={item} type="button" className="chip">
                {item}
              </button>
            ))}
          </div>
          <button type="button" className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs text-white/80">
            Latest
          </button>
        </div>
      </section>

      {!token ? (
        <section className="surface-panel rounded-xl border border-[#8b28ff]/20 bg-[#141826] p-4 text-sm text-white/75">
          Login is required to preview beats. Once you sign in, playback keeps working until your session expires or you log out.
        </section>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {!loading && !error ? (
        <div className="space-y-2">
          {filtered.map((beat) => {
            const playbackUrl = resolveMediaUrl(beat.preview_audio_obj || beat.audio_file_obj);
            const isCurrent = currentTrack?.id === beat.id;
            return (
              <article
                key={beat.id}
                className="grid grid-cols-1 gap-3 rounded-lg border border-white/10 bg-[#131625] px-3 py-3 lg:grid-cols-[1.3fr_auto_auto]"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handlePlayAttempt(beat, playbackUrl, isCurrent)}
                    title={!token ? "Login to preview beats" : playbackUrl ? "Play preview" : "Preview unavailable"}
                    className={`mt-1 h-10 w-10 rounded-full border text-sm ${
                      isCurrent && isPlaying ? "border-[#8b28ff] bg-[#8b28ff] text-white" : "border-white/20 bg-white/5 text-white/85"
                    } ${!token ? "cursor-pointer border-white/10 text-white/45" : ""}`}
                  >
                    {isCurrent && isPlaying ? "II" : ">"}
                  </button>
                  <div>
                    <p className="font-semibold">{beat.title}</p>
                    <p className="text-xs text-white/55">
                      <Link href={`/producers/${beat.producer}`} className="underline-offset-2 hover:underline">
                        {beat.producer_username}
                      </Link>{" "}
                      | {beat.bpm} BPM | {beat.key || "N/A"} | {beat.genre}
                    </p>
                    <div className="mt-2">
                      <Link href={`/beats/${beat.id}`} className="text-xs text-[#b78cff] hover:underline">
                        Open track details
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="hidden items-center gap-1 md:flex">
                  {beat.mood ? (
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/65">{beat.mood}</span>
                  ) : null}
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/65">{beat.genre}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLicenseModalBeat(beat);
                    setSelectedLicense("wav");
                  }}
                  className="brand-btn h-fit px-3 py-2 text-xs"
                >
                  Rs {beat.base_price}
                </button>
              </article>
            );
          })}
          {filtered.length === 0 ? <p className="text-sm text-white/60">No beats found.</p> : null}
        </div>
      ) : null}

      {licenseModalBeat ? (
        <div
          className="fixed inset-0 z-[130] flex items-start justify-center bg-black/70 px-4 pt-24 backdrop-blur-sm"
          onClick={() => setLicenseModalBeat(null)}
        >
          <section
            className="w-full max-w-[960px] rounded-2xl border border-white/15 bg-[#1d1f2a] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
              <div>
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-4xl font-semibold">Select License Type</h3>
                    <p className="text-white/65">Understand Licensing here!</p>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-white/10">
                  {licenseOptions.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedLicense(item.key)}
                      className={`block w-full border-b border-white/10 px-4 py-3 text-left text-2xl ${
                        selectedLicense === item.key ? "bg-[#4593f5] text-white" : "bg-transparent text-white/90"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm uppercase tracking-[0.3em] text-white/50">Selected</p>
                  <button
                    type="button"
                    onClick={() => setLicenseModalBeat(null)}
                    className="rounded-md border border-white/15 px-2 py-1 text-xs text-white/75 hover:bg-white/5"
                  >
                    Close
                  </button>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#131625] p-5">
                  <p className="text-3xl font-semibold">{selectedLicenseInfo?.label}</p>
                  <p className="mt-1 text-sm text-white/60">{selectedLicenseInfo?.nature} | {selectedLicenseInfo?.format}</p>
                  <p className="mt-4 text-4xl font-semibold">Rs {selectedLicenseInfo?.price}</p>
                  <button type="button" className="brand-btn mt-5 w-full px-4 py-3 text-sm">Add to cart</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
