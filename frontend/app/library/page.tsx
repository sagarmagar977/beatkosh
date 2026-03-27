"use client";

import { Download, Info, Music4, Play, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { usePlayer } from "@/context/player-context";
import { apiRequest, resolveMediaUrl } from "@/lib/api";

type Beat = {
  id: number;
  title: string;
  genre: string;
  bpm: number;
  base_price: string;
  producer_username: string;
  key?: string | null;
  mood?: string | null;
  cover_art_obj?: string | null;
  preview_audio_obj?: string | null;
  audio_file_obj?: string | null;
};

type DownloadItem = {
  id: number;
  beat: Beat;
  order_id: number;
  order_status: string;
  license_name?: string | null;
  purchase_price?: string;
  granted_at: string;
};

type HistoryOrder = {
  id: number;
  total_price: string;
  status: string;
  created_at: string;
};

type AssetFilter = "beats" | "kits";

function formatDate(raw?: string) {
  if (!raw) return "-";
  const value = new Date(raw);
  return Number.isNaN(value.getTime())
    ? raw
    : value.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(raw?: string) {
  if (!raw) return "Rs 0.00";
  const value = Number(raw);
  if (!Number.isFinite(value)) return `Rs ${raw}`;
  return `Rs ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function LibraryPage() {
  const { token } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlay, canPlay } = usePlayer();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [filter, setFilter] = useState<AssetFilter>("beats");
  const [activeInfo, setActiveInfo] = useState<DownloadItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingBeatId, setDownloadingBeatId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [downloadData, orderData] = await Promise.all([
        apiRequest<DownloadItem[]>("/orders/downloads/", { token }),
        apiRequest<HistoryOrder[]>("/orders/history/", { token }),
      ]);
      setDownloads(downloadData);
      setOrders(orderData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audio assets");
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const ordersById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);
  const activeOrder = activeInfo ? ordersById.get(activeInfo.order_id) ?? null : null;

  const handlePlay = async (item: DownloadItem) => {
    const playbackUrl = resolveMediaUrl(item.beat.preview_audio_obj || item.beat.audio_file_obj);
    if (!playbackUrl) {
      setError("Preview unavailable for this beat.");
      return;
    }
    if (!token || !canPlay) {
      setError("Login required for playback.");
      return;
    }
    const isCurrent = currentTrack?.id === item.beat.id;
    if (isCurrent) {
      await togglePlay();
      return;
    }
    await playTrack({
      id: item.beat.id,
      title: item.beat.title,
      artist: item.beat.producer_username,
      bpm: item.beat.bpm,
      key: item.beat.key,
      genre: item.beat.genre,
      mood: item.beat.mood,
      price: item.purchase_price || item.beat.base_price,
      coverText: item.beat.title,
      coverUrl: resolveMediaUrl(item.beat.cover_art_obj),
      beatUrl: `/beats/${item.beat.id}`,
      audioUrl: playbackUrl,
      source: "audio-assets",
    });
  };

  const handleDownload = async (item: DownloadItem) => {
    if (!token) return;
    setDownloadingBeatId(item.beat.id);
    setError(null);
    setMessage(null);
    try {
      const response = await apiRequest<{ download_url: string; filename: string }>(`/orders/downloads/${item.beat.id}/hq-url/`, { token });
      const anchor = document.createElement("a");
      anchor.href = resolveMediaUrl(response.download_url) || response.download_url;
      anchor.download = response.filename || `${item.beat.title}.wav`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setMessage(`Download started for ${item.beat.title}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingBeatId(null);
    }
  };

  return (
    <>
      {activeInfo ? (
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto px-4 py-8 backdrop-blur-sm">
          <div className="absolute inset-0 bg-black/60" onClick={() => setActiveInfo(null)} />
          <section className="theme-floating relative z-[1] w-full max-w-xl rounded-[30px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="theme-text-faint text-xs uppercase tracking-[0.18em]">Purchase details</p>
                <h2 className="theme-text-main mt-2 text-2xl font-semibold">{activeInfo.beat.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveInfo(null)}
                className="theme-soft inline-flex h-10 w-10 items-center justify-center rounded-full theme-text-soft"
                aria-label="Close purchase details"
              >
                <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-[22px] bg-white/[0.04]">
                {activeInfo.beat.cover_art_obj ? (
                  <img src={resolveMediaUrl(activeInfo.beat.cover_art_obj)} alt={activeInfo.beat.title} className="aspect-square h-full w-full object-cover" />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(139,77,255,0.4),_rgba(12,11,18,0.95)_70%)] text-white/70">
                    <Music4 className="h-9 w-9" strokeWidth={1.8} aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/38">Producer</p>
                  <p className="mt-2 text-sm font-semibold text-white">{activeInfo.beat.producer_username}</p>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/38">Purchased</p>
                  <p className="mt-2 text-sm font-semibold text-white">{formatDate(activeInfo.granted_at)}</p>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/38">License</p>
                  <p className="mt-2 text-sm font-semibold text-white">{activeInfo.license_name || "Included"}</p>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/38">Paid</p>
                  <p className="mt-2 text-sm font-semibold text-white">{formatCurrency(activeInfo.purchase_price || activeOrder?.total_price || activeInfo.beat.base_price)}</p>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/38">Order</p>
                  <p className="mt-2 text-sm font-semibold text-white">#{activeInfo.order_id}</p>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/38">Status</p>
                  <p className="mt-2 text-sm font-semibold text-white">{activeInfo.order_status}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/38">Beat metadata</p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-white/72">
                <span className="rounded-full border border-white/10 px-3 py-1.5">{activeInfo.beat.genre || "Genre N/A"}</span>
                <span className="rounded-full border border-white/10 px-3 py-1.5">{activeInfo.beat.bpm ? `${activeInfo.beat.bpm} BPM` : "BPM N/A"}</span>
                <span className="rounded-full border border-white/10 px-3 py-1.5">{activeInfo.beat.key || "Key N/A"}</span>
                <span className="rounded-full border border-white/10 px-3 py-1.5">{activeInfo.beat.mood || "Mood N/A"}</span>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <div className="space-y-6">
        <section className="surface-panel rounded-[30px] p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Owned collection</p>
              <h1 className="mt-2 text-3xl font-semibold">Audio Assets</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/62">Purchased beats and sound kits live here with playback, download, and purchase details in one place.</p>
            </div>
            <div className="inline-flex rounded-xl border border-white/10 bg-[#141720] p-1">
              <button type="button" onClick={() => setFilter("beats")} className={`rounded-lg px-4 py-2 text-sm ${filter === "beats" ? "bg-white/10 text-white" : "text-white/65"}`}>Beats</button>
              <button type="button" onClick={() => setFilter("kits")} className={`rounded-lg px-4 py-2 text-sm ${filter === "kits" ? "bg-white/10 text-white" : "text-white/65"}`}>Sound Kits</button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/38">Purchased beats</p>
              <p className="mt-3 text-2xl font-semibold text-white">{downloads.length}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/38">Sound kits</p>
              <p className="mt-3 text-2xl font-semibold text-white">0</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/38">Orders tracked</p>
              <p className="mt-3 text-2xl font-semibold text-white">{orders.length}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/38">Sort</p>
              <p className="mt-3 text-lg font-semibold text-white">Newest first</p>
            </div>
          </div>
        </section>

        <section className="surface-panel rounded-[30px] p-6">
          {filter === "beats" ? (
            <div className="space-y-4">
              {downloads.map((item) => {
                const isCurrent = currentTrack?.id === item.beat.id;
                const coverUrl = resolveMediaUrl(item.beat.cover_art_obj);
                return (
                  <article key={item.id} className="grid gap-4 rounded-[24px] border border-white/10 bg-[#0d1218] p-4 md:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center">
                    <div className="h-16 w-16 overflow-hidden rounded-[18px] bg-white/[0.04]">
                      {coverUrl ? (
                        <img src={coverUrl} alt={item.beat.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(139,77,255,0.4),_rgba(12,11,18,0.95)_70%)] text-white/70">
                          <Music4 className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className={`line-clamp-1 text-lg font-semibold ${isCurrent && isPlaying ? "text-[#8b4dff]" : "text-white"}`}>{item.beat.title}</p>
                      <p className="mt-1 line-clamp-1 text-sm text-white/60">{item.beat.producer_username}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/58">
                        <span className="rounded-full border border-white/10 px-2.5 py-1">{item.beat.genre || "Genre N/A"}</span>
                        <span className="rounded-full border border-white/10 px-2.5 py-1">{item.beat.bpm ? `${item.beat.bpm} BPM` : "BPM N/A"}</span>
                        <span className="rounded-full border border-white/10 px-2.5 py-1">{item.beat.key || "Key N/A"}</span>
                        <span className="rounded-full border border-white/10 px-2.5 py-1">{item.license_name || "Included"}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/38">Purchase</p>
                      <p className="mt-2 text-sm font-semibold text-white">{formatDate(item.granted_at)}</p>
                      <p className="mt-1 text-sm text-white/56">{formatCurrency(item.purchase_price || item.beat.base_price)}</p>
                    </div>

                    <div className="flex items-center gap-2 md:justify-self-end">
                      <button
                        type="button"
                        onClick={() => void handlePlay(item)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition hover:bg-white/[0.08]"
                        aria-label={`Play ${item.beat.title}`}
                        title="Play"
                      >
                        <Play className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={downloadingBeatId === item.beat.id}
                        onClick={() => void handleDownload(item)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition hover:bg-white/[0.08] disabled:opacity-60"
                        aria-label={`Download ${item.beat.title}`}
                        title="Download"
                      >
                        <Download className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveInfo(item)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition hover:bg-white/[0.08]"
                        aria-label={`View purchase info for ${item.beat.title}`}
                        title="Info"
                      >
                        <Info className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
              {downloads.length === 0 ? <p className="text-sm text-white/55">No purchased beats yet.</p> : null}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-[#0d1218] p-6 text-sm text-white/55">
              Purchased sound kits will appear here once sound-kit ownership and download access are wired into the same asset library.
            </div>
          )}
        </section>

        {message ? <p className="text-sm text-[#9ee8dc]">{message}</p> : null}
        {error ? <p className="text-sm text-[#ffb4a9]">{error}</p> : null}
      </div>
    </>
  );
}
