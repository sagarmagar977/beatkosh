"use client";

import Link from "next/link";
import { BookOpen, Clock3, Compass, Droplets, FileText, Heart, MessageSquareMore, Package2, Search, SlidersHorizontal, Upload, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { apiRequest, resolveMediaUrl } from "@/lib/api";
import { useBeatLibrary } from "@/lib/beat-library";

type FollowItem = {
  id: number;
  producer: number;
  producer_username: string;
};

type LikeItem = {
  id: number;
  beat: { id: number; title: string; producer_username: string };
};

type DropItem = {
  id: number;
  producer_username: string;
  message: string;
  beat?: { id: number; title: string } | null;
  created_at: string;
};

type Beat = {
  id: number;
  title: string;
  producer_username: string;
  genre?: string | null;
  bpm?: number | null;
  cover_art_obj?: string | null;
  play_count?: number;
  like_count?: number;
  created_at?: string;
};

type BrowseTile = {
  beat: Beat;
  accentClass: string;
  coverUrl: string | null;
};

type ShelfSectionKey = "popular" | "liked" | "recent";

type ShelfSection = {
  key: ShelfSectionKey;
  title: string;
  items: Beat[];
};

type SidebarMode =
  | "browse"
  | "kits"
  | "resources"
  | "hiring"
  | "liked"
  | "history"
  | "drops"
  | "following"
  | "playlists"
  | "studio"
  | "uploads"
  | "briefs"
  | "negotiations";

const accentClasses = [
  "from-[#ff2d95] via-[#d1166d] to-[#821948]",
  "from-[#0fb58d] via-[#07786c] to-[#053d42]",
  "from-[#9146ff] via-[#6823dd] to-[#35116f]",
  "from-[#3f66ff] via-[#2754c7] to-[#17306a]",
  "from-[#ff6b00] via-[#d63d00] to-[#772100]",
  "from-[#5f9fb8] via-[#487a98] to-[#24384b]",
  "from-[#9473b5] via-[#7956a4] to-[#432760]",
  "from-[#08a36f] via-[#0f7958] to-[#0d3e32]",
  "from-[#297eff] via-[#1f66cb] to-[#12386d]",
  "from-[#9352de] via-[#7b3dc2] to-[#402066]",
  "from-[#de127c] via-[#b01064] to-[#670536]",
  "from-[#7e7e7e] via-[#696969] to-[#383838]",
];

export default function ActivityPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [follows, setFollows] = useState<FollowItem[]>([]);
  const [likes, setLikes] = useState<LikeItem[]>([]);
  const [drops, setDrops] = useState<DropItem[]>([]);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedBeatId, setSelectedBeatId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<ShelfSectionKey | null>(null);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("browse");
  const library = useBeatLibrary(user?.id, token);
  const isProducerMode = user?.active_role === "producer";

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [followData, likeData, dropData, beatData] = await Promise.all([
        apiRequest<FollowItem[]>("/account/follows/me/", { token }),
        apiRequest<LikeItem[]>("/account/likes/beats/me/", { token }),
        apiRequest<DropItem[]>("/analytics/drops/feed/", { token }),
        apiRequest<Beat[]>("/beats/"),
      ]);
      setFollows(followData);
      setLikes(likeData);
      setDrops(dropData);
      setBeats(beatData);
      setSelectedBeatId((current) => current ?? beatData[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);


  const availableGenres = useMemo(() => {
    return Array.from(new Set(beats.map((beat) => beat.genre?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
  }, [beats]);

  const searchableBeats = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return beats.filter((beat) => {
      return (
        !normalized ||
        beat.title.toLowerCase().includes(normalized) ||
        beat.producer_username.toLowerCase().includes(normalized) ||
        (beat.genre ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [beats, query]);

  const browseTiles = useMemo<BrowseTile[]>(() => {
    return searchableBeats.map((beat, index) => ({
      beat,
      accentClass: accentClasses[index % accentClasses.length],
      coverUrl: resolveMediaUrl(beat.cover_art_obj),
    }));
  }, [searchableBeats]);

  const selectedGenreName = selectedGenre ?? browseTiles[0]?.beat.genre ?? availableGenres[0] ?? null;

  const genreTiles = useMemo(() => {
    return browseTiles
      .filter((tile) => tile.beat.genre)
      .reduce<BrowseTile[]>((accumulator, tile) => {
        if (accumulator.some((item) => item.beat.genre === tile.beat.genre)) {
          return accumulator;
        }
        accumulator.push(tile);
        return accumulator;
      }, []);
  }, [browseTiles]);

  const selectedGenreBeats = useMemo(() => {
    if (!selectedGenreName) {
      return searchableBeats;
    }
    return searchableBeats.filter((beat) => (beat.genre ?? "") === selectedGenreName);
  }, [searchableBeats, selectedGenreName]);

  const shelfSections = useMemo<ShelfSection[]>(() => {
    const popular = [...selectedGenreBeats].sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0));
    const liked = [...selectedGenreBeats].sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0));
    const recent = [...selectedGenreBeats].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
    return [
      { key: "popular", title: "Most Popular", items: popular },
      { key: "liked", title: "Top Liked", items: liked },
      { key: "recent", title: "New Releases", items: recent },
    ];
  }, [selectedGenreBeats]);

  const sidebarActions = useMemo(() => {
    const baseActions = [
      { key: "browse" as const, label: "Genre Browse", icon: Compass },
      { key: "kits" as const, label: "Sound Kits", icon: Package2, href: "/catalog" },
      { key: "hiring" as const, label: "Hiring", icon: FileText, href: "/projects" },
      { key: "resources" as const, label: "Resources", icon: BookOpen, href: "/resources" },
      { key: "liked" as const, label: "Liked", icon: Heart },
      { key: "history" as const, label: "Play History", icon: Clock3 },
      { key: "playlists" as const, label: "Playlists", icon: Clock3 },
      { key: "drops" as const, label: "Follower Drops", icon: Droplets },
      { key: "following" as const, label: "Followed By You", icon: Users },
    ];

    if (isProducerMode) {
      return [
        ...baseActions,
        { key: "studio" as const, label: "Studio", icon: SlidersHorizontal },
        { key: "uploads" as const, label: "Media Uploads", icon: Upload },
        { key: "negotiations" as const, label: "Negotiations", icon: MessageSquareMore },
      ];
    }

    return baseActions;
  }, [isProducerMode]);

  return (
    <div className="min-h-[calc(100vh-7rem)] rounded-[34px] border border-white/8 bg-[#090909] p-3 text-white shadow-[0_30px_120px_rgba(0,0,0,0.42)]">
      <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-[24px] bg-[#121212] p-4 xl:flex xl:h-[calc(100vh-10rem)] xl:flex-col xl:overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Hub shortcuts</p>
            </div>
            <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/75">{follows.length} follows</span>
          </div>

          <div className="mt-5 grid gap-2 xl:flex-1 xl:content-start">
            {sidebarActions.map((action) => {
              const Icon = action.icon;
              const active = sidebarMode === action.key;
              return (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => {
                    if ("href" in action && action.href) {
                      router.push(action.href);
                      return;
                    }
                    setSidebarMode(action.key);
                  }}
                  className={`flex w-full items-center gap-3 rounded-[18px] border px-3 py-2.5 text-left transition ${active ? "border-white/18 bg-white/[0.08]" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]"}`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] ${active ? "bg-[#8f5cff]/20 text-[#b598ff]" : "bg-white/[0.04] text-white/68"}`}>
                    <Icon className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                  </div>
                  <p className="min-w-0 truncate text-sm font-medium text-white">{action.label}</p>
                </button>
              );
            })}
          </div>
          </div>
        </aside>

        <main className="rounded-[24px] bg-[#121212] p-4 md:p-5">
          {sidebarMode === "browse" ? (
            <>
          <div className="rounded-[22px] bg-[linear-gradient(180deg,rgba(66,154,110,0.35),rgba(18,18,18,0.95)_45%)] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/55">Browse</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Browse all</h1>
                <p className="mt-2 max-w-2xl text-sm text-white/65">
                  This view turns BeatKosh Browse into a denser music-explorer layout, with real beat cover photos leading the discovery cards.
                </p>
              </div>

              <label className="flex h-12 w-full items-center gap-3 rounded-full border border-white/10 bg-[#0a0a0a]/70 px-4 text-sm text-white/60 md:max-w-sm">
                <Search className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What beat do you want to play?"
                  className="w-full bg-transparent text-white outline-none placeholder:text-white/35"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedGenre(null)}
                className={`rounded-full px-4 py-2 text-sm transition ${selectedGenre === null ? "bg-white text-black" : "bg-white/10 text-white/86 hover:bg-white/16"}`}
              >
                All genres
              </button>
              {availableGenres.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setSelectedGenre(chip);
                    setSidebarMode("browse");
                  }}
                  className={`rounded-full px-4 py-2 text-sm transition ${selectedGenre === chip ? "bg-white text-black" : "bg-white/10 text-white/86 hover:bg-white/16"}`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Genre shelf</h2>
              <span className="rounded-full bg-white/7 px-3 py-1 text-xs text-white/65">{genreTiles.length} genres loaded</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {genreTiles.map((tile) => (
                <button
                  key={`genre-${tile.beat.genre}`}
                  type="button"
                  onClick={() => {
                    setSelectedGenre(tile.beat.genre ?? null);
                    setSelectedBeatId(tile.beat.id);
                    setExpandedSection(null);
                  }}
                  className={`group relative min-h-[172px] overflow-hidden rounded-[18px] bg-gradient-to-br ${tile.accentClass} p-5 text-left transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_40px_rgba(0,0,0,0.32)] ${selectedGenreName === tile.beat.genre ? "ring-2 ring-white/30" : ""}`}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.12))]" />
                  <div className="relative z-20 max-w-[48%]">
                    <p className="absolute left-0 top-0 text-[2rem] font-semibold leading-[0.95] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.28)]">
                      {tile.beat.genre || tile.beat.title}
                    </p>
                  </div>

                  <div className="pointer-events-none absolute bottom-[-10px] right-[-18px] z-10 h-[124px] w-[124px] rotate-[24deg] overflow-hidden rounded-[12px] shadow-[0_20px_40px_rgba(0,0,0,0.34)] transition duration-300 group-hover:rotate-[16deg] group-hover:scale-[1.05] sm:h-[138px] sm:w-[138px]">
                    {tile.coverUrl ? (
                      <img src={tile.coverUrl} alt={tile.beat.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-black/20 text-xs text-white/70">No cover</div>
                    )}
                  </div>

                  <div className="pointer-events-none absolute bottom-3 right-[22px] z-20 max-w-[108px] rotate-[24deg] text-right text-[10px] font-medium uppercase tracking-[0.12em] text-white/92 transition duration-300 group-hover:rotate-[16deg]">
                    {tile.beat.title}
                  </div>
                </button>
              ))}
            </div>

            {selectedGenreName ? (
              <section className="overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,#7f5a95_0%,#4b3457_55%,#1a171d_100%)]">
                <div className="px-6 py-8 md:px-8 md:py-10">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/55">Genre</p>
                  <h2 className="mt-3 text-5xl font-semibold tracking-tight text-white md:text-6xl">{selectedGenreName}</h2>
                  <p className="mt-3 max-w-2xl text-sm text-white/68">
                    Browse curated beat rows for this genre by popularity, likes, and release freshness.
                  </p>
                </div>
              </section>
            ) : null}

            <div className="space-y-7">
              {shelfSections.map((section) => {
                const showingAll = expandedSection === section.key;
                const visibleItems = showingAll ? section.items : section.items.slice(0, 5);
                return (
                  <section key={section.key}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-2xl font-semibold text-white">{section.title}</h3>
                      {section.items.length > 5 ? (
                        <button
                          type="button"
                          onClick={() => setExpandedSection((current) => (current === section.key ? null : section.key))}
                          className="text-sm font-medium text-white/72 transition hover:text-white"
                        >
                          {showingAll ? "Show less" : "Show all"}
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                      {visibleItems.map((beat) => {
                        const coverUrl = resolveMediaUrl(beat.cover_art_obj);
                        return (
                          <button
                            key={`${section.key}-${beat.id}`}
                            type="button"
                            onClick={() => setSelectedBeatId(beat.id)}
                            className={`group rounded-[18px] bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.06] ${selectedBeatId === beat.id ? "ring-2 ring-white/20" : ""}`}
                          >
                            <div className="aspect-square overflow-hidden rounded-[14px] bg-white/5">
                              {coverUrl ? (
                                <img src={coverUrl} alt={beat.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm text-white/40">No cover</div>
                              )}
                            </div>
                            <p className="mt-3 line-clamp-2 text-base font-medium text-white">{beat.title}</p>
                            <p className="mt-1 text-sm text-white/55">{beat.producer_username}</p>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            {selectedGenreBeats.length === 0 ? <p className="mt-4 text-sm text-white/55">No beats matched that search.</p> : null}
          </div>
            </>
          ) : (
            <div className="space-y-5">
              <div className="rounded-[24px] bg-[linear-gradient(180deg,rgba(89,78,118,0.92),rgba(24,21,31,0.98))] p-6">
                <p className="text-xs uppercase tracking-[0.28em] text-white/55">Hub</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white">
                  {sidebarActions.find((item) => item.key === sidebarMode)?.label ?? "Hub"}
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-white/68">
                  {sidebarMode === "liked" && "Jump through the beats you already saved and keep discovery anchored around your taste."}
                  {sidebarMode === "history" && "Use recent activity as a quick-return lane for replaying beats you were exploring."}
                  {sidebarMode === "playlists" && "Open your backend-saved Listen later queue and custom playlists without switching into producer tools."}
                  {sidebarMode === "drops" && "Track the latest producer drops and new beat activity from the people you follow."}
                  {sidebarMode === "following" && "Keep your followed producers visible so you can move back into discovery fast."}
                  {sidebarMode === "kits" && "Browse sound kits from the sidebar instead of relying on the old top navigation tab."}
                  {sidebarMode === "resources" && "Open learning and support content directly from the browse sidebar."}
                  {sidebarMode === "hiring" && "Move into the hiring workspace from the browse sidebar when you want to post or review briefs."}
                  {sidebarMode === "studio" && "Open the producer studio workflow from here instead of relying on the top navigation Hub entry."}
                  {sidebarMode === "uploads" && "Manage upload and media workflow shortcuts from the left sidebar Hub CTA area."}
                  {sidebarMode === "briefs" && "Use the Hub CTA to move into active briefs and project request flow."}
                  {sidebarMode === "negotiations" && "Surface collaboration and deal-making actions directly inside the activity workspace."}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(sidebarMode === "liked" ? beats.filter((beat) => likes.some((item) => item.beat.id === beat.id)) :
                  sidebarMode === "history" ? [...beats].sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0)) :
                  sidebarMode === "playlists" ? [] :
                  sidebarMode === "drops" ? [] :
                  sidebarMode === "following" ? [] :
                  sidebarMode === "kits" ? [] :
                  sidebarMode === "resources" ? [] :
                  sidebarMode === "hiring" ? [] :
                  sidebarMode === "studio" ? [] :
                  sidebarMode === "uploads" ? [] :
                  sidebarMode === "briefs" ? [] :
                  sidebarMode === "negotiations" ? [] : []
                ).slice(0, 6).map((beat) => {
                  const coverUrl = resolveMediaUrl(beat.cover_art_obj);
                  return (
                    <button
                      key={`hub-${sidebarMode}-${beat.id}`}
                      type="button"
                      onClick={() => setSelectedBeatId(beat.id)}
                      className="group rounded-[18px] bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.06]"
                    >
                      <div className="aspect-square overflow-hidden rounded-[14px] bg-white/5">
                        {coverUrl ? <img src={coverUrl} alt={beat.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full w-full items-center justify-center text-sm text-white/40">No cover</div>}
                      </div>
                      <p className="mt-3 text-base font-medium text-white">{beat.title}</p>
                      <p className="mt-1 text-sm text-white/55">{beat.producer_username}</p>
                    </button>
                  );
                })}
              </div>

              {sidebarMode === "drops" ? (
                <div className="space-y-3">
                  {drops.slice(0, 6).map((drop) => (
                    <div key={drop.id} className="rounded-[18px] bg-white/[0.04] p-4">
                      <p className="text-sm font-medium text-white">{drop.producer_username}</p>
                      <p className="mt-2 text-sm text-white/62">{drop.message || "New update posted."}</p>
                      {drop.beat?.title ? <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/38">{drop.beat.title}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {sidebarMode === "playlists" ? (
                <div className="space-y-4">
                  <div className="rounded-[18px] bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">Listen later</p>
                        <p className="mt-1 text-xs text-white/45">Backend-saved for this signed-in user.</p>
                      </div>
                      <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/70">{library.listenLater.length} beats</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {library.listenLater.slice(0, 5).map((beat) => (
                        <button key={`listen-later-${beat.id}`} type="button" onClick={() => setSelectedBeatId(beat.id)} className="flex w-full items-center justify-between rounded-[14px] bg-white/[0.03] px-3 py-2 text-left transition hover:bg-white/[0.06]">
                          <div>
                            <p className="text-sm text-white">{beat.title}</p>
                            <p className="mt-1 text-xs text-white/45">{beat.producer_username}</p>
                          </div>
                          <span className="text-xs text-white/35">Play</span>
                        </button>
                      ))}
                      {library.listenLater.length === 0 ? <p className="text-sm text-white/55">No beats in Listen later yet.</p> : null}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {library.playlists.map((playlist) => (
                      <div key={playlist.id} className="rounded-[18px] bg-white/[0.04] p-4">
                        <p className="text-base font-medium text-white">{playlist.name}</p>
                        <p className="mt-1 text-sm text-white/55">{playlist.beats.length} beats</p>
                      </div>
                    ))}
                    {library.playlists.length === 0 ? <p className="rounded-[18px] bg-white/[0.04] p-4 text-sm text-white/55 md:col-span-2">No custom playlists yet. Use the three-dot menu on any beat to save one.</p> : null}
                  </div>
                </div>
              ) : null}

              {sidebarMode === "following" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {follows.map((item) => (
                    <div key={item.id} className="rounded-[18px] bg-white/[0.04] p-4">
                      <p className="text-base font-medium text-white">{item.producer_username}</p>
                      
                    </div>
                  ))}
                </div>
              ) : null}

              {["kits", "resources", "hiring", "studio", "uploads", "briefs", "negotiations"].includes(sidebarMode) ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Link
                    href={
                      sidebarMode === "kits"
                        ? "/catalog"
                        : sidebarMode === "resources"
                          ? "/resources"
                          : sidebarMode === "hiring" || sidebarMode === "briefs" || sidebarMode === "negotiations"
                            ? "/projects"
                            : sidebarMode === "studio"
                              ? "/producer/studio"
                              : "/producer/media-uploads"
                    }
                    className="rounded-[18px] bg-white/[0.04] p-5 transition hover:bg-white/[0.06]"
                  >
                    <p className="text-lg font-semibold text-white">Open {sidebarActions.find((item) => item.key === sidebarMode)?.label}</p>
                    <p className="mt-2 text-sm text-white/58">Jump straight into the dedicated page from this Hub CTA area.</p>
                  </Link>
                </div>
              ) : null}
            </div>
          )}
        </main>
      </div>

      {error ? <p className="mt-4 text-sm text-[#ffb4a9]">{error}</p> : null}
    </div>
  );
}


