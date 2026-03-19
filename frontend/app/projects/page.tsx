"use client";

import { FormEvent, useEffect, useState } from "react";

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
  producer: number;
  producer_username?: string;
  project_type: string;
  expected_track_count: number;
  target_genre_style?: string;
  reference_links?: string[];
  delivery_timeline_days?: number | null;
  revision_allowance: number;
  linked_conversation_hint?: string;
  workflow_summary?: { milestone_count: number; deliverable_count: number; funded_milestones: number; approved_milestones: number; stage_label: string };
  milestones: Milestone[];
};

const projectTypes = [
  { value: "custom_single", label: "Custom single" },
  { value: "ep", label: "EP" },
  { value: "album", label: "Album" },
  { value: "mix_master", label: "Mix & master" },
  { value: "sound_design", label: "Sound design" },
];

export default function ProjectsPage() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [producerId, setProducerId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("custom_single");
  const [trackCount, setTrackCount] = useState("1");
  const [genreStyle, setGenreStyle] = useState("Nephop / melodic trap");
  const [timelineDays, setTimelineDays] = useState("14");
  const [revisionAllowance, setRevisionAllowance] = useState("2");
  const [referenceLinks, setReferenceLinks] = useState("https://example.com/reference-1\nhttps://example.com/reference-2");
  const [budget, setBudget] = useState("300.00");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadProjects = async (accessToken: string) => {
    const data = await apiRequest<Project[]>("/projects/", { token: accessToken });
    setProjects(data);
  };

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      try {
        await loadProjects(token);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load projects");
      }
    };
    void run();
  }, [token]);

  const onCreateRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    try {
      await apiRequest("/projects/request/", {
        method: "POST",
        token,
        body: {
          producer: Number(producerId),
          title,
          description,
          project_type: projectType,
          expected_track_count: Number(trackCount),
          target_genre_style: genreStyle,
          reference_links: referenceLinks.split("\n").map((item) => item.trim()).filter(Boolean),
          delivery_timeline_days: Number(timelineDays),
          revision_allowance: Number(revisionAllowance),
          budget,
        },
      });
      setMessage("Structured project brief sent.");
      await loadProjects(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-[34px] p-6 md:p-8">
        <p className="eyebrow">Collaboration</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Hire a producer for a custom single, EP, or full album without leaving BeatKosh.</h1>
        <p className="mt-4 max-w-3xl text-white/68">
          This workspace keeps the existing project engine, but now frames it as a real music-production flow: structured briefs,
          milestones, deliverables, and an obvious path from beat discovery into deeper collaboration.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="surface-panel rounded-[30px] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Active projects</p>
              <h2 className="mt-2 text-2xl font-semibold">Milestones, deliverables, and workflow stages</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/72">
              {projects.length} projects
            </span>
          </div>
          <div className="mt-5 space-y-4">
            {projects.map((project) => (
              <div key={project.id} className="rounded-[24px] border border-white/10 bg-[#0d1218] p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">{project.title}</p>
                    <p className="mt-1 text-sm text-white/62">
                      {project.project_type.replaceAll("_", " ")} | Budget Rs {project.budget} | Producer #{project.producer}
                    </p>
                    <p className="mt-2 text-sm text-white/58">{project.target_genre_style || project.description}</p>
                  </div>
                  <span className="rounded-full border border-[#77d6c8]/25 bg-[#77d6c8]/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#9ee8dc]">
                    {project.workflow_summary?.stage_label || project.workflow_stage}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-white/65">
                    Tracks: {project.expected_track_count}
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-white/65">
                    Timeline: {project.delivery_timeline_days ?? "-"} days
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-white/65">
                    Revisions: {project.revision_allowance}
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-white/65">
                    Deliverables: {project.workflow_summary?.deliverable_count ?? 0}
                  </div>
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
            {projects.length === 0 ? <p className="text-sm text-white/55">No projects yet.</p> : null}
          </div>
        </section>

        <aside className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Hire producer</p>
          <h2 className="mt-2 text-2xl font-semibold">Submit a structured production brief</h2>
          <form onSubmit={onCreateRequest} className="mt-5 space-y-3">
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="Producer User ID" value={producerId} onChange={(e) => setProducerId(e.target.value)} required />
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="Project Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <select className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" value={projectType} onChange={(e) => setProjectType(e.target.value)}>
              {projectTypes.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <textarea className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="Brief" value={description} onChange={(e) => setDescription(e.target.value)} required />
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="Target genre / style" value={genreStyle} onChange={(e) => setGenreStyle(e.target.value)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="Expected track count" value={trackCount} onChange={(e) => setTrackCount(e.target.value)} required />
              <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="Timeline (days)" value={timelineDays} onChange={(e) => setTimelineDays(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="Revision allowance" value={revisionAllowance} onChange={(e) => setRevisionAllowance(e.target.value)} />
              <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="Budget" value={budget} onChange={(e) => setBudget(e.target.value)} required />
            </div>
            <textarea className="min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="Reference links, one per line" value={referenceLinks} onChange={(e) => setReferenceLinks(e.target.value)} />
            <button className="w-full rounded-full bg-[#77d6c8] px-4 py-3 font-medium text-[#0d1618]">Send project brief</button>
          </form>
          <div className="mt-4 rounded-[24px] border border-white/10 bg-[#0d1218] p-4 text-sm text-white/62">
            Use this for custom singles, EP packs, full albums, and mix/master engagements. The backend remains compatible with your existing project flow.
          </div>
          {message ? <p className="mt-3 text-sm text-[#9ee8dc]">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-[#ffb4a9]">{error}</p> : null}
        </aside>
      </div>
    </div>
  );
}
