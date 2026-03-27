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
type Onboarding = {
  progress_percent: number;
  checklist: { id: string; label: string; done: boolean; detail: string }[];
  trust_summary: { trust_score: number; badges: string[]; profile_completion: number };
};
type DashboardSummary = {
  plays: number;
  likes: number;
  purchases: number;
  conversion_rate: number;
  skip_events: number;
  hiring_inquiry_count: number;
};

export default function ProducerStudioPage() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<Beat22Summary | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
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
      if (!token || !user?.id) return;
      try {
        const [walletData, onboardingData, dashboardData] = await Promise.all([
          apiRequest<Wallet>("/payments/wallet/me/", { token }),
          apiRequest<Onboarding>("/account/producer-onboarding/me/", { token }),
          apiRequest<DashboardSummary>(`/analytics/producer/${user.id}/dashboard-summary/`, { token }),
        ]);
        setWallet(walletData);
        setOnboarding(onboardingData);
        setDashboard(dashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load producer dashboard");
      }
    };
    void run();
  }, [token, user?.id]);

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
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Run your storefront, trust setup, and custom work pipeline from one place</h1>
        <p className="mt-3 max-w-3xl text-white/68">
          BeatKosh now treats the producer studio as more than an upload page. It is your storefront, onboarding center,
          and custom-single / album-production control room.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/producer/upload-wizard" className="rounded-full border border-white/12 px-4 py-2.5 text-sm text-white/84 hover:bg-white/5">
            Open upload wizard
          </Link>
          <Link href="/producer/settings" className="rounded-full border border-white/12 px-4 py-2.5 text-sm text-white/84 hover:bg-white/5">
            Manage plan and payouts
          </Link>
          <Link href="/projects" className="rounded-full border border-white/12 px-4 py-2.5 text-sm text-white/84 hover:bg-white/5">
            View hire workflow
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Onboarding progress</p>
            <p className="mt-2 text-2xl font-semibold">{onboarding?.progress_percent ?? 0}%</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Trust score</p>
            <p className="mt-2 text-2xl font-semibold">{onboarding?.trust_summary.trust_score ?? 0}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Wallet balance</p>
            <p className="mt-2 text-2xl font-semibold">{wallet ? `Rs ${wallet.balance}` : "Login required"}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Hire inquiries</p>
            <p className="mt-2 text-2xl font-semibold">{dashboard?.hiring_inquiry_count ?? 0}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Producer readiness</p>
          <h2 className="mt-2 text-2xl font-semibold">Trust and onboarding checklist</h2>
          <div className="mt-4 space-y-3">
            {(onboarding?.checklist ?? []).map((item) => (
              <div key={item.id} className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{item.label}</p>
                  <span className={`rounded-full px-3 py-1 text-xs ${item.done ? "bg-[#77d6c8]/15 text-[#9ee8dc]" : "bg-white/8 text-white/60"}`}>
                    {item.done ? "Ready" : "Pending"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/60">{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/62">
            {(onboarding?.trust_summary.badges ?? []).map((badge) => (
              <span key={badge} className="rounded-full border border-white/10 px-3 py-1.5">{badge}</span>
            ))}
          </div>
        </section>

        <aside className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Dashboard signals</p>
          <h2 className="mt-2 text-2xl font-semibold">Catalog performance</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Plays</p>
              <p className="mt-2 text-2xl font-semibold">{dashboard?.plays ?? 0}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Likes</p>
              <p className="mt-2 text-2xl font-semibold">{dashboard?.likes ?? 0}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Purchases</p>
              <p className="mt-2 text-2xl font-semibold">{dashboard?.purchases ?? 0}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-[#0d1218] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Conversion</p>
              <p className="mt-2 text-2xl font-semibold">{dashboard?.conversion_rate ?? 0}%</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/58">Skip events: {dashboard?.skip_events ?? 0}. Ledger entries: {wallet?.entries.length ?? 0}.</p>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Upload now</p>
          <h2 className="mt-2 text-2xl font-semibold">Kdn bekop the fast upload flow, publish into a stronger storefront</h2>
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
