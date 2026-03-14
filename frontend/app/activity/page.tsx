"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { apiRequest } from "@/lib/api";

type FollowItem = {
  id: number;
  producer: number;
  producer_username: string;
};

type LikeItem = {
  id: number;
  beat: { id: number; title: string; producer_username: string };
};

type DropItem = {
  id: number;
  producer_username: string;
  message: string;
  beat?: { id: number; title: string } | null;
  created_at: string;
};

type Beat = {
  id: number;
  title: string;
  producer_username: string;
};

export default function ActivityPage() {
  const { token } = useAuth();
  const [follows, setFollows] = useState<FollowItem[]>([]);
  const [likes, setLikes] = useState<LikeItem[]>([]);
  const [drops, setDrops] = useState<DropItem[]>([]);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [producerId, setProducerId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [followData, likeData, dropData, beatData] = await Promise.all([
        apiRequest<FollowItem[]>("/account/follows/me/", { token }),
        apiRequest<LikeItem[]>("/account/likes/beats/me/", { token }),
        apiRequest<DropItem[]>("/analytics/drops/feed/", { token }),
        apiRequest<Beat[]>("/beats/"),
      ]);
      setFollows(followData);
      setLikes(likeData);
      setDrops(dropData);
      setBeats(beatData.slice(0, 8));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const onFollow = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !producerId) return;
    try {
      await apiRequest(`/account/follows/producers/${producerId}/`, { method: "POST", token, body: {} });
      setMessage("Producer followed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to follow producer");
    }
  };

  const onLike = async (beatId: number) => {
    if (!token) return;
    try {
      await apiRequest(`/account/likes/beats/${beatId}/`, { method: "POST", token, body: {} });
      setMessage("Beat liked.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to like beat");
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-[34px] p-6 md:p-8">
        <p className="eyebrow">Activity</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Follow producers, like beats, and track drops</h1>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Following</p>
          <form onSubmit={onFollow} className="mt-3 flex gap-2">
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none placeholder:text-white/35" placeholder="Producer User ID" value={producerId} onChange={(e) => setProducerId(e.target.value)} />
            <button className="rounded-full bg-[#f6b067] px-4 py-2.5 text-sm font-medium text-[#20150e]">Follow</button>
          </form>
          <div className="mt-4 space-y-2">
            {follows.map((item) => (
              <div key={item.id} className="rounded-[18px] border border-white/10 bg-[#0d1218] p-3 text-sm">
                {item.producer_username} (#{item.producer})
              </div>
            ))}
            {follows.length === 0 ? <p className="text-sm text-white/55">No followed producers yet.</p> : null}
          </div>
        </div>

        <div className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Liked beats</p>
          <div className="mt-4 space-y-2">
            {likes.map((item) => (
              <div key={item.id} className="rounded-[18px] border border-white/10 bg-[#0d1218] p-3 text-sm">
                {item.beat.title} â€¢ {item.beat.producer_username}
              </div>
            ))}
            {likes.length === 0 ? <p className="text-sm text-white/55">No liked beats yet.</p> : null}
          </div>
          <div className="mt-4 space-y-2">
            {beats.map((beat) => (
              <button key={beat.id} type="button" onClick={() => void onLike(beat.id)} className="w-full rounded-[18px] border border-white/10 bg-white/5 p-3 text-left text-sm text-white/82 hover:bg-white/7">
                Like {beat.title} â€¢ {beat.producer_username}
              </button>
            ))}
          </div>
        </div>

        <div className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Drops feed</p>
          <div className="mt-4 space-y-2">
            {drops.map((drop) => (
              <div key={drop.id} className="rounded-[18px] border border-white/10 bg-[#0d1218] p-3 text-sm">
                <p className="font-medium">{drop.producer_username}</p>
                <p className="mt-1 text-white/70">{drop.message || "New update posted."}</p>
              </div>
            ))}
            {drops.length === 0 ? <p className="text-sm text-white/55">No drops yet. Follow producers first.</p> : null}
          </div>
        </div>
      </section>

      {message ? <p className="text-sm text-[#9ee8dc]">{message}</p> : null}
      {error ? <p className="text-sm text-[#ffb4a9]">{error}</p> : null}
    </div>
  );
}

