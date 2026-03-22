"use client";

import { ChangeEvent, FormEvent, ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CircleDollarSign,
  Disc3,
  Play,
  Search,
  Sparkles,
  Upload,
  WalletCards,
} from "lucide-react";

import { useAuth } from "@/app/auth-context";
import { apiRequest, resolveMediaUrl } from "@/lib/api";
import { Beat22Summary, fetchBeat22Summary } from "@/lib/reference";

type License = { id: number; name: string; includes_wav?: boolean; includes_stems?: boolean; is_exclusive?: boolean };
type Wallet = { id: number; balance: string; entries: { id: number }[] };
type Onboarding = {
  progress_percent: number;
  checklist: { id: string; label: string; done: boolean; detail: string }[];
  trust_summary: { trust_score: number; badges: string[]; profile_completion: number };
};
type RangeKey = "7d" | "30d" | "90d" | "365d";

type DashboardSeriesPoint = {
  label: string;
  plays?: number;
  sales?: number;
  revenue?: number;
};

type DashboardSummary = {
  plays: number;
  likes: number;
  purchases: number;
  conversion_rate: number;
  skip_events: number;
  hiring_inquiry_count: number;
  follower_count?: number;
  verified?: boolean;
  activity_drop_count?: number;
  selected_range: { key: RangeKey; days: number; start: string; end: string };
  performance_series: DashboardSeriesPoint[];
  revenue_series: DashboardSeriesPoint[];
};
type FeaturedCoverPhoto = {
  id: number;
  title: string;
  image_url: string;
};
type Beat = {
  id: number;
  title: string;
  genre: string;
  bpm?: number | null;
  base_price: string;
  play_count?: number;
  like_count?: number;
  created_at?: string;
};
type Project = {
  id: number;
  title: string;
  status: string;
  workflow_stage: string;
  project_type: string;
  expected_track_count: number;
  preferred_genre?: string;
  delivery_timeline_days?: number | null;
  workflow_summary?: {
    milestone_count: number;
    deliverable_count: number;
    funded_milestones: number;
    approved_milestones: number;
    stage_label: string;
  };
};

function formatCurrency(value?: string | number | null) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0";
  return numeric.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatCompact(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(value);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function normalizePoints(values: number[], width: number, height: number) {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

function normalizeArea(values: number[], width: number, height: number) {
  const line = normalizePoints(values, width, height);
  if (!line) return "";
  return `0,${height} ${line} ${width},${height}`;
}

function summarizeTrend(values: number[]) {
  if (values.length < 2) return "+0%";
  const midpoint = Math.max(1, Math.floor(values.length / 2));
  const firstHalf = values.slice(0, midpoint).reduce((sum, value) => sum + value, 0);
  const secondHalf = values.slice(midpoint).reduce((sum, value) => sum + value, 0);
  if (firstHalf === 0) return secondHalf > 0 ? "+100%" : "+0%";
  const delta = ((secondHalf - firstHalf) / firstHalf) * 100;
  return `${delta >= 0 ? "+" : ""}${Math.round(delta)}%`;
}

function getProjectBucket(project: Project) {
  const raw = `${project.workflow_summary?.stage_label ?? ""} ${project.workflow_stage} ${project.status}`.toLowerCase();
  if (raw.includes("cancel") || raw.includes("reject")) return "Cancelled";
  if (raw.includes("complete") || raw.includes("approve") || raw.includes("deliver")) return "Completed";
  if (
    raw.includes("fund") ||
    raw.includes("progress") ||
    raw.includes("active") ||
    raw.includes("work") ||
    raw.includes("production")
  ) {
    return "WIP";
  }
  return "Negotiation";
}

function StatCard({
  label,
  value,
  hint,
  badge,
  icon,
  children,
  tone = "brand",
}: {
  label: string;
  value: string;
  hint: string;
  badge?: string;
  icon: ReactNode;
  children?: ReactNode;
  tone?: "brand" | "pink" | "neutral";
}) {
  const toneClass =
    tone === "pink"
      ? "from-[#2d1a2f] to-[#231a30]"
      : tone === "neutral"
        ? "from-[rgba(255,255,255,0.08)] to-[rgba(255,255,255,0.03)]"
        : "from-[#281f3c] to-[#21192f]";

  return (
    <div className={`relative overflow-hidden rounded-[30px] border border-white/8 bg-gradient-to-br ${toneClass} p-6 shadow-[0_24px_60px_rgba(3,3,8,0.28)]`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(175,137,255,0.22),transparent_32%)]" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/32">{label}</p>
            <p className="mt-4 text-4xl font-semibold tracking-tight text-white">{value}</p>
          </div>
          <div className="flex items-center gap-3">
            {badge ? <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-[#d5c8ff]">{badge}</span> : null}
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#bca8ff]">
              {icon}
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm leading-6 text-white/58">{hint}</p>
        {children ? <div className="mt-5">{children}</div> : null}
      </div>
    </div>
  );
}

export default function ProducerStudioPage() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<Beat22Summary | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [featuredCovers, setFeaturedCovers] = useState<FeaturedCoverPhoto[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<RangeKey>("30d");
  const [analyticsSearch, setAnalyticsSearch] = useState("");

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("HipHop");
  const [bpm, setBpm] = useState("90");
  const [basePrice, setBasePrice] = useState("29.00");
  const [customCover, setCustomCover] = useState<File | null>(null);
  const [selectedFeaturedCoverId, setSelectedFeaturedCoverId] = useState<number | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const [referenceData, licenseData, featuredCoverData] = await Promise.all([
          fetchBeat22Summary(),
          apiRequest<License[]>("/beats/licenses/"),
          apiRequest<FeaturedCoverPhoto[]>("/beats/featured-covers/"),
        ]);
        setSummary(referenceData);
        setLicenses(licenseData);
        setFeaturedCovers(featuredCoverData);
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
        const [walletData, onboardingData, dashboardData, beatData, projectData] = await Promise.all([
          apiRequest<Wallet>("/payments/wallet/me/", { token }),
          apiRequest<Onboarding>("/account/producer-onboarding/me/", { token }),
          apiRequest<DashboardSummary>(`/analytics/producer/${user.id}/dashboard-summary/?range=${selectedRange}`, { token }),
          apiRequest<Beat[]>(`/beats/?producer=${user.id}`),
          apiRequest<Project[]>("/projects/", { token }),
        ]);
        setWallet(walletData);
        setOnboarding(onboardingData);
        setDashboard(dashboardData);
        setBeats(beatData);
        setProjects(projectData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load producer dashboard");
      }
    };
    void run();
  }, [selectedRange, token, user?.id]);

  const handleCustomCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setCustomCover(file);
    if (file) {
      setSelectedFeaturedCoverId(null);
    }
  };

  const onUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("title", title);
      form.append("genre", genre);
      form.append("bpm", String(Number(bpm)));
      form.append("base_price", basePrice);
      licenses.slice(0, 2).forEach((license) => form.append("license_ids", String(license.id)));
      if (customCover) {
        form.append("cover_art_upload", customCover);
      }
      if (selectedFeaturedCoverId) {
        form.append("featured_cover_photo_id", String(selectedFeaturedCoverId));
      }

      await apiRequest("/beats/upload/", {
        method: "POST",
        token,
        body: form,
        isFormData: true,
      });
      setTitle("");
      setCustomCover(null);
      setSelectedFeaturedCoverId(null);
      setSuccess("Beat uploaded with your selected cover.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const sortedBeats = [...beats].sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0));
  const filteredBeats = analyticsSearch
    ? sortedBeats.filter((beat) => beat.title.toLowerCase().includes(analyticsSearch.toLowerCase()))
    : sortedBeats;
  const performanceSeries = dashboard?.performance_series ?? [];
  const revenueSeries = dashboard?.revenue_series ?? [];
  const chartLabels = performanceSeries.map((point) => point.label);
  const playSeries = performanceSeries.map((point) => point.plays ?? 0);
  const salesSeries = performanceSeries.map((point) => point.sales ?? 0);
  const revenueTrend = revenueSeries.map((point) => point.revenue ?? 0);
  const topPlayLine = normalizePoints(playSeries, 100, 50);
  const topSalesLine = normalizePoints(salesSeries, 100, 50);
  const tractionSeries = [...filteredBeats.slice(0, 5)].reverse().map((beat) => beat.play_count ?? 0);
  const tractionArea = normalizeArea(tractionSeries, 100, 54);
  const tractionLine = normalizePoints(tractionSeries, 100, 54);

  const genreCount = beats.reduce<Record<string, number>>((accumulator, beat) => {
    const key = beat.genre || "Unclassified";
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
  const topGenreEntry = Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0];
  const bpmBeats = beats.filter((beat) => Number.isFinite(beat.bpm));
  const averageBpm = bpmBeats.reduce((sum, beat) => sum + Number(beat.bpm ?? 0), 0) / Math.max(bpmBeats.length, 1);

  const projectBuckets = projects.reduce<Record<string, number>>(
    (accumulator, project) => {
      const bucket = getProjectBucket(project);
      accumulator[bucket] = (accumulator[bucket] ?? 0) + 1;
      return accumulator;
    },
    { Negotiation: 0, WIP: 0, Completed: 0, Cancelled: 0 },
  );
  const projectTotal = Object.values(projectBuckets).reduce((sum, value) => sum + value, 0);
  const donutSegments = [
    { label: "Negotiation", value: projectBuckets.Negotiation, color: "#7d59ff" },
    { label: "WIP", value: projectBuckets.WIP, color: "#b197ff" },
    { label: "Completed", value: projectBuckets.Completed, color: "#ff92c2" },
    { label: "Cancelled", value: projectBuckets.Cancelled, color: "#5f586f" },
  ];

  let currentAngle = -90;
  const donutGradient = donutSegments
    .map((segment) => {
      const size = projectTotal > 0 ? (segment.value / projectTotal) * 360 : 0;
      const start = currentAngle;
      const end = currentAngle + size;
      currentAngle = end;
      return `${segment.color} ${start}deg ${end}deg`;
    })
    .join(", ");

  const readyCount = onboarding?.checklist.filter((item) => item.done).length ?? 0;
  const bestBeat = filteredBeats[0] ?? sortedBeats[0];
  const revenueDelta = summarizeTrend(revenueTrend);
  const readinessPercent = clampPercent(onboarding?.progress_percent ?? 0);
  const conversionPercent = clampPercent(dashboard?.conversion_rate ?? 0);
  const currentRangeLabel =
    selectedRange === "7d" ? "Last 7 Days" : selectedRange === "90d" ? "Last 90 Days" : selectedRange === "365d" ? "Last 12 Months" : "Last 30 Days";

  const exportAnalyticsSnapshot = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      range: dashboard?.selected_range ?? { key: selectedRange },
      summary: dashboard,
      walletBalance: wallet?.balance ?? "0",
      projectBuckets,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `beatskosh-producer-analytics-${selectedRange}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-[36px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(165,122,255,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,148,206,0.12),transparent_24%),linear-gradient(180deg,#120d1e_0%,#0c0914_100%)] p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/6 pb-5">
          <div className="flex min-w-[280px] flex-1 items-center gap-3 rounded-full border border-white/8 bg-white/[0.04] px-4 py-3 text-white/54">
            <Search className="h-4 w-4 text-white/40" strokeWidth={1.9} aria-hidden="true" />
            <input
              value={analyticsSearch}
              onChange={(event) => setAnalyticsSearch(event.target.value)}
              placeholder="Search analytics or beats..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/34"
            />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/72 transition hover:bg-white/[0.08]">
              <Bell className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </button>
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#b99dff]/35 bg-[radial-gradient(circle_at_top,rgba(185,157,255,0.35),rgba(255,255,255,0.05))] text-sm font-semibold text-white">
              {(user?.username?.[0] ?? "P").toUpperCase()}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.26em] text-[#c7b4ff]">Producer analytics</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">Overview</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-white/62">
              Live performance metrics for your BeatKosh studio, mapped to wallet growth, catalog momentum, hiring
              demand, and project delivery.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {([
              { key: "7d", label: "7D" },
              { key: "30d", label: "30D" },
              { key: "90d", label: "90D" },
            ] as { key: RangeKey; label: string }[]).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSelectedRange(option.key)}
                className={`rounded-full px-4 py-2.5 text-sm transition ${
                  selectedRange === option.key
                    ? "bg-[#2a1f3c] text-white shadow-[0_10px_30px_rgba(0,0,0,0.22)]"
                    : "border border-white/10 bg-white/[0.04] text-white/72 hover:bg-white/[0.08]"
                }`}
              >
                {option.label}
              </button>
            ))}
            <button type="button" onClick={exportAnalyticsSnapshot} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/82 transition hover:bg-white/[0.08]">
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Export snapshot
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm text-white/42">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{currentRangeLabel}</span>
          <span>Using real plays, paid orders, and wallet-linked revenue series.</span>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <StatCard
            label="Total Revenue"
            value={`Rs. ${formatCurrency(wallet?.balance)}`}
            hint={`Wallet settlements across ${wallet?.entries.length ?? 0} ledger entries and ${dashboard?.purchases ?? 0} paid beat orders.`}
            badge={revenueDelta}
            icon={<WalletCards className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />}
          >
            <div className="flex h-20 items-end gap-2">
              {(revenueTrend.length ? revenueTrend : [2, 4, 3, 6, 8, 5]).map((value, index, array) => (
                <div
                  key={`revenue-bar-${index}`}
                  className={`flex-1 rounded-t-[10px] ${index === array.length - 1 ? "bg-[#b79cff]" : "bg-[#4e416f]"}`}
                  style={{ height: `${24 + (value / Math.max(...array, 1)) * 48}px` }}
                />
              ))}
            </div>
          </StatCard>

          <StatCard
            label="Active Hiring Requests"
            value={String(dashboard?.hiring_inquiry_count ?? 0)}
            hint="Projects currently in negotiation, review, or production planning."
            icon={<BriefcaseBusiness className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />}
            tone="pink"
          >
            <Link href="/projects" className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium text-white/92 transition hover:bg-white/[0.09]">
              View details
            </Link>
          </StatCard>

          <StatCard
            label="Conversion Rate"
            value={`${conversionPercent.toFixed(1)}%`}
            hint={`Based on ${dashboard?.plays ?? 0} tracked plays and ${dashboard?.purchases ?? 0} purchases. Skip events: ${dashboard?.skip_events ?? 0}.`}
            icon={<CircleDollarSign className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />}
            tone="neutral"
          >
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 rounded-full border border-white/8 bg-white/[0.03]">
                <div
                  className="absolute inset-2 rounded-full"
                  style={{
                    background: `conic-gradient(#b99dff ${conversionPercent * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                  }}
                />
                <div className="absolute inset-[18px] rounded-full bg-[#16111f]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/38">Benchmark</p>
                <p className="mt-1 text-sm text-white/60">
                  Trust score {onboarding?.trust_summary.trust_score ?? 0} with {dashboard?.likes ?? 0} likes feeding buyer intent.
                </p>
              </div>
            </div>
          </StatCard>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_360px]">
        <section className="overflow-hidden rounded-[34px] border border-white/8 bg-[linear-gradient(180deg,#161121_0%,#120d1b_100%)] p-6 shadow-[0_26px_70px_rgba(6,4,12,0.34)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-white">Sales & Plays Overview</h2>
              <p className="mt-2 text-base text-white/58">Daily catalog momentum using the selected analytics range instead of placeholder beat ordering.</p>
            </div>
            <div className="flex flex-wrap gap-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/82">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#b89dff]" />
                Total plays
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#8d63ff]" />
                Confirmed sales
              </span>
            </div>
          </div>

          <div className="mt-8">
            <svg viewBox="0 0 100 60" className="h-[300px] w-full">
              {[12, 28, 44].map((line) => (
                <line key={line} x1="0" y1={line} x2="100" y2={line} stroke="rgba(255,255,255,0.07)" strokeWidth="0.35" />
              ))}
              <polyline
                fill="none"
                stroke="#b89dff"
                strokeWidth="0.9"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={topPlayLine || "0,42 20,40 40,36 60,30 80,16 100,24"}
              />
              <polyline
                fill="none"
                stroke="#8d63ff"
                strokeWidth="0.8"
                strokeDasharray="2.4 1.6"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={topSalesLine || "0,50 20,49 40,47 60,43 80,38 100,42"}
              />
            </svg>
          </div>

          <div className={`mt-2 grid gap-3 text-xs uppercase tracking-[0.2em] text-white/36 ${chartLabels.length > 8 ? "grid-cols-4 sm:grid-cols-8" : "grid-cols-3 sm:grid-cols-6"}`}>
            {(chartLabels.length ? chartLabels : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </section>

        <aside className="overflow-hidden rounded-[34px] border border-white/8 bg-[linear-gradient(180deg,#181222_0%,#120d1b_100%)] p-6 shadow-[0_26px_70px_rgba(6,4,12,0.34)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-white">Project Status</h2>
              <p className="mt-2 text-sm text-white/58">Negotiation flow, in-progress work, completed deliveries, and drop-offs.</p>
            </div>
            {dashboard?.verified || onboarding?.trust_summary.trust_score ? (
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-[#bca8ff]">
                <BadgeCheck className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              </div>
            ) : null}
          </div>

          <div className="mt-7 flex justify-center">
            <div className="relative flex h-52 w-52 items-center justify-center rounded-full" style={{ background: `conic-gradient(${donutGradient || "#7d59ff 0deg 90deg, #b197ff 90deg 180deg, #ff92c2 180deg 270deg, #5f586f 270deg 360deg"})` }}>
              <div className="absolute inset-[28px] rounded-full bg-[#120d1b]" />
              <div className="relative text-center">
                <p className="text-5xl font-semibold tracking-tight text-white">{projectTotal}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/42">Total</p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-3 text-sm text-white/84 sm:grid-cols-2 xl:grid-cols-1">
            {donutSegments.map((segment) => (
              <div key={segment.label} className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                <span className="inline-flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ background: segment.color }} />
                  {segment.label}
                </span>
                <span className="text-white/58">{segment.value}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_420px]">
        <section className="overflow-hidden rounded-[34px] border border-white/8 bg-[linear-gradient(180deg,#17111f_0%,#110c18_100%)] p-6 shadow-[0_26px_70px_rgba(6,4,12,0.34)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-white">Catalog Traction</h2>
              <p className="mt-2 text-base text-white/58">Your strongest beat momentum, ranked by active play volume instead of generic vanity charts.</p>
            </div>
            {bestBeat ? (
              <span className="rounded-full border border-[#ff8eb8]/25 bg-[#ff8eb8]/12 px-4 py-2 text-sm font-medium text-[#ffb8d3]">
                Top beat: {bestBeat.title}
              </span>
            ) : null}
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
            <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,149,196,0.12),rgba(255,255,255,0.02))] p-5">
              <svg viewBox="0 0 100 60" className="h-[280px] w-full">
                <polygon points={tractionArea || "0,60 0,16 25,20 50,30 75,42 100,48 100,60"} fill="rgba(255,140,191,0.22)" />
                <polyline
                  fill="none"
                  stroke="#ff8ec2"
                  strokeWidth="1.1"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={tractionLine || "0,16 25,20 50,30 75,42 100,48"}
                />
              </svg>
              <div className="mt-3 grid grid-cols-5 gap-2 text-xs text-white/38">
                {filteredBeats.slice(0, 5).map((beat) => (
                  <span key={`traction-${beat.id}`} className="truncate">{beat.title.slice(0, 8)}</span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredBeats.slice(0, 4).map((beat, index) => (
                <div key={beat.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.18em] text-white/34">#{index + 1}</span>
                    <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-white/58">{beat.genre}</span>
                  </div>
                  <p className="mt-3 line-clamp-1 text-base font-semibold text-white">{beat.title}</p>
                  <div className="mt-3 flex items-center gap-3 text-sm text-white/56">
                    <span>{formatCompact(beat.play_count ?? 0)} plays</span>
                    <span>{formatCompact(beat.like_count ?? 0)} likes</span>
                  </div>
                </div>
              ))}
              {filteredBeats.length === 0 ? (
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-sm text-white/55">
                  Upload your first beat to unlock track-level analytics.
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="overflow-hidden rounded-[34px] border border-white/8 bg-[linear-gradient(180deg,#17111f_0%,#110c18_100%)] p-6 shadow-[0_26px_70px_rgba(6,4,12,0.34)]">
          <h2 className="text-3xl font-semibold tracking-tight text-white">Studio Footprint</h2>
          <p className="mt-2 text-base text-white/58">Platform-fit metrics that replace the reference map with signals BeatKosh actually tracks today.</p>

          <div className="mt-8 rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_20%_20%,rgba(171,142,255,0.22),transparent_18%),radial-gradient(circle_at_80%_26%,rgba(171,142,255,0.18),transparent_14%),radial-gradient(circle_at_52%_48%,rgba(171,142,255,0.26),transparent_18%),radial-gradient(circle_at_32%_76%,rgba(171,142,255,0.22),transparent_15%),linear-gradient(180deg,#191322_0%,#120d1b_100%)] p-5">
            <div className="grid min-h-[260px] place-items-center rounded-[24px] border border-white/6 bg-black/10">
              <div className="max-w-[240px] text-center">
                <Disc3 className="mx-auto h-10 w-10 text-[#b8a0ff]" strokeWidth={1.7} aria-hidden="true" />
                <p className="mt-4 text-sm uppercase tracking-[0.22em] text-white/38">Catalog center</p>
                <p className="mt-2 text-base leading-7 text-white/62">
                  {beats.length} live beats, {dashboard?.follower_count ?? 0} followers, and {dashboard?.activity_drop_count ?? 0} activity drops driving visibility.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/34">Top genre</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{topGenreEntry?.[0] ?? "Not set"}</p>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/34">Average BPM</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-[#c5b3ff]">{Number.isFinite(averageBpm) ? Math.round(averageBpm) : 0}</p>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="surface-panel rounded-[32px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Producer readiness</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Trust and publish checklist</h2>
              <p className="mt-2 max-w-2xl text-white/58">
                Same premium panel language as the reference, but focused on whether your storefront is truly ready to sell and close hiring work.
              </p>
            </div>
            <div className="min-w-[220px] rounded-[24px] border border-white/10 bg-[#120f19] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/36">Readiness</p>
              <p className="mt-2 text-4xl font-semibold text-white">{readinessPercent}%</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/6">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#a68cff,#7b5cff)]" style={{ width: `${readinessPercent}%` }} />
              </div>
              <p className="mt-3 text-sm text-white/55">{readyCount} of {onboarding?.checklist.length ?? 0} checklist items completed.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {(onboarding?.checklist ?? []).map((item) => (
              <div key={item.id} className="rounded-[24px] border border-white/10 bg-[#0d0a14] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-medium text-white">{item.label}</p>
                    <p className="mt-1 text-sm text-white/56">{item.detail}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${item.done ? "bg-[#9b7dff]/16 text-[#d7cbff]" : "bg-white/7 text-white/55"}`}>
                    {item.done ? "Ready" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(onboarding?.trust_summary.badges ?? []).map((badge) => (
              <span key={badge} className="rounded-full border border-[#9a7cff]/24 bg-[#9a7cff]/10 px-3 py-1.5 text-xs text-[#e1d7ff]">
                {badge}
              </span>
            ))}
          </div>
        </section>

        <section className="surface-panel rounded-[32px] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Quick actions</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Studio controls</h2>
            </div>
            <Sparkles className="h-5 w-5 text-[#b596ff]" strokeWidth={1.8} aria-hidden="true" />
          </div>

          <div className="mt-5 grid gap-3">
            <Link href="/producer/upload-wizard?flow=beat&fresh=1" className="rounded-[24px] border border-white/10 bg-[#100c18] p-4 transition hover:bg-[#161121]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8d63ff]/16 text-[#c6b1ff]">
                  <Upload className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-white">Open upload wizard</p>
                  <p className="mt-1 text-sm text-white/56">Launch the faster beat flow with fresh metadata.</p>
                </div>
              </div>
            </Link>
            <Link href="/projects" className="rounded-[24px] border border-white/10 bg-[#100c18] p-4 transition hover:bg-[#161121]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff92c2]/12 text-[#ffb7d3]">
                  <BriefcaseBusiness className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-white">Open hiring workspace</p>
                  <p className="mt-1 text-sm text-white/56">Check negotiation stages, funding, and delivery movement.</p>
                </div>
              </div>
            </Link>
            <Link href="/wallet" className="rounded-[24px] border border-white/10 bg-[#100c18] p-4 transition hover:bg-[#161121]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#9de6d8]/12 text-[#bff4ea]">
                  <BarChart3 className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-white">Review wallet and payouts</p>
                  <p className="mt-1 text-sm text-white/56">See ledger movement, settlements, and payout readiness.</p>
                </div>
              </div>
            </Link>
          </div>

          <div className="mt-6 rounded-[26px] border border-white/10 bg-[#0e0a15] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-white/34">Signals</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/34">Followers</p>
                <p className="mt-2 text-3xl font-semibold text-white">{dashboard?.follower_count ?? 0}</p>
              </div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/34">Activity drops</p>
                <p className="mt-2 text-3xl font-semibold text-white">{dashboard?.activity_drop_count ?? 0}</p>
              </div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/34">Catalog count</p>
                <p className="mt-2 text-3xl font-semibold text-white">{beats.length}</p>
              </div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/34">Featured covers</p>
                <p className="mt-2 text-3xl font-semibold text-white">{featuredCovers.length}</p>
              </div>
            </div>
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="surface-panel rounded-[32px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Upload now</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Launch your next beat</h2>
              <p className="mt-2 max-w-2xl text-white/58">
                Keep the analytics page intact, but still publish without leaving the studio.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/66">
              {licenses.length} license templates ready
            </span>
          </div>

          <form onSubmit={onUpload} className="mt-5 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35 md:col-span-2" placeholder="Beat title" value={title} onChange={(event) => setTitle(event.target.value)} required />
              <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="Genre" value={genre} onChange={(event) => setGenre(event.target.value)} required />
              <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="BPM" value={bpm} onChange={(event) => setBpm(event.target.value)} required />
              <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35 md:col-span-2" placeholder="Base price" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} required />
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[#0d1218] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white/90">Upload cover</p>
                  <p className="text-xs text-white/55">Choose your own image. This clears any featured selection.</p>
                </div>
                {customCover ? <span className="rounded-full border border-[#77d6c8]/30 bg-[#77d6c8]/10 px-3 py-1 text-xs text-[#9ee8dc]">{customCover.name}</span> : null}
              </div>
              <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleCustomCoverChange} className="mt-4 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75 file:mr-4 file:rounded-full file:border-0 file:bg-[#77d6c8] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#0d1618]" />
            </div>

            <button disabled={uploading} className="rounded-full bg-[linear-gradient(135deg,#ab91ff,#7f60ff)] px-5 py-3 font-medium text-[#140f20] disabled:opacity-60">
              {uploading ? "Uploading..." : "Upload beat"}
            </button>
          </form>

          {success ? <p className="mt-3 text-sm text-[#9ee8dc]">{success}</p> : null}
        </section>

        <section className="surface-panel rounded-[32px] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Featured cover photos</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Fast visual selection</h2>
            </div>
            <Play className="h-5 w-5 text-[#b69eff]" strokeWidth={1.8} aria-hidden="true" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {featuredCovers.slice(0, 4).map((cover) => {
              const selected = selectedFeaturedCoverId === cover.id;
              return (
                <button
                  key={cover.id}
                  type="button"
                  onClick={() => {
                    setSelectedFeaturedCoverId(cover.id);
                    setCustomCover(null);
                  }}
                  className={`overflow-hidden rounded-[22px] border text-left transition ${selected ? "border-[#ab91ff] bg-[#ab91ff]/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"}`}
                >
                  <div className="relative aspect-[4/3] bg-[#17181c]">
                    <Image src={resolveMediaUrl(cover.image_url)} alt={cover.title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-white/88">{cover.title}</p>
                    <p className="mt-1 text-xs text-white/52">{selected ? "Selected for current upload" : "Click to use this cover"}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {featuredCovers.length === 0 ? <p className="mt-4 text-sm text-white/55">No featured covers uploaded yet. Add them in Django admin first.</p> : null}

          <div className="mt-6 rounded-[24px] border border-white/10 bg-[#0d0a14] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/34">Reference mapping</p>
            <p className="mt-2 text-sm leading-6 text-white/58">
              {summary
                ? `${summary.roles.producer.screens.length} producer reference screens and ${summary.feature_map.producer.length} mapped feature tracks are available for future iterations.`
                : "Loading producer reference context..."}
            </p>
          </div>
        </section>
      </section>

      {error ? <p className="text-sm text-[#ffb4a9]">{error}</p> : null}
    </div>
  );
}






