"use client";

import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { apiRequest } from "@/lib/api";

type VerificationRequest = {
  id: number;
  verification_type: "artist" | "producer";
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export default function VerificationPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<VerificationRequest[]>([]);
  const [type, setType] = useState<"artist" | "producer">("producer");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      try {
        const data = await apiRequest<VerificationRequest[]>("/verification/me/", { token });
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load verification requests");
      }
    };
    void run();
  }, [token]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await apiRequest("/verification/requests/", {
        method: "POST",
        token,
        body: { verification_type: type, submitted_documents: [{ type: "id", value: "local-demo" }] },
      });
      setMessage("Verification request submitted");
      const data = await apiRequest<VerificationRequest[]>("/verification/me/", { token });
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-[34px] p-6 md:p-8">
        <p className="eyebrow">Verification</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Trust is now presented as a core product feature, not a hidden request form.</h1>
        <p className="mt-4 max-w-3xl text-white/68">
          Verification supports safer licensing and better hiring conversion. The current backend only stores a light
          request payload, so the UI explains the full trust model while using the existing API.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <section className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Submit request</p>
          <h2 className="mt-2 text-2xl font-semibold">Apply as artist or producer</h2>
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <select className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-white" value={type} onChange={(e) => setType(e.target.value as "artist" | "producer")}>
              <option value="producer">Producer</option>
              <option value="artist">Artist</option>
            </select>
            <button className="w-full rounded-full bg-[#f6b067] px-4 py-3 font-medium text-[#20150e]">Submit</button>
          </form>
          <div className="mt-5 space-y-3">
            {["Government ID check", "Profile completeness review", "Portfolio and community trust review"].map((item) => (
              <div key={item} className="rounded-[24px] border border-white/10 bg-[#0d1218] p-4 text-sm text-white/68">
                {item}
              </div>
            ))}
          </div>
          {message ? <p className="mt-3 text-sm text-[#9ee8dc]">{message}</p> : null}
        </section>

        <section className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Status tracker</p>
          <h2 className="mt-2 text-2xl font-semibold">My requests</h2>
          <div className="mt-5 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-white/10 bg-[#0d1218] p-4 text-sm">
                <p className="font-medium text-white">
                  {item.verification_type} · <span className="uppercase text-[#9ee8dc]">{item.status}</span>
                </p>
                <p className="mt-1 text-white/55">{new Date(item.created_at).toLocaleString()}</p>
              </div>
            ))}
            {items.length === 0 ? <p className="text-sm text-white/55">No requests yet.</p> : null}
          </div>
          {error ? <p className="mt-3 text-sm text-[#ffb4a9]">{error}</p> : null}
        </section>
      </div>
    </div>
  );
}
