"use client";

import { Pause, Play, ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { useCart } from "@/context/cart-context";
import { usePlayer } from "@/context/player-context";
import { apiRequest, resolveMediaUrl } from "@/lib/api";

type License = {
  id: number;
  name: string;
  includes_stems?: boolean;
  is_exclusive?: boolean;
  includes_wav?: boolean;
};

type LicenseOption = {
  id: number;
  label: string;
  price: string;
  nature: string;
  format: string;
};

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
  cover_art_obj?: string | null;
  play_count?: number;
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
  licenses?: License[];
};

const filters = ["Beat Type", "Moods", "Tempo", "Genre", "Keys", "Instruments", "Price"];
const topFilters = ["Trending Beats", "Wav under Rs999", "Wav + Stems under Rs1,999", "Beats with Exclusive"];

export default function BeatsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { refreshCart } = useCart();
  const [beats, setBeats] = useState<Beat[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [licenseModalBeat, setLicenseModalBeat] = useState<Beat | null>(null);
  const [licenseCatalog, setLicenseCatalog] = useState<License[]>([]);
  const [selectedLicenseId, setSelectedLicenseId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { currentTrack, isPlaying, playTrack, togglePlay, canPlay } = usePlayer();

  useEffect(() => {
    const run = async () => {
      try {
        const [beatData, licenseData] = await Promise.all([
          apiRequest<Beat[]>("/beats/"),
          apiRequest<License[]>("/beats/licenses/"),
        ]);
        setBeats(beatData);
        setLicenseCatalog(licenseData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load beats");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return beats;
    }
    return beats.filter((beat) => {
      return (
        beat.title.toLowerCase().includes(q) ||
        beat.producer_username.toLowerCase().includes(q) ||
        beat.genre.toLowerCase().includes(q) ||
        (beat.mood ?? "").toLowerCase().includes(q)
      );
    });
  }, [beats, query]);

  const licenseOptions = useMemo(() => {
    if (!licenseModalBeat) {
      return [] as LicenseOption[];
    }

    const buildOption = (license: License): LicenseOption => ({
      id: license.id,
      label: license.name.toUpperCase(),
      price: license.is_exclusive
        ? licenseModalBeat.exclusive_license_fee || licenseModalBeat.base_price
        : license.includes_stems
          ? licenseModalBeat.non_exclusive_stems_fee || licenseModalBeat.base_price
          : licenseModalBeat.non_exclusive_wav_fee || licenseModalBeat.base_price,
      nature: license.is_exclusive ? "Exclusive" : "Non-Exclusive",
      format: license.includes_stems ? "WAV & STEMS File" : "WAV File",
    });

    if (licenseModalBeat.licenses && licenseModalBeat.licenses.length > 0) {
      return licenseModalBeat.licenses.map(buildOption);
    }

    const fallback: LicenseOption[] = [];
    const findCatalogLicense = (matcher: (license: License) => boolean) => licenseCatalog.find(matcher);

    if (licenseModalBeat.non_exclusive_wav_enabled !== false) {
      const wav = findCatalogLicense((license) => !license.is_exclusive && !license.includes_stems && license.includes_wav !== false);
      if (wav) fallback.push(buildOption(wav));
    }
    if (licenseModalBeat.non_exclusive_stems_enabled) {
      const stems = findCatalogLicense((license) => !license.is_exclusive && Boolean(license.includes_stems));
      if (stems) fallback.push(buildOption(stems));
    }
    if (licenseModalBeat.exclusive_enabled) {
      const exclusive = findCatalogLicense((license) => Boolean(license.is_exclusive));
      if (exclusive) fallback.push(buildOption(exclusive));
    }

    return fallback;
  }, [licenseCatalog, licenseModalBeat]);

  useEffect(() => {
    if (licenseOptions.length > 0 && !licenseOptions.some((item) => item.id === selectedLicenseId)) {
      setSelectedLicenseId(licenseOptions[0].id);
    }
  }, [licenseOptions, selectedLicenseId]);

  const selectedLicenseInfo = licenseOptions.find((item) => item.id === selectedLicenseId) ?? licenseOptions[0];

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2200);
  };

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
      playCount: beat.play_count,
      key: beat.key,
      genre: beat.genre,
      price: beat.base_price,
      coverText: beat.title,
      coverUrl: resolveMediaUrl(beat.cover_art_obj),
      beatUrl: `/beats/${beat.id}`,
      audioUrl: playbackUrl,
    });
  };

  const handleAddToCart = async () => {
    if (!token) {
      router.push("/auth/login");
      return;
    }
    if (!licenseModalBeat || !selectedLicenseId) {
      notify("Choose a license first.");
      return;
    }
    try {
      await apiRequest("/orders/cart/items/", {
        method: "POST",
        token,
        body: {
          product_type: "beat",
          product_id: licenseModalBeat.id,
          license_id: selectedLicenseId,
        },
      });
      await refreshCart();
      notify("Beat added to cart successfully.");
      setLicenseModalBeat(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add beat to cart");
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <section className="surface-panel rounded-xl p-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Explore Beats</h1>
          <button type="button" className="chip active">Refresh</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {topFilters.map((item, idx) => <button key={item} type="button" className={`chip ${idx === 0 ? "active" : ""}`}>{item}</button>)}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[220px_1fr_auto]">
          <input className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 outline-none placeholder:text-white/35" placeholder="Search beats" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => <button key={item} type="button" className="chip">{item}</button>)}
          </div>
          <button type="button" className="chip">Latest</button>
        </div>
      </section>

      {!token ? <section className="surface-panel rounded-xl border border-[#8b28ff]/20 bg-[#141826] p-4 text-sm text-white/75">Login is required to preview beats and use the cart.</section> : null}

      <section className="surface-panel rounded-xl p-4">
        {loading ? <p className="text-sm text-white/60">Loading beats...</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {!loading && !error ? (
          <div className="space-y-2">
            {filtered.map((beat) => {
              const playbackUrl = resolveMediaUrl(beat.preview_audio_obj || beat.audio_file_obj);
              const isCurrent = currentTrack?.id === beat.id;
              return (
                <article key={beat.id} className="grid grid-cols-1 gap-3 rounded-lg border border-white/10 bg-[#131625] px-3 py-3 lg:grid-cols-[1.3fr_auto_auto]">
                  <div className="flex items-start gap-3">
                    <button type="button" onClick={() => handlePlayAttempt(beat, playbackUrl, isCurrent)} title={!token ? "Login to preview beats" : playbackUrl ? "Play preview" : "Preview unavailable"} className={`mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm ${isCurrent && isPlaying ? "border-[#8b28ff] bg-[#8b28ff] text-white" : "border-white/20 bg-white/5 text-white/85"} ${!token ? "cursor-pointer border-white/10 text-white/45" : ""}`}>
                      {isCurrent && isPlaying ? <Pause className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" /> : <Play className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
                    </button>
                    <div>
                      <p className="font-semibold">{beat.title}</p>
                      <p className="text-xs text-white/55"><Link href={`/producers/${beat.producer}`} className="underline-offset-2 hover:underline">{beat.producer_username}</Link> | {beat.bpm} BPM | {beat.key || "N/A"} | {beat.genre}</p>
                      <div className="mt-2"><Link href={`/beats/${beat.id}`} className="text-xs text-[#b78cff] hover:underline">Open track details</Link></div>
                    </div>
                  </div>
                  <div className="hidden items-center gap-1 md:flex">
                    {beat.mood ? <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/65">{beat.mood}</span> : null}
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/65">{beat.genre}</span>
                  </div>
                  <button type="button" onClick={() => { setLicenseModalBeat(beat); setSelectedLicenseId(beat.licenses?.[0]?.id ?? null); }} className="brand-btn inline-flex h-fit items-center gap-2 px-3 py-2 text-xs">
                    <ShoppingCart className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                    Rs {beat.base_price}
                  </button>
                </article>
              );
            })}
            {filtered.length === 0 ? <p className="text-sm text-white/60">No beats found.</p> : null}
          </div>
        ) : null}
      </section>

      {licenseModalBeat ? (
        <div className="fixed inset-0 z-[130] flex items-start justify-center bg-black/70 px-4 pt-24 backdrop-blur-sm" onClick={() => setLicenseModalBeat(null)}>
          <section className="w-full max-w-[980px] rounded-2xl border border-white/15 bg-[#1d1f2a] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
              <div>
                <div className="mb-4 flex items-start justify-between"><div><h3 className="text-4xl font-semibold">Select License Type</h3><p className="text-white/65">Understand Licensing here!</p></div></div>
                <div className="overflow-hidden rounded-xl border border-white/10">
                  {licenseOptions.map((item) => (
                    <button key={item.id} type="button" onClick={() => setSelectedLicenseId(item.id)} className={`block w-full border-b border-white/10 px-4 py-3 text-left text-2xl ${selectedLicenseId === item.id ? "bg-[#8b28ff] text-white" : "bg-transparent text-white/90"}`}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <button type="button" onClick={() => setLicenseModalBeat(null)} className="float-right inline-flex items-center justify-center text-white/70"><X className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" /></button>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-20 w-20 items-center justify-center rounded-md border border-white/10 bg-gradient-to-br from-[#2a3546] to-[#11151d] text-sm font-bold text-white/80">{licenseModalBeat.title.slice(0, 2).toUpperCase()}</div>
                  <div><p className="text-4xl font-semibold">{licenseModalBeat.title}</p><p className="text-xl text-white/70">{licenseModalBeat.producer_username}</p></div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <p className="text-white/70">License Usage</p><p className="text-right">Unlimited Streaming</p>
                    <p className="text-white/70">Format & Files</p><p className="text-right">{selectedLicenseInfo?.format || "WAV File"}</p>
                    <p className="text-white/70">Nature</p><p className="text-right">{selectedLicenseInfo?.nature || "Non-Exclusive"}</p>
                    <p className="text-white/70">Distribution</p><p className="text-right">{licenseModalBeat.non_exclusive_master_recordings || "Unlimited Copies"}</p>
                    <p className="text-white/70">Publishing Rights</p><p className="text-right">{selectedLicenseInfo?.nature === "Exclusive" ? (licenseModalBeat.exclusive_publishing_rights || "0%") : (licenseModalBeat.non_exclusive_publishing_rights || "0%")}</p>
                    <p className="text-white/70">License Period</p><p className="text-right">{licenseModalBeat.non_exclusive_license_period || "Unlimited"}</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={() => void handleAddToCart()} className="brand-btn inline-flex items-center gap-2 px-8 py-3 text-3xl font-semibold">
                    <ShoppingCart className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                    Rs {selectedLicenseInfo?.price || licenseModalBeat.base_price}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {message ? <div className="fixed bottom-24 right-6 z-[140] rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">{message}</div> : null}
    </div>
  );
}
