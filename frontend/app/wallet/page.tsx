"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { apiRequest } from "@/lib/api";

type WalletEntry = { id: number; amount: string; note: string; created_at: string };
type Wallet = { id: number; balance: string; entries: WalletEntry[] };

export default function WalletPage() {
  const { token } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      try {
        const data = await apiRequest<Wallet>("/payments/wallet/me/", { token });
        setWallet(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load wallet");
      }
    };
    void run();
  }, [token]);

  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-[34px] p-6 md:p-8">
        <p className="eyebrow">Producer wallet</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Payout visibility now feels like part of the producer dashboard.</h1>
        <p className="mt-4 max-w-3xl text-white/68">
          This route uses the current wallet API, but the presentation is aligned to the dashboard and trust direction
          in `design.md`.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Balance</p>
          {!token ? <p className="mt-3 text-sm text-white/62">Login first.</p> : null}
          {wallet ? (
            <>
              <p className="mt-3 text-5xl font-semibold tracking-tight text-[#9ee8dc]">${wallet.balance}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-[#0d1218] p-4">
                  <p className="text-sm text-white/55">Ledger entries</p>
                  <p className="mt-2 text-2xl font-semibold">{wallet.entries.length}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-[#0d1218] p-4">
                  <p className="text-sm text-white/55">Wallet status</p>
                  <p className="mt-2 text-2xl font-semibold">Active</p>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Activity</p>
          <h2 className="mt-2 text-2xl font-semibold">Settlement ledger</h2>
          <div className="mt-5 space-y-3">
            {wallet?.entries.map((entry) => (
              <div key={entry.id} className="rounded-[24px] border border-white/10 bg-[#0d1218] p-4 text-sm">
                <p className="font-medium text-white">${entry.amount}</p>
                <p className="mt-1 text-white/62">{entry.note}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/38">
                  {new Date(entry.created_at).toLocaleString()}
                </p>
              </div>
            ))}
            {wallet?.entries.length === 0 ? <p className="text-sm text-white/55">No ledger entries yet.</p> : null}
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-[#ffb4a9]">{error}</p> : null}
    </div>
  );
}
