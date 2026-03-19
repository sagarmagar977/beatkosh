"use client";

import { Music4, Package, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { apiRequest } from "@/lib/api";

type BeatDraft = {
  id: number;
  title: string;
  base_price: string;
  commercial_mode: string;
  status: "draft" | "published";
  current_step: number;
  updated_at?: string;
  created_at?: string;
};

type SoundKitDraft = {
  id: number;
  title: string;
  base_price: string;
  kit_type: string;
  status: "draft" | "published";
  current_step: number;
  updated_at?: string;
  created_at?: string;
};

function formatDate(raw?: string) {
  if (!raw) return "-";
  const value = new Date(raw);
  return Number.isNaN(value.getTime())
    ? raw
    : value.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MediaUploadsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [tab, setTab] = useState<"beats" | "kits">("beats");
  const [beatDrafts, setBeatDrafts] = useState<BeatDraft[]>([]);
  const [kitDrafts, setKitDrafts] = useState<SoundKitDraft[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [beatData, kitData] = await Promise.all([
          apiRequest<BeatDraft[]>("/beats/upload-drafts/", { token }),
          apiRequest<SoundKitDraft[]>("/soundkits/upload-drafts/", { token }),
        ]);
        setBeatDrafts(beatData.filter((item) => item.status === "draft"));
        setKitDrafts(kitData.filter((item) => item.status === "draft"));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load drafts");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [token]);

  const filteredBeats = useMemo(() => beatDrafts.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase())), [beatDrafts, query]);
  const filteredKits = useMemo(() => kitDrafts.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase())), [kitDrafts, query]);

  const handleDeleteBeat = async (draftId: number) => {
    if (!token || !window.confirm("Delete this beat draft?")) return;
    setBusyId(`beat-${draftId}`);
    try {
      await apiRequest(`/beats/upload-drafts/${draftId}/`, { method: "DELETE", token });
      setBeatDrafts((current) => current.filter((item) => item.id !== draftId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete draft");
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteKit = async (draftId: number) => {
    if (!token || !window.confirm("Delete this sound-kit draft?")) return;
    setBusyId(`kit-${draftId}`);
    try {
      await apiRequest(`/soundkits/upload-drafts/${draftId}/`, { method: "DELETE", token });
      setKitDrafts((current) => current.filter((item) => item.id !== draftId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete draft");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-[30px] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Producer Workspace</p>
            <h1 className="mt-2 text-3xl font-semibold">Media Uploads</h1>
            <p className="mt-2 text-sm text-white/62">Open saved drafts, continue editing in the upload wizard, or remove old drafts you no longer need.</p>
          </div>
          <button type="button" onClick={() => router.push("/producer/upload-wizard?flow=beat&fresh=1")} className="brand-btn px-4 py-2.5 text-sm">New Upload</button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-white/10 bg-[#141720] p-1">
            <button type="button" onClick={() => setTab("beats")} className={`rounded-lg px-4 py-2 text-sm ${tab === "beats" ? "bg-white/10 text-white" : "text-white/65"}`}>My Beats</button>
            <button type="button" onClick={() => setTab("kits")} className={`rounded-lg px-4 py-2 text-sm ${tab === "kits" ? "bg-white/10 text-white" : "text-white/65"}`}>My Sound Kits</button>
          </div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "beats" ? "Search beat draft" : "Search sound-kit draft"} className="h-11 min-w-[280px] flex-1 rounded-xl border border-white/10 bg-[#141720] px-4 text-sm text-white/82 outline-none placeholder:text-white/35" />
        </div>
      </section>

      <section className="surface-panel rounded-[30px] p-6">
        {loading ? <p className="text-sm text-white/60">Loading saved drafts...</p> : null}
        {!loading && tab === "beats" ? (
          <div className="space-y-4">
            {filteredBeats.map((item) => (
              <article key={item.id} className="grid gap-4 rounded-[24px] border border-white/10 bg-[#141720] p-5 md:grid-cols-[1.3fr_0.9fr_0.9fr_auto] md:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/60"><Music4 className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" /></div>
                  <div>
                    <p className="text-lg font-semibold text-white">{item.title || `Untitled beat #${item.id}`}</p>
                    <p className="text-sm text-white/55">Step {Math.max(item.current_step, 1)} draft</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">Price / mode</p>
                  <p className="mt-1 text-sm text-white/82">Rs {item.base_price || "0.00"} ({item.commercial_mode || "Presets"})</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">Updated</p>
                  <p className="mt-1 text-sm text-white/82">{formatDate(item.updated_at || item.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 md:justify-self-end">
                  <button type="button" onClick={() => router.push(`/producer/upload-wizard?flow=beat&draft=${item.id}`)} className="rounded-xl border border-white/10 bg-white/5 p-3 text-white/80 hover:bg-white/10" title="Edit draft">
                    <Pencil className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                  </button>
                  <button type="button" disabled={busyId === `beat-${item.id}`} onClick={() => void handleDeleteBeat(item.id)} className="rounded-xl border border-white/10 bg-white/5 p-3 text-white/80 hover:bg-white/10 disabled:opacity-60" title="Delete draft">
                    <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
            {filteredBeats.length === 0 ? <p className="text-sm text-white/55">No beat drafts found.</p> : null}
          </div>
        ) : null}

        {!loading && tab === "kits" ? (
          <div className="space-y-4">
            {filteredKits.map((item) => (
              <article key={item.id} className="grid gap-4 rounded-[24px] border border-white/10 bg-[#141720] p-5 md:grid-cols-[1.3fr_0.9fr_0.9fr_auto] md:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/60"><Package className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" /></div>
                  <div>
                    <p className="text-lg font-semibold text-white">{item.title || `Untitled sound kit #${item.id}`}</p>
                    <p className="text-sm text-white/55">Step {Math.max(item.current_step, 1)} draft</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">Price / type</p>
                  <p className="mt-1 text-sm text-white/82">Rs {item.base_price || "0.00"} ({item.kit_type || "Draft"})</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">Updated</p>
                  <p className="mt-1 text-sm text-white/82">{formatDate(item.updated_at || item.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 md:justify-self-end">
                  <button type="button" onClick={() => router.push(`/producer/upload-wizard?flow=kit&draft=${item.id}`)} className="rounded-xl border border-white/10 bg-white/5 p-3 text-white/80 hover:bg-white/10" title="Edit draft">
                    <Pencil className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                  </button>
                  <button type="button" disabled={busyId === `kit-${item.id}`} onClick={() => void handleDeleteKit(item.id)} className="rounded-xl border border-white/10 bg-white/5 p-3 text-white/80 hover:bg-white/10 disabled:opacity-60" title="Delete draft">
                    <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
            {filteredKits.length === 0 ? <p className="text-sm text-white/55">No sound-kit drafts found.</p> : null}
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </section>
    </div>
  );
}
