"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, Minus, Music2, Plus, Sparkles, Wand2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { useAuth } from "@/context/auth-context";
import { apiRequest } from "@/lib/api";

type Deliverable = { id: number; note: string; file_url: string; version_label?: string; status: string; created_at: string; submitted_by_username?: string };
type Milestone = {
  id: number;
  title: string;
  description?: string;
  amount: string;
  due_date?: string | null;
  status: string;
  deliverables: Deliverable[];
};
type Project = {
  id: number;
  title: string;
  description: string;
  status: string;
  workflow_stage: string;
  budget: string;
  offer_price?: string | null;
  producer: number;
  producer_username?: string;
  project_type: string;
  expected_track_count: number;
  preferred_genre?: string;
  instrument_types: string[];
  mood_types: string[];
  target_genre_style?: string;
  reference_links?: string[];
  delivery_timeline_days?: number | null;
  revision_allowance: number;
  linked_conversation_hint?: string;
  workflow_summary?: { milestone_count: number; deliverable_count: number; funded_milestones: number; approved_milestones: number; stage_label: string };
  milestones: Milestone[];
};

type ProducerLookup = {
  producer_name: string;
  headline?: string;
  genres?: string;
  verified?: boolean;
};

type ProjectTypeOption = {
  value: string;
  label: string;
  description: string;
  accent: string;
  base_price: string;
};

type ProjectMetadataOptions = {
  project_types: ProjectTypeOption[];
  genres: string[];
  instrument_types: string[];
  moods: string[];
  negotiation: {
    bulk_discount_threshold: number;
    bulk_discount_factor: string;
    max_negotiation_discount_factor: string;
  };
};

function formatProjectType(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCurrency(value?: string | number | null) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0";
  return numeric.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function clampOfferValue(value: number, marketPrice: number, minOffer: number) {
  if (!Number.isFinite(value)) {
    return marketPrice;
  }
  return Math.min(marketPrice, Math.max(minOffer, value));
}

function SelectMenu({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: string[]; placeholder: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs uppercase tracking-[0.24em] text-[#bcaee6]">{label}</span>
      <div className="relative">
        <select value={value} onChange={(event) => onChange(event.target.value)} className="h-14 w-full appearance-none rounded-[18px] border border-white/10 bg-[#2a223a] px-4 pr-11 text-base text-white outline-none transition focus:border-[#b18cff]">
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" strokeWidth={1.8} aria-hidden="true" />
      </div>
    </label>
  );
}

function InstrumentPicker({ options, selectedValues, onToggle }: { options: string[]; selectedValues: string[]; onToggle: (value: string) => void }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((item) => item.toLowerCase().includes(normalized));
  }, [options, query]);

  return (
    <div className="space-y-3">
      <label className="block space-y-2">
        <span className="text-xs uppercase tracking-[0.24em] text-[#bcaee6]">Instruments</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search instruments" className="h-14 w-full rounded-[18px] border border-white/10 bg-[#2a223a] px-4 text-base text-white outline-none placeholder:text-white/30 focus:border-[#b18cff]" />
      </label>
      <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
        {filtered.slice(0, 24).map((option) => {
          const active = selectedValues.includes(option);
          return (
            <button key={option} type="button" onClick={() => onToggle(option)} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${active ? "border-[#af89ff] bg-[#8f6bef]/20 text-white" : "border-white/8 bg-white/[0.03] text-white/72 hover:bg-white/[0.06]"}`}>
              <span>{option}</span>
              <span className={`h-4 w-4 rounded-full border ${active ? "border-[#af89ff] bg-[#af89ff]" : "border-white/25"}`} />
            </button>
          );
        })}
      </div>
      {selectedValues.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedValues.map((value) => (
            <span key={value} className="rounded-full border border-[#af89ff]/40 bg-[#af89ff]/12 px-3 py-1 text-xs text-[#e2d6ff]">{value}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [metadata, setMetadata] = useState<ProjectMetadataOptions | null>(null);
  const [selectedProducerId, setSelectedProducerId] = useState(searchParams.get("producer") ?? "");
  const [selectedProducer, setSelectedProducer] = useState<ProducerLookup | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("custom_single");
  const [trackCount, setTrackCount] = useState(1);
  const [preferredGenre, setPreferredGenre] = useState("");
  const [instrumentTypes, setInstrumentTypes] = useState<string[]>([]);
  const [moodTypes, setMoodTypes] = useState<string[]>([]);
  const [genreStyle, setGenreStyle] = useState("");
  const [timelineDays, setTimelineDays] = useState("14");
  const [revisionAllowance, setRevisionAllowance] = useState("2");
  const [referenceLinks, setReferenceLinks] = useState("");
  const [budget, setBudget] = useState("3000.00");
  const [offerPrice, setOfferPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadProjects = async (accessToken: string) => {
    const data = await apiRequest<Project[]>("/projects/", { token: accessToken });
    setProjects(data);
  };

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const [projectData, metadataOptions] = await Promise.all([
          apiRequest<Project[]>("/projects/", { token }),
          apiRequest<ProjectMetadataOptions>("/projects/metadata-options/", { token }),
        ]);
        setProjects(projectData);
        setMetadata(metadataOptions);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load hiring workspace");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [token]);

  useEffect(() => {
    const producerId = Number(selectedProducerId);
    if (!producerId || Number.isNaN(producerId)) {
      setSelectedProducer(null);
      return;
    }
    const run = async () => {
      try {
        const result = await apiRequest<ProducerLookup>(`/account/producers/by-user/${producerId}/`);
        setSelectedProducer(result);
      } catch {
        setSelectedProducer(null);
      }
    };
    void run();
  }, [selectedProducerId]);

  const projectTypeOptions = metadata?.project_types ?? [];
  const selectedProjectType = projectTypeOptions.find((option) => option.value === projectType) ?? projectTypeOptions[0] ?? null;
  const basePrice = Number(selectedProjectType?.base_price ?? 0);
  const bulkThreshold = metadata?.negotiation.bulk_discount_threshold ?? 10;
  const bulkFactor = Number(metadata?.negotiation.bulk_discount_factor ?? "0.90");
  const maxNegotiationFactor = Number(metadata?.negotiation.max_negotiation_discount_factor ?? "0.80");
  const effectiveMultiplier = trackCount >= bulkThreshold ? bulkFactor : 1;
  const marketPrice = basePrice * trackCount * effectiveMultiplier;
  const minOffer = marketPrice * maxNegotiationFactor;
  const currentOffer = Number(offerPrice || marketPrice.toFixed(2));
  const offerTooLow = currentOffer < minOffer;
  const offerStep = useMemo(() => {
    if (marketPrice >= 50000) return 5000;
    if (marketPrice >= 20000) return 1000;
    if (marketPrice >= 10000) return 500;
    return 250;
  }, [marketPrice]);

  useEffect(() => {
    if (!selectedProjectType) return;
    setBudget((basePrice * trackCount * effectiveMultiplier).toFixed(2));
    setOfferPrice((basePrice * trackCount * effectiveMultiplier).toFixed(2));
  }, [projectType, basePrice, trackCount, effectiveMultiplier, selectedProjectType]);

  const adjustOfferPrice = (direction: "down" | "up") => {
    const nextValue = direction === "down" ? currentOffer - offerStep : currentOffer + offerStep;
    const clamped = clampOfferValue(nextValue, marketPrice, minOffer);
    setOfferPrice(clamped.toFixed(2));
  };

  const onCreateRequest = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    if (!selectedProducerId) {
      setError("Choose a producer before posting the hiring brief.");
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError("Project title and description are required.");
      return;
    }
    if (moodTypes.length === 0) {
      setError("Select at least one mood for the project direction.");
      return;
    }
    if (instrumentTypes.length === 0) {
      setError("Choose at least one instrument so the brief stays structured.");
      return;
    }
    if (offerTooLow) {
      setError(`Offer price cannot go below Rs ${formatCurrency(minOffer)} for this brief.`);
      return;
    }
    try {
      setSubmitting(true);
      await apiRequest("/projects/request/", {
        method: "POST",
        token,
        body: {
          producer: Number(selectedProducerId),
          title,
          description,
          project_type: projectType,
          expected_track_count: trackCount,
          preferred_genre: preferredGenre,
          instrument_types: instrumentTypes,
          mood_types: moodTypes,
          target_genre_style: genreStyle,
          reference_links: referenceLinks.split("\n").map((item) => item.trim()).filter(Boolean),
          delivery_timeline_days: timelineDays ? Number(timelineDays) : null,
          revision_allowance: revisionAllowance ? Number(revisionAllowance) : 0,
          budget,
          offer_price: offerPrice || budget,
        },
      });
      setMessage("Structured project brief sent.");
      setTitle("");
      setDescription("");
      setInstrumentTypes([]);
      setMoodTypes([]);
      setGenreStyle("");
      setReferenceLinks("");
      await loadProjects(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleInstrument = (value: string) => {
    setInstrumentTypes((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const toggleMood = (value: string) => {
    setMoodTypes((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  return (
    <div className="space-y-6 pb-16">
      <section className="overflow-hidden rounded-[34px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(149,105,255,0.18),transparent_38%),linear-gradient(180deg,#110b1e_0%,#0f0b17_100%)] p-6 md:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <form id="hiring-form" onSubmit={onCreateRequest} className="space-y-6">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#bcaee6]">Hiring workspace</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">Hire Your Sound</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/66">Build a structured production brief with real backend-driven genres, instruments, and moods so artists can post better custom work requests.</p>
            </div>

            <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-[#bcaee6]">01. Choose Production Type</p>
                  <p className="mt-2 text-sm text-white/52">These cards are powered by the backend metadata endpoint, not hardcoded frontend-only labels.</p>
                </div>
                <label className="min-w-[220px] space-y-2 text-sm text-white/75">
                  <span className="text-xs uppercase tracking-[0.24em] text-[#bcaee6]">Producer</span>
                  <input value={selectedProducerId} onChange={(event) => setSelectedProducerId(event.target.value)} placeholder="Producer" className="h-12 w-full rounded-[18px] border border-white/10 bg-[#2a223a] px-4 text-white outline-none placeholder:text-white/30 focus:border-[#b18cff]" />
                </label>
              </div>
              {selectedProducer ? (
                <div className="mt-4 rounded-[20px] border border-[#af89ff]/25 bg-[#af89ff]/10 px-4 py-3 text-sm text-white/80">
                  Hiring <span className="font-semibold text-white">{selectedProducer.producer_name}</span>
                  {selectedProducer.headline ? <span className="text-white/52"> | {selectedProducer.headline}</span> : null}
                </div>
              ) : null}
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {projectTypeOptions.map((option) => {
                  const active = option.value === projectType;
                  return (
                    <button key={option.value} type="button" onClick={() => setProjectType(option.value)} className={`rounded-[24px] border p-5 text-left transition ${active ? "border-[#af89ff] bg-[#2a2040] shadow-[0_0_0_1px_rgba(175,137,255,0.25)]" : "border-white/8 bg-white/[0.02] hover:bg-white/[0.05]"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${active ? "bg-[#af89ff]/18 text-[#e3d6ff]" : "bg-white/[0.06] text-white/62"}`}>
                          <Music2 className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                        </div>
                        <span className={`mt-1 h-5 w-5 rounded-full border ${active ? "border-[#af89ff] bg-[#af89ff]" : "border-white/25"}`} />
                      </div>
                      <p className="mt-5 text-2xl font-semibold text-white">{option.label}</p>
                      <p className="mt-2 text-sm leading-6 text-white/58">{option.description}</p>
                      <p className="mt-4 text-xs uppercase tracking-[0.22em] text-[#bcaee6]">Base Rs {formatCurrency(option.base_price)}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5 md:p-6">
              <p className="text-xs uppercase tracking-[0.26em] text-[#bcaee6]">02. Project Details</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block space-y-2 md:col-span-2">
                  <span className="text-xs uppercase tracking-[0.24em] text-[#bcaee6]">Project Title</span>
                  <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Name this project" className="h-14 w-full rounded-[18px] border border-white/10 bg-[#2a223a] px-4 text-base text-white outline-none placeholder:text-white/30 focus:border-[#b18cff]" />
                </label>
                <SelectMenu label="Genre" value={preferredGenre} onChange={setPreferredGenre} options={metadata?.genres ?? []} placeholder="Choose a genre" />
                <label className="block space-y-2">
                  <span className="text-xs uppercase tracking-[0.24em] text-[#bcaee6]">Tracks</span>
                  <div className="flex h-14 items-center justify-between rounded-[18px] border border-white/10 bg-[#2a223a] px-4">
                    <button type="button" onClick={() => setTrackCount((current) => Math.max(1, current - 1))} className="rounded-xl border border-white/10 p-2 text-white/70 hover:bg-white/5"><Minus className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" /></button>
                    <span className="text-lg font-semibold text-white">{trackCount} tracks</span>
                    <button type="button" onClick={() => setTrackCount((current) => current + 1)} className="rounded-xl border border-white/10 p-2 text-white/70 hover:bg-white/5"><Plus className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" /></button>
                  </div>
                </label>
                <div className="md:col-span-2">
                  <InstrumentPicker options={metadata?.instrument_types ?? []} selectedValues={instrumentTypes} onToggle={toggleInstrument} />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <span className="text-xs uppercase tracking-[0.24em] text-[#bcaee6]">Mood Direction</span>
                  <div className="flex flex-wrap gap-2">
                    {(metadata?.moods ?? []).slice(0, 18).map((mood) => {
                      const active = moodTypes.includes(mood);
                      return (
                        <button key={mood} type="button" onClick={() => toggleMood(mood)} className={`rounded-full border px-4 py-2 text-sm transition ${active ? "border-[#ff9bc8]/60 bg-[#ff9bc8]/18 text-white" : "border-white/10 bg-white/[0.03] text-white/66 hover:bg-white/[0.06]"}`}>
                          {mood}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="block space-y-2">
                  <span className="text-xs uppercase tracking-[0.24em] text-[#bcaee6]">Style Notes</span>
                  <input value={genreStyle} onChange={(event) => setGenreStyle(event.target.value)} placeholder="Synth-heavy, cinematic, warm low end..." className="h-14 w-full rounded-[18px] border border-white/10 bg-[#2a223a] px-4 text-base text-white outline-none placeholder:text-white/30 focus:border-[#b18cff]" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs uppercase tracking-[0.24em] text-[#bcaee6]">Timeline (days)</span>
                  <input value={timelineDays} onChange={(event) => setTimelineDays(event.target.value)} placeholder="14" className="h-14 w-full rounded-[18px] border border-white/10 bg-[#2a223a] px-4 text-base text-white outline-none placeholder:text-white/30 focus:border-[#b18cff]" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs uppercase tracking-[0.24em] text-[#bcaee6]">Revisions</span>
                  <input value={revisionAllowance} onChange={(event) => setRevisionAllowance(event.target.value)} placeholder="2" className="h-14 w-full rounded-[18px] border border-white/10 bg-[#2a223a] px-4 text-base text-white outline-none placeholder:text-white/30 focus:border-[#b18cff]" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs uppercase tracking-[0.24em] text-[#bcaee6]">Reference Links</span>
                  <textarea value={referenceLinks} onChange={(event) => setReferenceLinks(event.target.value)} placeholder="One link per line" className="min-h-[110px] w-full rounded-[18px] border border-white/10 bg-[#2a223a] px-4 py-3 text-base text-white outline-none placeholder:text-white/30 focus:border-[#b18cff]" />
                </label>
                <label className="block space-y-2 md:col-span-2">
                  <span className="text-xs uppercase tracking-[0.24em] text-[#bcaee6]">Project Description</span>
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the sonic atmosphere, references, and what the producer should deliver..." className="min-h-[150px] w-full rounded-[20px] border border-white/10 bg-[#2a223a] px-4 py-4 text-base text-white outline-none placeholder:text-white/24 focus:border-[#b18cff]" />
                </label>
              </div>
            </div>
          </form>

          <aside className="space-y-5">
            <section className="rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(182,154,255,0.20),rgba(255,255,255,0.04))] p-5">
              <p className="text-xs uppercase tracking-[0.26em] text-[#d3c4ff]">Negotiation Engine</p>
              <div className="mt-6 space-y-4 text-sm text-white/76">
                <div className="flex items-start justify-between gap-4"><span>Base Price</span><span>Rs {formatCurrency(basePrice)}</span></div>
                <div className="flex items-start justify-between gap-4"><span>Project Volume</span><span>{trackCount >= bulkThreshold ? `x ${bulkFactor.toFixed(2)} bulk discount` : "No bulk discount"}</span></div>
              </div>
              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/52">Total Market Price</p>
                <p className="mt-2 text-4xl font-semibold text-white">Rs {formatCurrency(marketPrice)}</p>
              </div>
              <div className="mt-6 space-y-3">
                <p className="text-xs uppercase tracking-[0.22em] text-[#d3c4ff]">Your Offer Price</p>
                <div className="flex items-center justify-between gap-3">
                  <button type="button" onClick={() => adjustOfferPrice("down")} disabled={currentOffer <= minOffer} className="flex h-14 w-14 items-center justify-center rounded-[16px] border border-white/10 bg-[#20182e] text-white transition hover:bg-white/5 disabled:opacity-40">
                    <Minus className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                  </button>
                  <div className="min-w-0 flex-1 rounded-[22px] border border-white/10 bg-[#09070d] px-4 py-5 text-center">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">Proposed</p>
                    <p className="mt-2 text-3xl font-semibold text-[#c6b2ff]">Rs {formatCurrency(currentOffer)}</p>
                  </div>
                  <button type="button" onClick={() => adjustOfferPrice("up")} disabled={currentOffer >= marketPrice} className="flex h-14 w-14 items-center justify-center rounded-[16px] border border-[#b59cff]/40 bg-[#ab91ff] text-[#1c1330] transition hover:bg-[#c0acff] disabled:opacity-40">
                    <Plus className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
                <input value={offerPrice} onChange={(event) => setOfferPrice(event.target.value)} className="h-14 w-full rounded-[18px] border border-white/10 bg-[#2a223a] px-4 text-base text-white outline-none focus:border-[#b18cff]" />
                <p className={`text-xs ${offerTooLow ? "text-[#ffb4a9]" : "text-white/45"}`}>Fair use policy: max negotiation cap is 20%. Minimum offer is Rs {formatCurrency(minOffer)}.</p>
              </div>
              <button type="submit" form="hiring-form" disabled={submitting || loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#a98fff,#7f60ff)] px-4 py-4 text-sm font-semibold text-[#140f20] disabled:opacity-60">
                <Wand2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                {submitting ? "Posting hiring brief..." : "Post Hiring Ad"}
              </button>
            </section>

            <section className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5 text-sm text-white/68">
              <div className="flex items-center gap-3 text-white">
                <Sparkles className="h-4 w-4 text-[#ff95c5]" strokeWidth={1.8} aria-hidden="true" />
                <p className="font-semibold">Pro Tip</p>
              </div>
              <p className="mt-3 leading-6">Detailed briefs with backend-tagged moods and instruments usually turn into faster proposal review and cleaner milestone planning.</p>
            </section>
          </aside>
        </div>
      </section>

      <section className="surface-panel rounded-[30px] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Active projects</p>
            <h2 className="mt-2 text-2xl font-semibold">Milestones, deliverables, and workflow stages</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/72">{projects.length} projects</span>
        </div>
        <div className="mt-5 space-y-4">
          {loading ? <p className="text-sm text-white/55">Loading projects...</p> : null}
          {!loading && projects.map((project) => (
            <div key={project.id} className="rounded-[24px] border border-white/10 bg-[#0d1218] p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-white">{project.title}</p>
                  <p className="mt-1 text-sm text-white/62">{formatProjectType(project.project_type)} | Budget Rs {formatCurrency(project.budget)} | Offer Rs {formatCurrency(project.offer_price)} {project.producer_username ? `| ${project.producer_username}` : ""}</p>
                  <p className="mt-2 text-sm text-white/58">{project.target_genre_style || project.description}</p>
                </div>
                <span className="rounded-full border border-[#77d6c8]/25 bg-[#77d6c8]/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#9ee8dc]">{project.workflow_summary?.stage_label || project.workflow_stage}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-white/65">Tracks: {project.expected_track_count}</div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-white/65">Genre: {project.preferred_genre || "-"}</div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-white/65">Timeline: {project.delivery_timeline_days ?? "-"} days</div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-white/65">Revisions: {project.revision_allowance}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.instrument_types.map((item) => <span key={item} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">{item}</span>)}
                {project.mood_types.map((item) => <span key={item} className="rounded-full border border-[#ff9bc8]/20 bg-[#ff9bc8]/10 px-3 py-1 text-xs text-[#ffd4e8]">{item}</span>)}
              </div>
              <div className="mt-4 space-y-3">
                {project.milestones.map((milestone) => (
                  <div key={milestone.id} className="rounded-[20px] border border-white/10 bg-[#101722] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{milestone.title}</p>
                        <p className="mt-1 text-sm text-white/60">{milestone.description || "Milestone detail pending."}</p>
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/62">{milestone.status}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/55">
                      <span>Amount: Rs {milestone.amount}</span>
                      <span>Due: {milestone.due_date || "TBD"}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {milestone.deliverables.map((deliverable) => (
                        <div key={deliverable.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/68">
                          <p>{deliverable.version_label || "Submission"} | {deliverable.status}</p>
                          <p className="mt-1 text-white/55">{deliverable.note || "No note provided."}</p>
                        </div>
                      ))}
                      {milestone.deliverables.length === 0 ? <p className="text-sm text-white/50">No deliverables uploaded yet.</p> : null}
                    </div>
                  </div>
                ))}
                {project.milestones.length === 0 ? <p className="text-sm text-white/55">No milestones added yet. This project is waiting for the next collaboration step.</p> : null}
              </div>
              {project.linked_conversation_hint ? <p className="mt-3 text-sm text-white/52">Chat hint: {project.linked_conversation_hint}</p> : null}
            </div>
          ))}
          {!loading && projects.length === 0 ? <p className="text-sm text-white/55">No projects yet.</p> : null}
        </div>
        {message ? <p className="mt-4 text-sm text-[#9ee8dc]">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-[#ffb4a9]">{error}</p> : null}
      </section>
    </div>
  );
}


