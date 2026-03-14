"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

import { FeatureTrackList } from "@/components/feature-track-list";
import { ReferenceScreenGrid } from "@/components/reference-screen-grid";
import { useAuth } from "@/app/auth-context";
import { apiRequest } from "@/lib/api";
import { Beat22Summary, fetchBeat22Summary } from "@/lib/reference";

type License = { id: number; name: string; includes_wav?: boolean; includes_stems?: boolean; is_exclusive?: boolean };

type Wallet = { id: number; balance: string; entries: { id: number }[] };

export default function ProducerStudioPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<Beat22Summary | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("HipHop");
  const [bpm, setBpm] = useState("90");
  const [basePrice, setBasePrice] = useState("29.00");
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const [referenceData, licenseData] = await Promise.all([
          fetchBeat22Summary(),
          apiRequest<License[]>("/beats/licenses/"),
        ]);
        setSummary(referenceData);
        setLicenses(licenseData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load producer studio");
      }
    };
    void run();
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      try {
        setWallet(await apiRequest<Wallet>("/payments/wallet/me/", { token }));
      } catch {}
    };
    void run();
  }, [token]);

  const onUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSuccess(null);
    try {
      await apiRequest("/beats/upload/", {
        method: "POST",
        token,
        body: {
          title,
          genre,
          bpm: Number(bpm),
          base_price: basePrice,
          available_licenses: licenses.slice(0, 2).map((license) => license.id),
        },
      });
      setTitle("");
      setSuccess("Beat uploaded via producer studio flow.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-[34px] p-6 md:p-8">
        <p className="eyebrow">Producer Studio</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Beat22-style producer dashboard, upload, and monetization</h1>
        <p className="mt-3 max-w-3xl text-white/68">
          This page mirrors your `producer` references: upload wizard intent, payout visibility, settings, and plan controls.
        </p>
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            <Link href="/producer/upload-wizard" className="rounded-full border border-white/12 px-4 py-2.5 text-sm text-white/84 hover:bg-white/5">
              Open upload wizard
            </Link>
            <Link href="/producer/settings" className="rounded-full border border-white/12 px-4 py-2.5 text-sm text-white/84 hover:bg-white/5">
              Manage plan and payouts
            </Link>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">License types</p>
            <p className="mt-2 text-2xl font-semibold">{licenses.length}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Wallet balance</p>
            <p className="mt-2 text-2xl font-semibold">{wallet ? `$${wallet.balance}` : "Login required"}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Ledger entries</p>
            <p className="mt-2 text-2xl font-semibold">{wallet?.entries.length ?? 0}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Upload now</p>
          <h2 className="mt-2 text-2xl font-semibold">Media + metadata + license starter flow</h2>
          <form onSubmit={onUpload} className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35 md:col-span-2" placeholder="Beat title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="Genre" value={genre} onChange={(e) => setGenre(e.target.value)} required />
            <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="BPM" value={bpm} onChange={(e) => setBpm(e.target.value)} required />
            <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35 md:col-span-2" placeholder="Base price" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required />
            <button className="rounded-full bg-[#77d6c8] px-4 py-3 font-medium text-[#0d1618] md:col-span-2">Upload beat</button>
          </form>
          {success ? <p className="mt-3 text-sm text-[#9ee8dc]">{success}</p> : null}
        </section>

        <aside className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Delivery track</p>
          <h2 className="mt-2 text-2xl font-semibold">Producer feature map</h2>
          {summary ? <div className="mt-4"><FeatureTrackList tracks={summary.feature_map.producer} /></div> : null}
        </aside>
      </section>

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Reference mapping</p>
          <h2 className="mt-2 text-2xl font-semibold">Producer screen references</h2>
        </div>
        <ReferenceScreenGrid screens={summary?.roles.producer.screens.slice(0, 12) ?? []} />
      </section>

      {error ? <p className="text-sm text-[#ffb4a9]">{error}</p> : null}
    </div>
  );
}

