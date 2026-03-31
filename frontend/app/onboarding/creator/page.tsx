"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/auth-context";
import { apiRequest } from "@/lib/api";

export default function CreatorOnboardingPage() {
  const router = useRouter();
  const { token, user, loading, refreshMe } = useAuth();
  const [isArtist, setIsArtist] = useState(true);
  const [isProducer, setIsProducer] = useState(false);
  const [activeRole, setActiveRole] = useState<"artist" | "producer">("artist");
  const [stageName, setStageName] = useState("");
  const [producerName, setProducerName] = useState("");
  const [sameName, setSameName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login");
      return;
    }
    if (user) {
      setIsArtist(user.is_artist);
      setIsProducer(user.is_producer);
      setActiveRole(user.active_role);
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (sameName) {
      setProducerName(stageName);
    }
  }, [sameName, stageName]);

  useEffect(() => {
    if (!user) {
      return;
    }
    setStageName(user.artist_profile?.stage_name ?? "");
    setProducerName(user.producer_profile?.producer_name ?? "");
  }, [user]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      if (!isArtist && !isProducer) {
        throw new Error("Select at least one role.");
      }
      if (activeRole === "artist" && !isArtist) {
        throw new Error("Active role cannot be Artist when artist role is disabled.");
      }
      if (activeRole === "producer" && !isProducer) {
        throw new Error("Active role cannot be Producer when producer role is disabled.");
      }

      await apiRequest("/account/me/", {
        method: "PATCH",
        token,
        body: {
          is_artist: isArtist,
          is_producer: isProducer,
          active_role: activeRole,
        },
      });

      if (isArtist) {
        await apiRequest("/account/artist-profile/", {
          method: "PATCH",
          token,
          body: { stage_name: stageName },
        });
      }

      if (isProducer) {
        await apiRequest("/account/producer-profile/", {
          method: "PATCH",
          token,
          body: { producer_name: sameName ? stageName : producerName },
        });
      }

      await refreshMe();
      setMessage("Creator setup updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="surface-panel mx-auto max-w-2xl rounded-[30px] p-6">
      <p className="eyebrow">Creator setup</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Choose roles and profile identity</h1>
      <p className="mt-2 text-sm text-white/65">
        One account can be artist, producer, or both. You can change this later from here.
      </p>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div className="grid grid-cols-2 gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4 text-white/82">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isArtist} onChange={(e) => setIsArtist(e.target.checked)} />
            Artist
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isProducer} onChange={(e) => setIsProducer(e.target.checked)} />
            Producer
          </label>
          <select
            className="col-span-2 rounded-2xl border border-white/10 bg-[#0d1218] p-3 text-white"
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value as "artist" | "producer")}
          >
            <option value="artist">Active Role: Artist</option>
            <option value="producer">Active Role: Producer</option>
          </select>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-white/75">Artist identity</p>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0d1218] px-4 py-3 text-white outline-none placeholder:text-white/35"
            placeholder="Stage name"
            value={stageName}
            onChange={(e) => setStageName(e.target.value)}
          />
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/75">Producer identity</p>
            <label className="flex items-center gap-2 text-xs text-white/70">
              <input type="checkbox" checked={sameName} onChange={(e) => setSameName(e.target.checked)} />
              Use same as stage name
            </label>
          </div>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0d1218] px-4 py-3 text-white outline-none placeholder:text-white/35 disabled:opacity-55"
            placeholder="Producer name"
            value={sameName ? stageName : producerName}
            onChange={(e) => setProducerName(e.target.value)}
            disabled={sameName}
          />
        </div>

        <button
          disabled={submitting}
          className="w-full rounded-full bg-[#f6b067] px-4 py-3 font-medium text-[#20150e] disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save Creator Setup"}
        </button>
        {error ? <p className="text-sm text-[#ffb4a9]">{error}</p> : null}
        {message ? <p className="text-sm text-[#9ee8dc]">{message}</p> : null}
      </form>
    </section>
  );
}


