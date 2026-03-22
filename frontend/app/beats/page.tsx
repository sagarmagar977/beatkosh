"use client";

import { ShoppingCart, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { BeatListRow } from "@/components/beat-list-row";
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

type CartSummary = {
  items: Array<{ product_type: string; product_id: number }>;
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
  tag_names?: string[];
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
  const [cartBeatIds, setCartBeatIds] = useState<number[]>([]);
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

  useEffect(() => {
    const loadCart = async () => {
      if (!token) {
        setCartBeatIds([]);
        return;
      }
      try {
        const cart = await apiRequest<CartSummary>("/orders/cart/me/", { token });
        setCartBeatIds(cart.items.filter((item) => item.product_type === "beat").map((item) => item.product_id));
      } catch {
        // ignore cart badge sync failures here
      }
    };
    void loadCart();
  }, [token]);

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
        (beat.mood ?? "").toLowerCase().includes(q) ||
        (beat.tag_names ?? []).some((tag) => tag.toLowerCase().includes(q))
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
    window.setTimeout(() => setMessage(null), 2400);
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
      setCartBeatIds((current) => (current.includes(licenseModalBeat.id) ? current : [...current, licenseModalBeat.id]));
      await refreshCart();
      notify("Added to cart.");
      setLicenseModalBeat(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add beat to cart");
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <section className="surface-panel rounded-[30px] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Marketplace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Explore Beats</h1>
          </div>
          <button type="button" className="chip active">Fresh list</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {topFilters.map((item, idx) => <button key={item} type="button" className={`chip ${idx === 0 ? "active" : ""}`}>{item}</button>)}
        </div>
        <div className="mt-5 grid gap-3 xl:grid-cols-[280px_1fr_auto]">
          <input className="theme-input h-11 rounded-2xl px-4 text-sm outline-none" placeholder="Search beats, producers, moods, tags" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => <button key={item} type="button" className="chip">{item}</button>)}
          </div>
          <button type="button" className="chip">Latest</button>
        </div>
      </section>

      {!token ? <section className="theme-surface rounded-[26px] border-[#8b28ff]/20 p-4 text-sm theme-text-soft">Login is required to preview beats, save playlists, and use the cart.</section> : null}

      <section className="space-y-3">
        {loading ? <p className="theme-text-muted text-sm">Loading beats...</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {!loading && !error ? (
          <>
            {filtered.map((beat) => {
              const playbackUrl = resolveMediaUrl(beat.preview_audio_obj || beat.audio_file_obj);
              const isCurrent = currentTrack?.id === beat.id;
              const inCart = cartBeatIds.includes(beat.id);
              return (
                <BeatListRow
                  key={beat.id}
                  beat={beat}
                  artistHref={`/producers/${beat.producer}`}
                  detailHref={`/beats/${beat.id}`}
                  isCurrent={isCurrent}
                  isPlaying={isCurrent && isPlaying}
                  onPlay={() => handlePlayAttempt(beat, playbackUrl, isCurrent)}
                  actionLabel={inCart ? "Added to cart" : `Rs ${beat.base_price}`}
                  actionState={inCart ? "success" : "default"}
                  onAction={() => {
                    setLicenseModalBeat(beat);
                    setSelectedLicenseId(beat.licenses?.[0]?.id ?? null);
                  }}
                  message={notify}
                />
              );
            })}
            {filtered.length === 0 ? <p className="theme-text-muted text-sm">No beats found.</p> : null}
          </>
        ) : null}
      </section>

      {licenseModalBeat ? (
        <div className="theme-overlay fixed inset-0 z-[130] flex items-start justify-center px-4 pt-24 backdrop-blur-sm" onClick={() => setLicenseModalBeat(null)}>
          <section className="theme-floating w-full max-w-[980px] rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
              <div>
                <div className="mb-4 flex items-start justify-between"><div><h3 className="theme-text-main text-4xl font-semibold">Select License Type</h3><p className="theme-text-muted">Choose how you want to license this beat.</p></div></div>
                <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--line)" }}>
                  {licenseOptions.map((item) => (
                    <button key={item.id} type="button" onClick={() => setSelectedLicenseId(item.id)} className={`block w-full border-b px-4 py-3 text-left text-2xl ${selectedLicenseId === item.id ? "bg-[#8b28ff] text-white" : "theme-text-soft bg-transparent"}`} style={{ borderColor: "var(--line)" }}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <button type="button" onClick={() => setLicenseModalBeat(null)} className="theme-text-soft float-right inline-flex items-center justify-center"><X className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" /></button>
                <div className="mb-4 flex items-center gap-3">
                  <div className="theme-avatar flex h-20 w-20 items-center justify-center rounded-md text-sm font-bold">{licenseModalBeat.title.slice(0, 2).toUpperCase()}</div>
                  <div><p className="theme-text-main text-4xl font-semibold">{licenseModalBeat.title}</p><p className="theme-text-muted text-xl">{licenseModalBeat.producer_username}</p></div>
                </div>
                <div className="theme-surface-muted rounded-xl p-4 text-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <p className="theme-text-muted">License Usage</p><p className="theme-text-main text-right">Unlimited Streaming</p>
                    <p className="theme-text-muted">Format & Files</p><p className="theme-text-main text-right">{selectedLicenseInfo?.format || "WAV File"}</p>
                    <p className="theme-text-muted">Nature</p><p className="theme-text-main text-right">{selectedLicenseInfo?.nature || "Non-Exclusive"}</p>
                    <p className="theme-text-muted">Distribution</p><p className="theme-text-main text-right">{licenseModalBeat.non_exclusive_master_recordings || "Unlimited Copies"}</p>
                    <p className="theme-text-muted">Publishing Rights</p><p className="theme-text-main text-right">{selectedLicenseInfo?.nature === "Exclusive" ? (licenseModalBeat.exclusive_publishing_rights || "0%") : (licenseModalBeat.non_exclusive_publishing_rights || "0%")}</p>
                    <p className="theme-text-muted">License Period</p><p className="theme-text-main text-right">{licenseModalBeat.non_exclusive_license_period || "Unlimited"}</p>
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

      {message ? <div className="fixed right-6 top-24 z-[150] rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">{message}</div> : null}
    </div>
  );
}


