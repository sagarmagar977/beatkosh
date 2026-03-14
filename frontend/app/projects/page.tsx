"use client";

import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { apiRequest } from "@/lib/api";

type Project = { id: number; title: string; status: string; budget: string; producer: number };

export default function ProjectsPage() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [producerId, setProducerId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("300.00");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      try {
        const data = await apiRequest<Project[]>("/projects/", { token });
        setProjects(data);
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
          budget,
        },
      });
      setMessage("Project request sent");
      const data = await apiRequest<Project[]>("/projects/", { token });
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-[34px] p-6 md:p-8">
        <p className="eyebrow">Collaboration</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Hiring and project tracking now read like a product flow instead of an admin form.</h1>
        <p className="mt-4 max-w-3xl text-white/68">
          The backend currently exposes project requests and project lists. This screen reframes those endpoints around
          the artist-to-producer hiring journey defined in the PRD.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="surface-panel rounded-[30px] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Active projects</p>
              <h2 className="mt-2 text-2xl font-semibold">Milestones, budgets, and producer relationships</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/72">
              {projects.length} projects
            </span>
          </div>
          <p className="mt-3 text-sm text-white/55">Use backend producer IDs for now when sending a project request.</p>
          <div className="mt-5 space-y-3">
            {projects.map((project) => (
              <div key={project.id} className="rounded-[24px] border border-white/10 bg-[#0d1218] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">{project.title}</p>
                    <p className="mt-1 text-sm text-white/62">Budget ${project.budget} · Producer #{project.producer}</p>
                  </div>
                  <span className="rounded-full border border-[#77d6c8]/25 bg-[#77d6c8]/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#9ee8dc]">
                    {project.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-white/65">Milestones will sit here</div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-white/65">Deliverables view pending</div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-white/65">Messaging integration next</div>
                </div>
              </div>
            ))}
            {projects.length === 0 ? <p className="text-sm text-white/55">No projects yet.</p> : null}
          </div>
        </section>

        <aside className="surface-panel rounded-[30px] p-6">
          <p className="eyebrow">Hire producer</p>
          <h2 className="mt-2 text-2xl font-semibold">Submit a structured project brief</h2>
          <form onSubmit={onCreateRequest} className="mt-5 space-y-3">
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="Producer User ID" value={producerId} onChange={(e) => setProducerId(e.target.value)} required />
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="Project Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <textarea className="min-h-32 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="Brief" value={description} onChange={(e) => setDescription(e.target.value)} required />
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="Budget" value={budget} onChange={(e) => setBudget(e.target.value)} required />
            <button className="w-full rounded-full bg-[#77d6c8] px-4 py-3 font-medium text-[#0d1618]">Send request</button>
          </form>
          <div className="mt-4 rounded-[24px] border border-white/10 bg-[#0d1218] p-4 text-sm text-white/62">
            This should eventually expand with timeline, references, and attachments as specified in `design.md`.
          </div>
          {message ? <p className="mt-3 text-sm text-[#9ee8dc]">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-[#ffb4a9]">{error}</p> : null}
        </aside>
      </div>
    </div>
  );
}
