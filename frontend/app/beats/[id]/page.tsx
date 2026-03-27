"use client";

import { ArrowLeft, BadgeCheck, Heart, Pause, Play, ShoppingCart, Share2, Shield, SlidersHorizontal, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { BeatListRow } from "@/components/beat-list-row";
import { useCart } from "@/context/cart-context";
import { usePlayer } from "@/context/player-context";
import { apiRequest, resolveMediaUrl } from "@/lib/api";
import type { SavedBeatEntry } from "@/lib/beat-library";

type License = {
  id: number;
  name: string;
  includes_stems?: boolean;
  is_exclusive?: boolean;
  includes_wav?: boolean;
  description?: string;
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
  producer_username: string;
  title: string;
  genre: string;
  beat_type?: string | null;
  instrument_type?: string | null;
  instrument_types?: string[] | null;
  bpm: number;
  key?: string | null;
  mood?: string | null;
  base_price: string;
  description?: string;
  commercial_mode?: string;
  preview_audio_obj?: string | null;
  audio_file_obj?: string | null;
  cover_art_obj?: string | null;
  created_at?: string;
  tag_names?: string[];
  licenses?: License[];
  like_count?: number;
  play_count?: number;
  storefront_flags?: { free_download?: boolean; stems_available?: boolean; exclusive_available?: boolean; wav_available?: boolean };
  protection_status?: string;
  fingerprint_status?: string;
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

type CartSummary = {
  items: Array<{ product_type: string; product_id: number }>;
};

type TrustSummary = {
  trust_score: number;
  badges: string[];
  availability: { custom_single: boolean; album: boolean };
};

function formatDate(raw?: string) {
  if (!raw) return "-";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? raw
    : parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function resolveLicensePrice(targetBeat: Beat, license: License) {
  if (license.is_exclusive) {
    return targetBeat.exclusive_license_fee || targetBeat.base_price;
  }
  if (license.includes_stems) {
    return targetBeat.non_exclusive_stems_fee || targetBeat.base_price;
  }
  return targetBeat.non_exclusive_wav_fee || targetBeat.base_price;
}

export default function BeatDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { refreshCart } = useCart();
  const { currentTrack, isPlaying, playTrack, togglePlay, canPlay } = usePlayer();
  const [beat, setBeat] = useState<Beat | null>(null);
  const [related, setRelated] = useState<Beat[]>([]);
  const [trust, setTrust] = useState<TrustSummary | null>(null);
  const [licenseCatalog, setLicenseCatalog] = useState<License[]>([]);
  const [selectedLicenseId, setSelectedLicenseId] = useState<number | null>(null);
  const [licenseModalBeat, setLicenseModalBeat] = useState<Beat | null>(null);
  const [modalSelectedLicenseId, setModalSelectedLicenseId] = useState<number | null>(null);
  const [cartBeatIds, setCartBeatIds] = useState<number[]>([]);
  const [liked, setLiked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const beatId = Number(params.id);
        const [detail, licenseData] = await Promise.all([
          apiRequest<Beat>(`/beats/${beatId}/`),
          apiRequest<License[]>("/beats/licenses/"),
        ]);
        setBeat(detail);
        setLicenseCatalog(licenseData);
        setSelectedLicenseId(detail.licenses?.[0]?.id ?? null);
        const [relatedData, trustData] = await Promise.all([
          apiRequest<Beat[]>(`/analytics/similar/beats/${beatId}/`),
          apiRequest<TrustSummary>(`/account/producer-trust/${detail.producer}/`),
        ]);
        setRelated(relatedData);
        setTrust(trustData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load track details");
      }
    };
    void run();
  }, [params.id]);

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

  const coverUrl = useMemo(() => resolveMediaUrl(beat?.cover_art_obj), [beat]);
  const selectedLicense = useMemo(
    () => beat?.licenses?.find((license) => license.id === selectedLicenseId) ?? beat?.licenses?.[0] ?? null,
    [beat, selectedLicenseId],
  );

  const licenseOptions = useMemo(() => {
    if (!licenseModalBeat) {
      return [] as LicenseOption[];
    }

    const buildOption = (license: License): LicenseOption => ({
      id: license.id,
      label: license.name.toUpperCase(),
      price: resolveLicensePrice(licenseModalBeat, license),
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
    if (licenseOptions.length > 0 && !licenseOptions.some((item) => item.id === modalSelectedLicenseId)) {
      setModalSelectedLicenseId(licenseOptions[0].id);
    }
  }, [licenseOptions, modalSelectedLicenseId]);

  const selectedLicenseInfo = licenseOptions.find((item) => item.id === modalSelectedLicenseId) ?? licenseOptions[0] ?? null;

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 1800);
  };

  const handlePlay = async (target: Beat, source: string) => {
    const playbackUrl = resolveMediaUrl(target.preview_audio_obj || target.audio_file_obj);
    if (!playbackUrl) {
      notify("Preview unavailable.");
      return;
    }
    if (!token || !canPlay) {
      router.push("/auth/login");
      return;
    }
    const isCurrent = currentTrack?.id === target.id;
    if (isCurrent) {
      await togglePlay();
      return;
    }
    await playTrack({
      id: target.id,
      title: target.title,
      artist: target.producer_username,
      bpm: target.bpm,
      playCount: target.play_count,
      key: target.key,
      genre: target.genre,
      mood: target.mood,
      price: target.base_price,
      coverText: target.title,
      coverUrl: resolveMediaUrl(target.cover_art_obj),
      beatUrl: `/beats/${target.id}`,
      defaultLicenseId: target.licenses?.[0]?.id ?? null,
      audioUrl: playbackUrl,
      source,
    });
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    notify("Beat link copied.");
  };

  const handleLike = async () => {
    if (!token) {
      router.push("/auth/login");
      return;
    }
    if (!beat) return;
    if (liked) {
      await apiRequest(`/account/likes/beats/${beat.id}/`, { method: "DELETE", token });
      setLiked(false);
      setBeat((current) =>
        current ? { ...current, like_count: Math.max((current.like_count ?? 1) - 1, 0) } : current,
      );
      notify("Removed from likes.");
      return;
    }
    await apiRequest(`/account/likes/beats/${beat.id}/`, { method: "POST", token, body: {} });
    setLiked(true);
    setBeat((current) => (current ? { ...current, like_count: (current.like_count ?? 0) + 1 } : current));
    notify("Added to likes.");
  };

  const openLicenseModal = (targetBeat: Beat, preferredLicenseId?: number | null) => {
    setLicenseModalBeat(targetBeat);
    setModalSelectedLicenseId(preferredLicenseId ?? targetBeat.licenses?.[0]?.id ?? null);
  };

  const handleModalAddToCart = async () => {
    if (!token) {
      router.push("/auth/login");
      return;
    }
    if (!licenseModalBeat || !modalSelectedLicenseId) {
      notify("Choose a license first.");
      return;
    }
    await apiRequest("/orders/cart/items/", {
      method: "POST",
      token,
      body: { product_type: "beat", product_id: licenseModalBeat.id, license_id: modalSelectedLicenseId },
    });
    setCartBeatIds((current) => (current.includes(licenseModalBeat.id) ? current : [...current, licenseModalBeat.id]));
    await refreshCart();
    notify("Added to cart.");
    setLicenseModalBeat(null);
  };

  const isCurrentBeat = currentTrack?.id === beat?.id;
  const currentBeatInCart = beat ? cartBeatIds.includes(beat.id) : false;

  return (
    <div className="beat-detail-page space-y-5 pb-32">
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <aside className="rounded-[28px] border border-[#7f1717] bg-[linear-gradient(180deg,#4b0f10_0%,#250307_58%,#1b0205_100%)] p-5 text-white shadow-[0_32px_90px_rgba(0,0,0,0.35)]">
          <Link href="/beats" className="inline-flex items-center gap-2 text-xs text-white/70 hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
            Back to beats
          </Link>
          <div className="mt-4 overflow-hidden rounded-[22px] border border-white/10 bg-black/20">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt={beat?.title || "Beat cover"} className="h-[320px] w-full object-cover" />
            ) : (
              <div className="flex h-[320px] items-center justify-center bg-gradient-to-br from-[#661114] via-[#3a0a0d] to-[#180608] text-5xl font-black text-white/80">
                {(beat?.title || "BK").slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="mt-5 text-center">
            <h1 className="text-3xl font-semibold">{beat?.title ?? "Loading..."}</h1>
            <p className="mt-2 text-base text-white/78">
              {beat ? (
                <Link href={`/producers/${beat.producer}`} className="inline-flex items-center gap-2 rounded-full bg-[#6d3e14] px-3 py-1 hover:underline">
                  <BadgeCheck className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                  {beat.producer_username}
                </Link>
              ) : (
                "..."
              )}
            </p>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2 text-center text-sm">
            <button
              type="button"
              disabled={!beat}
              onClick={() => beat && void handlePlay(beat, "beat-detail-hero")}
              className="inline-flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 px-2 py-3 disabled:opacity-50"
            >
              {isCurrentBeat && isPlaying ? <><Pause className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" /><span className="mt-1">Pause</span></> : <><Play className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" /><span className="mt-1">Play</span></>}
            </button>
            <button type="button" onClick={() => void handleLike()} className="inline-flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 px-2 py-3">
              <Heart className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              <span className="mt-1">Like</span>
              <div className="mt-1 text-white/70">{beat?.like_count ?? 0}</div>
            </button>
            <button type="button" onClick={() => void handleShare()} className="inline-flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 px-2 py-3">
              <Share2 className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              <span className="mt-1">Share</span>
            </button>
            <button
              type="button"
              disabled={!beat}
              onClick={() => beat && openLicenseModal(beat, selectedLicenseId)}
              className="inline-flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 px-2 py-3 disabled:opacity-50"
            >
              <ShoppingCart className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              <span className="mt-1">{currentBeatInCart ? "Added" : "Cart"}</span>
            </button>
          </div>
          <button
            type="button"
            disabled={!beat}
            onClick={() => beat && openLicenseModal(beat, selectedLicenseId)}
            className="brand-btn mt-5 w-full px-4 py-3 text-lg font-semibold disabled:opacity-50"
          >
            {currentBeatInCart ? "Added to cart" : `Rs ${selectedLicense ? resolveLicensePrice(beat, selectedLicense) : beat?.base_price ?? "--"}`}
          </button>

          <div className="mt-6 grid gap-3 text-sm text-white/82">
            <div className="grid grid-cols-[84px_1fr] gap-3"><span className="text-white/58">Published</span><span>{formatDate(beat?.created_at)}</span></div>
            <div className="grid grid-cols-[84px_1fr] gap-3"><span className="text-white/58">Plays</span><span>{beat?.play_count ?? 0}</span></div>
            <div className="grid grid-cols-[84px_1fr] gap-3"><span className="text-white/58">BPM</span><span>{beat?.bpm ?? "-"}</span></div>
            <div className="grid grid-cols-[84px_1fr] gap-3"><span className="text-white/58">Key</span><span>{beat?.key || "-"}</span></div>
            <div className="grid grid-cols-[84px_1fr] gap-3"><span className="text-white/58">Genre</span><span>{beat?.genre || "-"}</span></div>
            <div className="grid grid-cols-[84px_1fr] gap-3"><span className="text-white/58">Mood</span><span>{beat?.mood || "-"}</span></div>
            <div className="grid grid-cols-[84px_1fr] gap-3"><span className="text-white/58">Type</span><span>{beat?.beat_type || "-"}</span></div>
            <div className="grid grid-cols-[84px_1fr] gap-3"><span className="text-white/58">Instrument</span><span>{beat?.instrument_types?.length ? beat.instrument_types.join(", ") : beat?.instrument_type || "-"}</span></div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium text-white/75">Tags</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(beat?.tag_names ?? []).map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/78">{tag}</span>
              ))}
              {(beat?.tag_names ?? []).length === 0 ? <span className="text-xs text-white/55">No tags yet.</span> : null}
            </div>
          </div>
        </aside>

        <section className="space-y-5">
          <section className="grid gap-4 lg:grid-cols-3">
            {(beat?.licenses ?? []).map((license) => (
              <article
                key={license.id}
                className={`rounded-[24px] border p-5 ${selectedLicenseId === license.id ? "border-[#9b4dff] bg-[#262130]" : "border-white/10 bg-[#202226]"}`}
              >
                <h2 className="text-3xl font-semibold uppercase">{license.name}</h2>
                <p className="mt-4 text-lg text-white/74">
                  {license.includes_wav ? "WAV file" : "Standard file"}
                  {license.includes_stems ? ", stems included" : ""}
                  {license.is_exclusive ? " and exclusive rights" : " and non-exclusive usage"}
                </p>
                <div className="mt-5 flex items-center justify-between gap-2">
                  <button type="button" onClick={() => setSelectedLicenseId(license.id)} className="inline-flex items-center gap-2 rounded-xl border border-[#5d8cff] px-4 py-2 text-lg text-[#8cb4ff] hover:bg-white/5">
                    <SlidersHorizontal className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                    View Terms
                  </button>
                  <button type="button" onClick={() => beat && openLicenseModal(beat, license.id)} className="brand-btn inline-flex items-center gap-2 px-4 py-2 text-sm">
                    <ShoppingCart className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                    {cartBeatIds.includes(beat?.id ?? -1) ? "Added to cart" : `Rs ${beat ? resolveLicensePrice(beat, license) : "--"}`}
                  </button>
                </div>
              </article>
            ))}
          </section>

          <section className="rounded-[26px] border border-white/10 bg-[#16171b] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-2xl font-semibold">Beat Details</h2>
                <p className="mt-1 max-w-3xl text-sm text-white/62">Poster, producer trust, license visibility, and all metadata in one place.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-white/60">
                {beat?.storefront_flags?.wav_available ? <span className="rounded-full border border-white/10 px-3 py-1">WAV</span> : null}
                {beat?.storefront_flags?.stems_available ? <span className="rounded-full border border-white/10 px-3 py-1">Stems</span> : null}
                {beat?.storefront_flags?.exclusive_available ? <span className="rounded-full border border-white/10 px-3 py-1">Exclusive</span> : null}
                {beat?.storefront_flags?.free_download ? <span className="rounded-full border border-white/10 px-3 py-1">Free MP3</span> : null}
              </div>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[20px] border border-white/10 bg-[#1d2026] p-4 text-sm text-white/72">
                <p className="leading-7">
                  {beat?.description ||
                    "No description yet. This beat detail page now prioritizes metadata, producer identity, and quick actions just like the reference direction."}
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-black/10 p-3">Commercial mode: {beat?.commercial_mode || "-"}</div>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 p-3"><Shield className="h-4 w-4 text-[#9ee8dc]" strokeWidth={1.8} aria-hidden="true" />Protection: {beat?.protection_status || "unset"}</div>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 p-3"><Sparkles className="h-4 w-4 text-[#9ee8dc]" strokeWidth={1.8} aria-hidden="true" />Fingerprint: {beat?.fingerprint_status || "pending"}</div>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 p-3"><BadgeCheck className="h-4 w-4 text-[#9ee8dc]" strokeWidth={1.8} aria-hidden="true" />Producer trust: {trust?.trust_score ?? 0}</div>
                </div>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-[#1d2026] p-4">
                <h3 className="text-lg font-semibold">Hire This Producer</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-xl border border-white/10 bg-black/10 p-3 text-sm text-white/72">Custom singles: {trust?.availability.custom_single ? "Open" : "Off"}</div>
                  <div className="rounded-xl border border-white/10 bg-black/10 p-3 text-sm text-white/72">Album work: {trust?.availability.album ? "Open" : "Off"}</div>
                  <div className="rounded-xl border border-white/10 bg-black/10 p-3 text-sm text-white/72">Badges: {(trust?.badges ?? []).slice(0, 2).join(" | ") || "No badges yet"}</div>
                </div>
                {beat ? (
                  <Link href={`/projects?producer=${beat.producer}`} className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-sm text-white/84 hover:bg-white/5">
                    <BadgeCheck className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                    Start project brief
                  </Link>
                ) : (
                  <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-sm text-white/45">
                    <BadgeCheck className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                    Start project brief
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[26px] border border-white/10 bg-[#16171b] p-5">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-2xl font-semibold">Related Tracks</h2>
                <p className="mt-1 text-sm text-white/62">Ranked by genre, mood, BPM closeness, key, tags, beat type, and instrument matches.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {related.map((item) => {
                const itemIsCurrent = currentTrack?.id === item.id;
                const itemInCart = cartBeatIds.includes(item.id);
                return (
                  <BeatListRow
                    key={item.id}
                    beat={item as SavedBeatEntry}
                    artistHref={`/producers/${item.producer}`}
                    detailHref={`/beats/${item.id}`}
                    isCurrent={itemIsCurrent}
                    isPlaying={itemIsCurrent && isPlaying}
                    onPlay={() => void handlePlay(item, "related-tracks")}
                    actionLabel={itemInCart ? "Added to cart" : `Rs ${item.base_price}`}
                    actionState={itemInCart ? "success" : "default"}
                    onAction={() => openLicenseModal(item, item.licenses?.[0]?.id ?? null)}
                    message={notify}
                  />
                );
              })}
              {related.length === 0 ? <p className="text-sm text-white/60">No related tracks yet.</p> : null}
            </div>
          </section>
        </section>
      </div>

      {licenseModalBeat ? (
        <div className="theme-overlay fixed inset-0 z-[130] flex items-start justify-center px-4 pt-24 backdrop-blur-sm" onClick={() => setLicenseModalBeat(null)}>
          <section className="theme-floating w-full max-w-[980px] rounded-2xl p-5" onClick={(event) => event.stopPropagation()}>
            <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
              <div>
                <div className="mb-4 flex items-start justify-between"><div><h3 className="theme-text-main text-4xl font-semibold">Select License Type</h3><p className="theme-text-muted">Choose how you want to license this beat.</p></div></div>
                <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--line)" }}>
                  {licenseOptions.map((item) => (
                    <button key={item.id} type="button" onClick={() => setModalSelectedLicenseId(item.id)} className={`block w-full border-b px-4 py-3 text-left text-2xl ${modalSelectedLicenseId === item.id ? "bg-[#8b28ff] text-white" : "theme-text-soft bg-transparent"}`} style={{ borderColor: "var(--line)" }}>
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
                  <button type="button" onClick={() => void handleModalAddToCart()} className="brand-btn inline-flex items-center gap-2 px-8 py-3 text-3xl font-semibold">
                    <ShoppingCart className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                    Rs {selectedLicenseInfo?.price || licenseModalBeat.base_price}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {message ? <p className="text-sm text-[#d2b0ff]">{message}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}

