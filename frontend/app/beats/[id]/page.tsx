"use client";

import { ArrowLeft, BadgeCheck, Heart, Pause, Play, ShoppingCart, Share2, Shield, SlidersHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  description?: string;
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

export default function BeatDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { refreshCart } = useCart();
  const { currentTrack, isPlaying, playTrack, togglePlay, canPlay } = usePlayer();
  const [beat, setBeat] = useState<Beat | null>(null);
  const [related, setRelated] = useState<Beat[]>([]);
  const [trust, setTrust] = useState<TrustSummary | null>(null);
  const [selectedLicenseId, setSelectedLicenseId] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const beatId = Number(params.id);
        const detail = await apiRequest<Beat>(`/beats/${beatId}/`);
        setBeat(detail);
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

  const coverUrl = useMemo(() => resolveMediaUrl(beat?.cover_art_obj), [beat]);
  const selectedLicense = useMemo(
    () => beat?.licenses?.find((license) => license.id === selectedLicenseId) ?? beat?.licenses?.[0] ?? null,
    [beat, selectedLicenseId],
  );

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

  const handleAddToCart = async (targetBeat: Beat, licenseId?: number | null) => {
    if (!token) {
      router.push("/auth/login");
      return;
    }
    const resolvedLicenseId = licenseId ?? targetBeat.licenses?.[0]?.id;
    if (!resolvedLicenseId) {
      notify("No license configured for this beat.");
      return;
    }
    await apiRequest("/orders/cart/items/", {
      method: "POST",
      token,
      body: { product_type: "beat", product_id: targetBeat.id, license_id: resolvedLicenseId },
    });
    await refreshCart();
    notify("Beat added to cart successfully.");
  };

  const isCurrentBeat = currentTrack?.id === beat?.id;

  return (
    <div className="space-y-5 pb-32">
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
              onClick={() => beat && void handleAddToCart(beat, selectedLicenseId)}
              className="inline-flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 px-2 py-3 disabled:opacity-50"
            >
              <ShoppingCart className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              <span className="mt-1">Cart</span>
            </button>
          </div>
          <button
            type="button"
            disabled={!beat}
            onClick={() => beat && void handleAddToCart(beat, selectedLicenseId)}
            className="brand-btn mt-5 w-full px-4 py-3 text-lg font-semibold disabled:opacity-50"
          >
            Rs {selectedLicense ? beat?.base_price : beat?.base_price ?? "--"}
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
                  <button type="button" onClick={() => beat && void handleAddToCart(beat, license.id)} className="brand-btn inline-flex items-center gap-2 px-4 py-2 text-sm">
                    <ShoppingCart className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                    Rs {beat?.base_price ?? "--"}
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
                const itemCover = resolveMediaUrl(item.cover_art_obj);
                const itemIsCurrent = currentTrack?.id === item.id;
                return (
                  <article key={item.id} className="grid items-center gap-4 rounded-[20px] border border-white/10 bg-[#15171d] px-4 py-3 xl:grid-cols-[auto_1.5fr_1fr_auto]">
                    <button type="button" onClick={() => void handlePlay(item, "related-tracks")} className={`inline-flex h-12 w-12 items-center justify-center rounded-full border text-sm ${itemIsCurrent && isPlaying ? "border-[#8b28ff] bg-[#8b28ff] text-white" : "border-white/20 bg-white/5 text-white/85"}`}>
                      {itemIsCurrent && isPlaying ? <Pause className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" /> : <Play className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
                    </button>
                    <div className="flex items-center gap-3">
                      {itemCover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={itemCover} alt={item.title} className="h-14 w-14 rounded-md object-cover" />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-md border border-white/10 bg-gradient-to-br from-[#2a3546] to-[#11151d] text-sm font-bold text-white/80">
                          {item.title.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <Link href={`/beats/${item.id}`} className="text-2xl font-semibold hover:underline">{item.title}</Link>
                        <p className="text-lg text-white/70">{item.producer_username}</p>
                        <p className="text-sm text-white/55">{item.bpm} BPM | {item.key || "N/A"} | {item.genre}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-white/60">
                      <span className="rounded-full border border-white/10 px-3 py-1">{item.genre}</span>
                      {item.mood ? <span className="rounded-full border border-white/10 px-3 py-1">{item.mood}</span> : null}
                      {(item.tag_names ?? []).slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full border border-white/10 px-3 py-1">{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 justify-self-end">
                      <button type="button" onClick={() => void handleAddToCart(item, item.licenses?.[0]?.id ?? null)} className="brand-btn inline-flex items-center gap-2 px-5 py-2 text-lg font-semibold">
                        <ShoppingCart className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                        Rs {item.base_price}
                      </button>
                      <button type="button" onClick={() => router.push(`/beats/${item.id}`)} className="rounded-full border border-white/12 px-3 py-2 text-xs text-white/78 hover:bg-white/5">
                        View
                      </button>
                    </div>
                  </article>
                );
              })}
              {related.length === 0 ? <p className="text-sm text-white/60">No related tracks yet.</p> : null}
            </div>
          </section>
        </section>
      </div>
      {message ? <p className="text-sm text-[#d2b0ff]">{message}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}




