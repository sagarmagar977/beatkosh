"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { apiRequest } from "@/lib/api";

type Beat = {
  id: number;
  title: string;
  genre: string;
  bpm: number;
  base_price: string;
  producer_username: string;
};

type DownloadItem = {
  id: number;
  beat: Beat;
  order_id: number;
  order_status: string;
  granted_at: string;
};

type HistoryOrder = {
  id: number;
  total_price: string;
  status: string;
  created_at: string;
};

type RecentPlay = {
  id: number;
  beat: Beat;
  play_count: number;
  last_played_at: string;
};

export default function LibraryPage() {
  const { token } = useAuth();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [recent, setRecent] = useState<RecentPlay[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [downloadData, orderData, recentData] = await Promise.all([
        apiRequest<DownloadItem[]>("/orders/downloads/", { token }),
        apiRequest<HistoryOrder[]>("/orders/history/", { token }),
        apiRequest<RecentPlay[]>("/analytics/listening/recent/", { token }),
      ]);
      setDownloads(downloadData);
      setOrders(orderData);
      setRecent(recentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load library");
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const onMarkPlayed = async (beatId: number) => {
    if (!token) return;
    setError(null);
    setMessage(null);
    try {
      await apiRequest("/analytics/listening/play/", {
        method: "POST",
        token,
        body: { beat_id: beatId },
      });
      setMessage("Playback event saved.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update recent plays");
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-[34px] p-6 md:p-8">
        <p className="eyebrow">Artist library</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Downloads, order history, and recently played</h1>
        <p className="mt-3 max-w-3xl text-white/68">
          This page covers Beat22 artist parity for library and history tracking.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Downloads</p>
          <h2 className="mt-2 text-2xl font-semibold">{downloads.length} items</h2>
          <div className="mt-4 space-y-3">
            {downloads.map((item) => (
              <div key={item.id} className="rounded-[20px] border border-white/10 bg-[#0d1218] p-4">
                <p className="font-medium">{item.beat.title}</p>
                <p className="mt-1 text-sm text-white/62">{item.beat.producer_username} â€¢ {item.beat.genre}</p>
                <button
                  type="button"
                  onClick={() => void onMarkPlayed(item.beat.id)}
                  className="mt-3 rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
                >
                  Mark played
                </button>
              </div>
            ))}
            {downloads.length === 0 ? <p className="text-sm text-white/55">No paid downloads yet.</p> : null}
          </div>
        </div>

        <div className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Order history</p>
          <h2 className="mt-2 text-2xl font-semibold">{orders.length} orders</h2>
          <div className="mt-4 space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="rounded-[20px] border border-white/10 bg-[#0d1218] p-4">
                <p className="font-medium">Order #{order.id}</p>
                <p className="mt-1 text-sm text-white/62">${order.total_price} â€¢ {order.status}</p>
              </div>
            ))}
            {orders.length === 0 ? <p className="text-sm text-white/55">No orders yet.</p> : null}
          </div>
        </div>

        <div className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Recently played</p>
          <h2 className="mt-2 text-2xl font-semibold">{recent.length} tracks</h2>
          <div className="mt-4 space-y-3">
            {recent.map((item) => (
              <div key={item.id} className="rounded-[20px] border border-white/10 bg-[#0d1218] p-4">
                <p className="font-medium">{item.beat.title}</p>
                <p className="mt-1 text-sm text-white/62">Plays: {item.play_count}</p>
              </div>
            ))}
            {recent.length === 0 ? <p className="text-sm text-white/55">No recent play activity yet.</p> : null}
          </div>
        </div>
      </section>

      {message ? <p className="text-sm text-[#9ee8dc]">{message}</p> : null}
      {error ? <p className="text-sm text-[#ffb4a9]">{error}</p> : null}
    </div>
  );
}

