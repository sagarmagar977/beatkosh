"use client";

import Link from "next/link";
import { BookOpen, Clock3, Compass, FileText, Heart, LayoutPanelLeft, MessageSquareMore, Package2, Search, ShoppingCart, SlidersHorizontal, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { BeatListRow } from "@/components/beat-list-row";
import { useCart } from "@/context/cart-context";
import { usePlayer } from "@/context/player-context";
import { apiRequest, resolveMediaUrl } from "@/lib/api";
import type { HomeBeat } from "@/lib/home-shelves";
import { useBeatLibrary } from "@/lib/beat-library";

type LikeItem = {
  id: number;
  beat: { id: number; title: string; producer_username: string };
};

type Beat = HomeBeat;

type License = {
  id: number;
  name: string;
  includes_stems?: boolean;
  is_exclusive?: boolean;
  includes_wav?: boolean;
};

type LicenseOption = {
  id: number;
  label: string;
  price: string;
  nature: string;
  format: string;
};

type CartSummary = {
  items: Array<{ product_type: string; product_id: number }>;
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
  const { refreshCart } = useCart();
  const { currentTrack, isPlaying, playTrack, togglePlay, canPlay } = usePlayer();
  const [likes, setLikes] = useState<LikeItem[]>([]);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [licenseCatalog, setLicenseCatalog] = useState<License[]>([]);
  const [licenseModalBeat, setLicenseModalBeat] = useState<Beat | null>(null);
  const [selectedLicenseId, setSelectedLicenseId] = useState<number | null>(null);
  const [cartBeatIds, setCartBeatIds] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<ShelfSectionKey | null>(null);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("browse");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const selectedGenreSectionRef = useRef<HTMLElement | null>(null);
  const library = useBeatLibrary(user?.id, token);
  const isProducerMode = user?.active_role === "producer";

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [likeData, beatData, licenses] = await Promise.all([
        apiRequest<LikeItem[]>("/account/likes/beats/me/", { token }),
        apiRequest<Beat[]>("/beats/"),
        apiRequest<License[]>("/beats/licenses/"),
      ]);
      setLikes(likeData);
      setBeats(beatData);
      setLicenseCatalog(licenses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    const loadCart = async () => {
      if (!token) {
        setCartBeatIds([]);
        return;
      }
      try {
        const cart = await apiRequest<CartSummary>("/orders/cart/me/", { token });
        setCartBeatIds(cart.items.filter((item) => item.product_type === "beat").map((item) => item.product_id));
      } catch {
        setCartBeatIds([]);
      }
    };

    void loadCart();
  }, [token]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [message]);


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

  const selectedGenreName = selectedGenre;

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
      return [];
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

  const selectedGenreHeroBeat = shelfSections[0]?.items[0] ?? null;
  const selectedGenreHeroCover = resolveMediaUrl(selectedGenreHeroBeat?.cover_art_obj);

  const licenseOptions = useMemo(() => {
    if (!licenseModalBeat) {
      return [] as LicenseOption[];
    }

    const buildOption = (license: License): LicenseOption => ({
      id: license.id,
      label: license.name.toUpperCase(),
      price: licenseModalBeat.base_price,
      nature: license.is_exclusive ? "Exclusive" : "Non-Exclusive",
      format: license.includes_stems ? "WAV & STEMS File" : "WAV File",
    });

    if (licenseModalBeat.licenses && licenseModalBeat.licenses.length > 0) {
      return licenseModalBeat.licenses.map(buildOption);
    }

    return licenseCatalog.map(buildOption);
  }, [licenseCatalog, licenseModalBeat]);

  const effectiveSelectedLicenseId = licenseOptions.some((item) => item.id === selectedLicenseId)
    ? selectedLicenseId
    : (licenseOptions[0]?.id ?? null);

  const selectedLicenseInfo = licenseOptions.find((item) => item.id === effectiveSelectedLicenseId) ?? licenseOptions[0];

  const notify = (text: string) => {
    setMessage(text);
  };

  const handleGenreSelect = (genre: string | null) => {
    setSelectedGenre(genre);
    setExpandedSection(null);

    if (!genre) {
      return;
    }

    window.requestAnimationFrame(() => {
      selectedGenreSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handlePlayAttempt = async (beat: Beat, queue: Beat[]) => {
    const playbackUrl = resolveMediaUrl(beat.preview_audio_obj || beat.audio_file_obj);
    if (!token || !canPlay) {
      router.push("/auth/login");
      return;
    }
    if (!playbackUrl) {
      notify("No preview is available for this beat yet.");
      return;
    }

    const isCurrent = currentTrack?.id === beat.id;
    if (isCurrent) {
      await togglePlay();
      return;
    }

    const queueTracks = queue
      .map((item) => {
        const audioUrl = resolveMediaUrl(item.preview_audio_obj || item.audio_file_obj);
        if (!audioUrl) return null;
        return {
          id: item.id,
          title: item.title,
          artist: item.producer_username,
          bpm: item.bpm,
          playCount: item.play_count,
          key: item.key,
          genre: item.genre,
          mood: item.mood,
          price: item.base_price,
          coverText: item.title,
          coverUrl: resolveMediaUrl(item.cover_art_obj),
          beatUrl: `/beats/${item.id}`,
          defaultLicenseId: item.licenses?.[0]?.id ?? null,
          audioUrl,
          source: "activity-browse",
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const startIndex = queueTracks.findIndex((item) => item.id === beat.id);

    await playTrack(
      {
        id: beat.id,
        title: beat.title,
        artist: beat.producer_username,
        bpm: beat.bpm,
        playCount: beat.play_count,
        key: beat.key,
        genre: beat.genre,
        mood: beat.mood,
        price: beat.base_price,
        coverText: beat.title,
        coverUrl: resolveMediaUrl(beat.cover_art_obj),
        beatUrl: `/beats/${beat.id}`,
        defaultLicenseId: beat.licenses?.[0]?.id ?? null,
        audioUrl: playbackUrl,
        source: "activity-browse",
      },
      startIndex >= 0 ? { queue: queueTracks, startIndex } : undefined,
    );
  };

  const handleAddToCart = async () => {
    if (!token) {
      router.push("/auth/login");
      return;
    }
    if (!licenseModalBeat || !effectiveSelectedLicenseId) {
      notify("Choose a license first.");
      return;
    }

    try {
      await apiRequest("/orders/cart/items/", {
        method: "POST",
        token,
        body: {
          product_type: "beat",
          product_id: licenseModalBeat.id,
          license_id: effectiveSelectedLicenseId,
        },
      });
      setCartBeatIds((current) => (current.includes(licenseModalBeat.id) ? current : [...current, licenseModalBeat.id]));
      await refreshCart();
      notify("Added to cart.");
      setLicenseModalBeat(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add beat to cart");
    }
  };

  const sidebarActions = useMemo(() => {
    const baseActions = [
      { key: "browse" as const, label: "Genre Browse", icon: Compass },
      { key: "kits" as const, label: "Sound Kits", icon: Package2 },
      { key: "hiring" as const, label: "Hiring", icon: FileText },
      { key: "resources" as const, label: "Resources", icon: BookOpen },
      { key: "liked" as const, label: "Liked", icon: Heart },
      { key: "history" as const, label: "Play History", icon: Clock3 },
      { key: "playlists" as const, label: "Playlists", icon: Clock3 },
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

  const soundKitHighlights = [
    { title: "Starter packs", detail: "Quick one-shots, chord loops, and drum textures for fast sketching.", href: "/catalog" },
    { title: "808 + drums", detail: "Harder rhythm kits for trap, drill, and club-ready grooves.", href: "/catalog" },
    { title: "Melody loops", detail: "Atmospheric phrases and tonal loops for hooks and intros.", href: "/catalog" },
  ];

  const resourceHighlights = [
    { title: "Producer guides", detail: "Reading and workflow notes for writing, releasing, and licensing beats.", href: "/resources" },
    { title: "Reference hub", detail: "Open saved references, inspiration notes, and production study material.", href: "/reference-hub" },
    { title: "Release prep", detail: "Checklist-style resources for cover art, metadata, and launch planning.", href: "/resources" },
  ];

  const hiringHighlights = [
    { title: "Open projects", detail: "Review active briefs, in-progress collaborations, and deal stages.", href: "/projects" },
    { title: "Post a brief", detail: "Jump into the hiring flow and outline the sound you need.", href: "/projects" },
    { title: "Negotiation lane", detail: "Track offers, revisions, and delivery conversations in one place.", href: "/projects" },
  ];

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-0 flex-col overflow-hidden rounded-[34px] border border-white/8 bg-[#090909] p-3 text-white shadow-[0_30px_120px_rgba(0,0,0,0.42)]">
      <div className={`grid min-h-0 flex-1 gap-3 ${sidebarCollapsed ? "xl:grid-cols-[92px_minmax(0,1fr)]" : "xl:grid-cols-[280px_minmax(0,1fr)]"}`}>
        <aside className="hidden min-h-0 xl:block">
          <div className={`flex h-full flex-col overflow-hidden rounded-[24px] bg-[#121212] p-4 transition-[width,padding] duration-200 ${sidebarCollapsed ? "items-center px-3" : ""}`}>
            <div className={`mb-3 flex w-full items-center ${sidebarCollapsed ? "justify-center" : "justify-start"}`}>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((current) => !current)}
                className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04] text-white/72 transition hover:bg-white/[0.08] hover:text-white"
                aria-label={sidebarCollapsed ? "Expand sidebar shortcuts" : "Collapse sidebar shortcuts"}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <LayoutPanelLeft className="h-4.5 w-4.5" strokeWidth={1.9} aria-hidden="true" />
              </button>
            </div>

            <div className={`${sidebarCollapsed ? "flex flex-1 w-full flex-col items-center justify-between py-2" : "grid gap-2"}`}>
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
                    className={`group flex w-full items-center rounded-[18px] border border-transparent bg-transparent text-left shadow-none transition ${sidebarCollapsed ? "max-w-[52px] justify-center px-0 py-3" : "gap-3 px-3 py-2.5"} hover:bg-white/[0.05]`}
                    aria-label={action.label}
                    title={action.label}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] transition ${active ? "bg-transparent text-[#b598ff]" : "bg-transparent text-white/68 group-hover:text-white/82"}`}>
                      <Icon className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                    </div>
                    {!sidebarCollapsed ? <p className={`min-w-0 truncate text-sm font-medium transition ${active ? "text-white" : "text-white/92 group-hover:text-white"}`}>{action.label}</p> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="min-h-0 overflow-y-auto rounded-[24px] bg-[#121212] p-4 md:p-5">
          {sidebarMode === "browse" ? (
            <>
          <div className="rounded-[22px] bg-[linear-gradient(180deg,rgba(66,154,110,0.35),rgba(18,18,18,0.95)_45%)] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                
              </div>

              
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleGenreSelect(null)}
                className={`rounded-full px-4 py-2 text-sm transition ${selectedGenre === null ? "bg-white text-black" : "bg-white/10 text-white/86 hover:bg-white/16"}`}
              >
                All genres
              </button>
              {availableGenres.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    handleGenreSelect(chip);
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
                    handleGenreSelect(tile.beat.genre ?? null);
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
              <section
                ref={selectedGenreSectionRef}
                className="relative overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#7f5a95_0%,#4b3457_55%,#1a171d_100%)] min-h-[260px]"
              >
                {selectedGenreHeroCover ? (
                  <img
                    src={selectedGenreHeroCover}
                    alt={selectedGenreHeroBeat?.title || selectedGenreName}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,8,18,0.9)_0%,rgba(30,18,42,0.72)_42%,rgba(12,8,18,0.88)_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(172,115,220,0.32),rgba(17,13,20,0.84)_82%)]" />

                <div className="relative flex min-h-[260px] flex-col justify-end px-6 py-8 md:px-8 md:py-10">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/62">Genre</p>
                  <h2 className="mt-3 max-w-[12ch] text-5xl font-semibold tracking-tight text-white md:text-6xl">{selectedGenreName}</h2>
                  <p className="mt-3 max-w-2xl text-sm text-white/76">
                    Browse curated beat rows for this genre by popularity, likes, and release freshness.
                  </p>
                  {selectedGenreHeroBeat ? (
                    <div className="mt-5 inline-flex w-fit items-center gap-3 rounded-full border border-white/14 bg-black/20 px-4 py-2 text-sm text-white/82 backdrop-blur-md">
                      <span className="text-white/58">Top track</span>
                      <span className="font-medium text-white">{selectedGenreHeroBeat.title}</span>
                      <span className="text-white/58">{selectedGenreHeroBeat.producer_username}</span>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {selectedGenreName ? (
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

                    <div className="mt-4 space-y-3">
                      {visibleItems.map((beat) => {
                        const isCurrent = currentTrack?.id === beat.id;
                        const inCart = cartBeatIds.includes(beat.id);

                        return (
                          <BeatListRow
                            key={`${section.key}-${beat.id}`}
                            beat={beat}
                            artistHref={`/producers/${beat.producer}`}
                            detailHref={`/beats/${beat.id}`}
                            isCurrent={isCurrent}
                            isPlaying={isCurrent && isPlaying}
                            onPlay={() => void handlePlayAttempt(beat, section.items)}
                            actionLabel={inCart ? "Added to cart" : `Rs ${beat.base_price}`}
                            actionState={inCart ? "success" : "default"}
                            onAction={() => {
                              setLicenseModalBeat(beat);
                              setSelectedLicenseId(beat.licenses?.[0]?.id ?? null);
                            }}
                            message={notify}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
                })}
              </div>
            ) : (
              <section className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center text-sm text-white/58">
                Click any genre card above to open the filtered beat rows for that genre.
              </section>
            )}

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
                      onClick={() => router.push(`/beats/${beat.id}`)}
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
                        <button key={`listen-later-${beat.id}`} type="button" onClick={() => router.push(`/beats/${beat.id}`)} className="flex w-full items-center justify-between rounded-[14px] bg-white/[0.03] px-3 py-2 text-left transition hover:bg-white/[0.06]">
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

              {sidebarMode === "kits" ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {soundKitHighlights.map((item) => (
                    <Link key={item.title} href={item.href} className="rounded-[18px] bg-white/[0.04] p-5 transition hover:bg-white/[0.06]">
                      <p className="text-lg font-semibold text-white">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-white/58">{item.detail}</p>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#b598ff]">Open catalog</p>
                    </Link>
                  ))}
                </div>
              ) : null}

              {sidebarMode === "resources" ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {resourceHighlights.map((item) => (
                    <Link key={item.title} href={item.href} className="rounded-[18px] bg-white/[0.04] p-5 transition hover:bg-white/[0.06]">
                      <p className="text-lg font-semibold text-white">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-white/58">{item.detail}</p>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#b598ff]">Open resource</p>
                    </Link>
                  ))}
                </div>
              ) : null}

              {sidebarMode === "hiring" ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {hiringHighlights.map((item) => (
                    <Link key={item.title} href={item.href} className="rounded-[18px] bg-white/[0.04] p-5 transition hover:bg-white/[0.06]">
                      <p className="text-lg font-semibold text-white">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-white/58">{item.detail}</p>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#b598ff]">Open workspace</p>
                    </Link>
                  ))}
                </div>
              ) : null}

              {["studio", "uploads", "briefs", "negotiations"].includes(sidebarMode) ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Link
                    href={
                      sidebarMode === "briefs" || sidebarMode === "negotiations"
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
      {licenseModalBeat ? (
        <div className="theme-overlay fixed inset-0 z-[130] flex items-start justify-center px-4 pt-24 backdrop-blur-sm" onClick={() => setLicenseModalBeat(null)}>
          <section className="theme-floating w-full max-w-[980px] rounded-2xl p-5" onClick={(event) => event.stopPropagation()}>
            <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
              <div>
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="theme-text-main text-4xl font-semibold">Select License Type</h3>
                    <p className="theme-text-muted">Choose how you want to license this beat.</p>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--line)" }}>
                  {licenseOptions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedLicenseId(item.id)}
                      className={`block w-full border-b px-4 py-3 text-left text-2xl ${selectedLicenseId === item.id ? "bg-[#8b28ff] text-white" : "theme-text-soft bg-transparent"}`}
                      style={{ borderColor: "var(--line)" }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <button type="button" onClick={() => setLicenseModalBeat(null)} className="theme-text-soft float-right inline-flex items-center justify-center">
                  <X className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                </button>
                <div className="mb-4 flex items-center gap-3">
                  <div className="theme-avatar flex h-20 w-20 items-center justify-center rounded-md text-sm font-bold">{licenseModalBeat.title.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <p className="theme-text-main text-4xl font-semibold">{licenseModalBeat.title}</p>
                    <p className="theme-text-muted text-xl">{licenseModalBeat.producer_username}</p>
                  </div>
                </div>
                <div className="theme-surface-muted rounded-xl p-4 text-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <p className="theme-text-muted">License Usage</p><p className="theme-text-main text-right">Unlimited Streaming</p>
                    <p className="theme-text-muted">Format & Files</p><p className="theme-text-main text-right">{selectedLicenseInfo?.format || "WAV File"}</p>
                    <p className="theme-text-muted">Nature</p><p className="theme-text-main text-right">{selectedLicenseInfo?.nature || "Non-Exclusive"}</p>
                    <p className="theme-text-muted">Category</p><p className="theme-text-main text-right">{selectedGenreName || "Browse picks"}</p>
                    <p className="theme-text-muted">Genre</p><p className="theme-text-main text-right">{licenseModalBeat.genre}</p>
                    <p className="theme-text-muted">Tempo</p><p className="theme-text-main text-right">{licenseModalBeat.bpm} BPM</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={() => void handleAddToCart()} className="brand-btn inline-flex items-center gap-2 px-8 py-3 text-3xl font-semibold">
                    <ShoppingCart className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                    Rs {selectedLicenseInfo?.price || licenseModalBeat.base_price}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
      {message ? <div className="fixed right-6 top-24 z-[150] rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">{message}</div> : null}
    </div>
  );
}


