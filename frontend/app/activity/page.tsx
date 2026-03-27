"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, Clock3, Compass, Disc3, Download, FileText, Heart, Info, LayoutPanelLeft, MessageSquareMore, Minus, Package2, Pencil, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type PurchasedBeat = {
  id: number;
  beat: Beat;
  order_id: number;
  order_status: string;
  license_name?: string | null;
  purchase_price?: string;
  granted_at: string;
};

type HistoryOrder = {
  id: number;
  total_price: string;
  status: string;
  created_at: string;
};

type Proposal = {
  id: number;
  project_request: number;
  producer: number;
  producer_username?: string;
  amount: string;
  message: string;
  project_id?: number | null;
  conversation_id?: number | null;
  created_at: string;
};

type ProducerApplication = {
  id: number;
  project_request: number;
  project_title: string;
  project_type: string;
  project_budget: string;
  brief_status: string;
  brief_created_at: string;
  artist_username?: string;
  producer: number;
  producer_username?: string;
  amount: string;
  message: string;
  application_status: "pending" | "accepted" | "rejected";
  project_id?: number | null;
  conversation_id?: number | null;
  created_at: string;
};

type HiringBrief = {
  id: number;
  artist: number;
  artist_username?: string;
  artist_avatar_obj?: string | null;
  producer?: number | null;
  producer_username?: string | null;
  title: string;
  description: string;
  project_type: string;
  expected_track_count: number;
  preferred_genre?: string;
  instrument_types: string[];
  mood_types: string[];
  target_genre_style?: string;
  reference_links?: string[];
  delivery_timeline_days?: number | null;
  revision_allowance?: number;
  budget: string;
  offer_price?: string | null;
  status: string;
  workflow_label: string;
  proposal_count: number;
  proposals: Proposal[];
  created_at: string;
};

type HiringMetadata = {
  project_types: Array<{
    value: string;
    label: string;
    description: string;
    base_price: string;
  }>;
  negotiation: {
    max_negotiation_discount_factor: string;
  };
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
  | "audioAssets"
  | "briefs"
  | "negotiations";

type ArtistHiringTab = "my_ads" | "drafts" | "offers_received";
type ProducerHiringTab = "marketplace" | "my_applications";

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
  const [purchasedBeats, setPurchasedBeats] = useState<PurchasedBeat[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<HistoryOrder[]>([]);
  const [downloadingBeatId, setDownloadingBeatId] = useState<number | null>(null);
  const [activePurchase, setActivePurchase] = useState<PurchasedBeat | null>(null);
  const [hiringBriefs, setHiringBriefs] = useState<HiringBrief[]>([]);
  const [producerApplications, setProducerApplications] = useState<ProducerApplication[]>([]);
  const [hiringMetadata, setHiringMetadata] = useState<HiringMetadata | null>(null);
  const [hiringTypeFilter, setHiringTypeFilter] = useState("all");
  const [artistHiringTab, setArtistHiringTab] = useState<ArtistHiringTab>("my_ads");
  const [producerHiringTab, setProducerHiringTab] = useState<ProducerHiringTab>("marketplace");
  const [producerApplicationStatusFilter, setProducerApplicationStatusFilter] = useState("all");
  const [expandedHiringBriefId, setExpandedHiringBriefId] = useState<number | null>(null);
  const [activeProposalBriefId, setActiveProposalBriefId] = useState<number | null>(null);
  const [proposalDrafts, setProposalDrafts] = useState<Record<number, string>>({});
  const [proposalMessages, setProposalMessages] = useState<Record<number, string>>({});
  const [submittingProposalId, setSubmittingProposalId] = useState<number | null>(null);
  const [acceptingProposalId, setAcceptingProposalId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<ShelfSectionKey | null>(null);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("browse");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activityNow] = useState(() => Date.now());
  const selectedGenreSectionRef = useRef<HTMLElement | null>(null);
  const library = useBeatLibrary(user?.id, token);
  const activeRole = user?.active_role;
  const isProducerMode = activeRole === "producer";

  const load = useCallback(async () => {
    if (!token) return;
    try {
        const [likeData, beatData, licenses, hiringData, hiringMeta, applicationData, downloadData, orderData] = await Promise.all([
          apiRequest<LikeItem[]>("/account/likes/beats/me/", { token }),
          apiRequest<Beat[]>("/beats/"),
          apiRequest<License[]>("/beats/licenses/"),
          apiRequest<HiringBrief[]>("/projects/requests/", { token }),
          apiRequest<HiringMetadata>("/projects/metadata-options/", { token }),
          activeRole === "producer" ? apiRequest<ProducerApplication[]>("/projects/proposals/mine/", { token }) : Promise.resolve([] as ProducerApplication[]),
          apiRequest<PurchasedBeat[]>("/orders/downloads/", { token }),
          apiRequest<HistoryOrder[]>("/orders/history/", { token }),
        ]);
      setLikes(likeData);
      setBeats(beatData);
        setLicenseCatalog(licenses);
        setHiringBriefs(hiringData);
        setHiringMetadata(hiringMeta);
        setProducerApplications(applicationData);
        setPurchasedBeats(downloadData);
        setPurchaseOrders(orderData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
    }
  }, [activeRole, token]);

  useEffect(() => {
    void load();
  }, [activeRole, load]);

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

  const openConversationPanel = useCallback((conversationId: number) => {
    if (typeof window === "undefined") {
      return;
    }
    window.dispatchEvent(new CustomEvent("beatkosh:open-messages", { detail: { conversationId } }));
  }, []);


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

  const likedHeroBeat = useMemo(() => {
    const likedIds = likes.map((item) => item.beat.id);
    const likedBeats = likedIds.map((id) => beats.find((beat) => beat.id === id)).filter(Boolean) as Beat[];
    return likedBeats.find((beat) => resolveMediaUrl(beat.cover_art_obj)) ?? likedBeats[0] ?? null;
  }, [beats, likes]);

  const historyHeroBeat = useMemo(() => {
    const historyBeats = [...beats].sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0));
    return historyBeats.find((beat) => resolveMediaUrl(beat.cover_art_obj)) ?? historyBeats[0] ?? null;
  }, [beats]);

  const hiringHeroBrief = useMemo(() => {
    return hiringBriefs.find((brief) => resolveMediaUrl(brief.artist_avatar_obj)) ?? hiringBriefs[0] ?? null;
  }, [hiringBriefs]);

  const playlistHeroBeat = useMemo(() => {
    const savedBeats = [...library.listenLater, ...library.playlists.flatMap((playlist) => playlist.beats)];
    return savedBeats.find((beat) => resolveMediaUrl(beat.cover_art_obj)) ?? savedBeats[0] ?? null;
  }, [library.listenLater, library.playlists]);

  const hubHeroBeat = sidebarMode === "liked"
    ? likedHeroBeat
    : sidebarMode === "history"
      ? historyHeroBeat
      : sidebarMode === "playlists"
        ? playlistHeroBeat
        : sidebarMode === "audioAssets"
          ? purchasedBeats[0]?.beat ?? null
        : null;

  const hubHeroCover = sidebarMode === "hiring"
    ? resolveMediaUrl(hiringHeroBrief?.artist_avatar_obj)
    : hubHeroBeat ? resolveMediaUrl(hubHeroBeat.cover_art_obj) : null;

  const hubHeroEyebrow = sidebarMode === "liked"
    ? "Latest liked beat"
    : sidebarMode === "history"
      ? "Top replayed beat"
      : sidebarMode === "playlists"
        ? "Latest saved beat"
        : sidebarMode === "audioAssets"
          ? "Latest purchased beat"
        : sidebarMode === "hiring"
          ? "Latest brief by"
          : "";

  const hubHeroTitle = sidebarMode === "hiring" ? hiringHeroBrief?.artist_username || "Hiring" : hubHeroBeat?.title || null;
  const hubHeroMeta = sidebarMode === "hiring" ? hiringHeroBrief?.title || "Latest hiring post" : hubHeroBeat?.producer_username || null;
  const purchaseOrdersById = useMemo(() => new Map(purchaseOrders.map((order) => [order.id, order])), [purchaseOrders]);

  const handleLibraryBeatPlay = (savedBeat: (typeof library.listenLater)[number], queue: Beat[]) => {
    const liveBeat = beats.find((item) => item.id === savedBeat.id);
    if (liveBeat) {
      void handlePlayAttempt(liveBeat, queue);
      return;
    }
    router.push(`/beats/${savedBeat.id}`);
  };

  const handlePurchasedBeatPlay = (item: PurchasedBeat) => {
    void handlePlayAttempt(item.beat, purchasedBeats.map((entry) => entry.beat));
  };

  const handlePurchasedBeatDownload = async (item: PurchasedBeat) => {
    if (!token) return;
    setDownloadingBeatId(item.beat.id);
    setError(null);
    try {
      const response = await apiRequest<{ download_url: string; filename: string }>(`/orders/downloads/${item.beat.id}/hq-url/`, { token });
      const anchor = document.createElement("a");
      anchor.href = resolveMediaUrl(response.download_url) || response.download_url;
      anchor.download = response.filename || `${item.beat.title}.wav`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      notify(`Download started for ${item.beat.title}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingBeatId(null);
    }
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
    return [
      { key: "browse" as const, label: "Genre Browse", icon: Compass },
      { key: "kits" as const, label: "Sound Kits", icon: Package2 },
      { key: "hiring" as const, label: "Hiring", icon: FileText },
      { key: "resources" as const, label: "Resources", icon: BookOpen },
      { key: "liked" as const, label: "Liked", icon: Heart },
      { key: "history" as const, label: "Play History", icon: Clock3 },
      { key: "playlists" as const, label: "Playlists", icon: Clock3 },
      { key: "audioAssets" as const, label: "Audio Assets", icon: Disc3 },
    ];
  }, []);

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

  const hiringTypeOptions = useMemo(() => {
    const base = [{ value: "all", label: isProducerMode ? "All Hiring" : "All My Ads" }];
    const dynamic = (hiringMetadata?.project_types ?? []).map((item) => ({ value: item.value, label: item.label }));
    return [...base, ...dynamic];
  }, [hiringMetadata?.project_types, isProducerMode]);

  const visibleHiringBriefs = useMemo(() => {
    return hiringBriefs.filter((brief) => brief.status !== "draft" && (hiringTypeFilter === "all" || brief.project_type === hiringTypeFilter));
  }, [hiringBriefs, hiringTypeFilter]);

  const visibleHiringDrafts = useMemo(() => {
    return hiringBriefs.filter((brief) => brief.status === "draft" && (hiringTypeFilter === "all" || brief.project_type === hiringTypeFilter));
  }, [hiringBriefs, hiringTypeFilter]);

  const artistActiveBriefs = useMemo(() => hiringBriefs.filter((brief) => brief.status !== "draft"), [hiringBriefs]);

  const artistOfferBriefs = useMemo(() => artistActiveBriefs.filter((brief) => brief.proposal_count > 0), [artistActiveBriefs]);

  const filteredProducerApplications = useMemo(() => {
    return producerApplications.filter((application) => producerApplicationStatusFilter === "all" || application.application_status === producerApplicationStatusFilter);
  }, [producerApplicationStatusFilter, producerApplications]);

  const formatHiringDate = (value: string) => {
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return "Recently posted";
    const diffHours = Math.max(1, Math.floor((activityNow - timestamp) / (1000 * 60 * 60)));
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const formatHiringType = (value: string) => {
    const matched = hiringMetadata?.project_types.find((item) => item.value === value);
    return matched?.label ?? value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatHiringCurrency = (value?: string | null) => {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric)) return "0";
    return numeric.toLocaleString("en-US", { maximumFractionDigits: 0 });
  };

  const clampHiringOfferValue = (value: number, fallbackValue: number, minimum: number, maximum: number) => {
    if (!Number.isFinite(value)) return fallbackValue;
    return Math.min(maximum, Math.max(minimum, value));
  };

  const getHiringNegotiationRange = useCallback((brief: HiringBrief) => {
    const suggested = Number(brief.offer_price || brief.budget || 0);
    const safeSuggested = Number.isFinite(suggested) ? suggested : 0;
    const minimumFactor = Number(hiringMetadata?.negotiation.max_negotiation_discount_factor ?? "0.80");
    return {
      suggested: safeSuggested,
      minimum: Math.max(0, safeSuggested * minimumFactor),
      maximum: Math.max(safeSuggested, safeSuggested * 1.7),
    };
  }, [hiringMetadata?.negotiation.max_negotiation_discount_factor]);

  const getHiringModeLabel = (brief: HiringBrief) => (brief.producer ? "Targeted" : "Open");

  const toggleHiringBrief = (briefId: number) => {
    setExpandedHiringBriefId((current) => {
      const nextValue = current === briefId ? null : briefId;
      if (nextValue === null) {
        setActiveProposalBriefId((openId) => (openId === briefId ? null : openId));
      }
      return nextValue;
    });
  };

  const openProposalComposer = (brief: HiringBrief) => {
    const { suggested } = getHiringNegotiationRange(brief);
    setExpandedHiringBriefId(brief.id);
    setActiveProposalBriefId(brief.id);
    setProposalDrafts((current) => (current[brief.id] ? current : { ...current, [brief.id]: suggested > 0 ? suggested.toFixed(0) : "" }));
  };

  const handleProposalAmountChange = (briefId: number, value: string) => {
    setProposalDrafts((current) => ({ ...current, [briefId]: value }));
  };

  const handleProposalMessageChange = (briefId: number, value: string) => {
    setProposalMessages((current) => ({ ...current, [briefId]: value }));
  };

  const adjustProposalAmount = (brief: HiringBrief, direction: "down" | "up") => {
    const { suggested, minimum, maximum } = getHiringNegotiationRange(brief);
    const step = Math.max(1, Number((Math.max(suggested, 1) * 0.05).toFixed(2)));
    const currentAmount = Number(proposalDrafts[brief.id] ?? suggested);
    const nextValue = direction === "down" ? currentAmount - step : currentAmount + step;
    const clamped = clampHiringOfferValue(nextValue, suggested, minimum, maximum);
    setProposalDrafts((current) => ({ ...current, [brief.id]: clamped.toFixed(0) }));
  };

  const handleSubmitProposal = async (event: FormEvent<HTMLFormElement>, brief: HiringBrief) => {
    event.preventDefault();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const { minimum, maximum, suggested } = getHiringNegotiationRange(brief);
    const amount = Number(proposalDrafts[brief.id] ?? suggested);
    if (!Number.isFinite(amount)) {
      setError("Enter a valid offer amount before submitting.");
      return;
    }
    if (amount < minimum || amount > maximum) {
      setError(`Offer must stay between Rs ${formatHiringCurrency(String(minimum))} and Rs ${formatHiringCurrency(String(maximum))}.`);
      return;
    }

    try {
      setSubmittingProposalId(brief.id);
      setError(null);
      await apiRequest("/projects/proposal/", {
        method: "POST",
        token,
        body: {
          project_request: brief.id,
          amount: amount.toFixed(2),
          message: proposalMessages[brief.id] ?? "",
        },
      });
      setMessage(`Offer sent for ${brief.title}.`);
      setActiveProposalBriefId(null);
      await load();
      setExpandedHiringBriefId(brief.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send offer");
    } finally {
      setSubmittingProposalId(null);
    }
  };

  const handleAcceptProposal = async (briefId: number, proposalId: number) => {
    if (!token) return;
    try {
      setAcceptingProposalId(proposalId);
      setError(null);
      await apiRequest(`/projects/proposal/${proposalId}/accept/`, { method: "POST", token });
      setMessage("Offer accepted. Messaging is now unlocked for this collaboration.");
      await load();
      setExpandedHiringBriefId(briefId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept offer");
    } finally {
      setAcceptingProposalId(null);
    }
  };

  return (
    <div className="activity-workspace flex h-[calc(100vh-10rem)] min-h-0 flex-col overflow-hidden rounded-[34px] border border-white/8 p-3 text-white shadow-[0_30px_120px_rgba(0,0,0,0.42)]">
      <div className={`grid min-h-0 flex-1 gap-3 ${sidebarCollapsed ? "xl:grid-cols-[92px_minmax(0,1fr)]" : "xl:grid-cols-[280px_minmax(0,1fr)]"}`}>
        <aside className="hidden min-h-0 xl:block">
          <div className={`activity-sidebar flex h-full flex-col overflow-hidden rounded-[24px] p-3 transition-[width,padding] duration-200 ${sidebarCollapsed ? "items-center px-2.5" : ""}`}>
            <div className={`mb-2 flex w-full items-center ${sidebarCollapsed ? "justify-center" : "justify-start"}`}>
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

            <div className={`${sidebarCollapsed ? "flex flex-1 w-full flex-col items-center justify-between py-1" : "grid gap-1.5"}`}>
              {sidebarActions.map((action) => {
                const Icon = action.icon;
                const active = sidebarMode === action.key;
                return (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => {
                      setSidebarMode(action.key);
                    }}
                    className={`group flex w-full items-center rounded-[16px] border border-transparent bg-transparent text-left shadow-none transition ${sidebarCollapsed ? "max-w-[50px] justify-center px-0 py-2.5" : "gap-2.5 px-2.5 py-2"} hover:bg-white/[0.05]`}
                    aria-label={action.label}
                    title={action.label}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] transition ${active ? "bg-transparent text-[#b598ff]" : "bg-transparent text-white/68 group-hover:text-white/82"}`}>
                      <Icon className="h-[15px] w-[15px]" strokeWidth={1.9} aria-hidden="true" />
                    </div>
                    {!sidebarCollapsed ? <p className={`min-w-0 truncate text-[13px] font-medium transition ${active ? "text-white" : "text-white/92 group-hover:text-white"}`}>{action.label}</p> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="activity-main min-h-0 overflow-y-auto rounded-[24px] p-4 md:p-5">
          {sidebarMode === "browse" ? (
            <>
          <div className="activity-filter-bar rounded-[22px] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                
              </div>

              
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleGenreSelect(null)}
                className={`activity-filter-chip rounded-full px-4 py-2 text-sm transition ${selectedGenre === null ? "activity-filter-chip-active" : ""}`}
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
                  className={`activity-filter-chip rounded-full px-4 py-2 text-sm transition ${selectedGenre === chip ? "activity-filter-chip-active" : ""}`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Genre shelf</h2>
              <span className="activity-count-pill rounded-full px-3 py-1 text-xs">{genreTiles.length} genres loaded</span>
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
                className="theme-home-hero relative min-h-[260px] overflow-hidden rounded-[24px]"
              >
                {selectedGenreHeroCover ? (
                  <img
                    src={selectedGenreHeroCover}
                    alt={selectedGenreHeroBeat?.title || selectedGenreName}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                <div className="theme-home-hero-overlay-primary absolute inset-0" />
                <div className="theme-home-hero-overlay-secondary absolute inset-0" />

                <div className="relative flex min-h-[260px] flex-col justify-end px-6 py-8 md:px-8 md:py-10">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/62">Genre</p>
                  <h2 className="mt-3 max-w-[12ch] text-5xl font-semibold tracking-tight text-white md:text-6xl">{selectedGenreName}</h2>
                  <p className="mt-3 max-w-2xl text-sm text-white/76">
                    Browse curated beat rows for this genre by popularity, likes, and release freshness.
                  </p>
                  {selectedGenreHeroBeat ? (
                    <div className="theme-home-meta mt-5 inline-flex w-fit items-center gap-3 rounded-full px-4 py-2 text-sm backdrop-blur-md">
                      <span className="theme-text-muted">Top track</span>
                      <span className="theme-text-main font-medium">{selectedGenreHeroBeat.title}</span>
                      <span className="theme-text-muted">{selectedGenreHeroBeat.producer_username}</span>
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
              <section className="theme-home-hero relative min-h-[260px] overflow-hidden rounded-[24px] border border-white/8">
                {hubHeroCover ? (
                  <img src={hubHeroCover} alt={hubHeroTitle || "Hub"} className="absolute inset-0 h-full w-full object-cover" />
                ) : null}
                <div className="theme-home-hero-overlay-primary absolute inset-0" />
                <div className="theme-home-hero-overlay-secondary absolute inset-0" />

                <div className="relative flex min-h-[260px] flex-col justify-end px-6 py-8 md:px-8 md:py-10">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/62">Hub</p>
                  <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                    {sidebarActions.find((item) => item.key === sidebarMode)?.label ?? "Hub"}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm text-white/76 md:text-base">
                    {sidebarMode === "liked" && "Jump through the beats you already saved and keep discovery anchored around your taste."}
                    {sidebarMode === "history" && "Use recent activity as a quick-return lane for replaying beats you were exploring."}
                    {sidebarMode === "playlists" && "Open your backend-saved Listen later queue and custom playlists without switching into producer tools."}
                    {sidebarMode === "audioAssets" && "Keep your purchased beats and future sound kits in the same activity workspace, with play, download, and order details."}
                    {sidebarMode === "kits" && "Browse sound kits from the sidebar instead of relying on the old top navigation tab."}
                    {sidebarMode === "resources" && "Open learning and support content directly from the browse sidebar."}
                    {sidebarMode === "hiring" && "Move into the hiring workspace from the browse sidebar when you want to post or review briefs."}
                    {sidebarMode === "briefs" && "Use the Hub CTA to move into active briefs and project request flow."}
                    {sidebarMode === "negotiations" && "Surface collaboration and deal-making actions directly inside the activity workspace."}
                  </p>
                  {(hubHeroBeat || hiringHeroBrief) && hubHeroTitle ? (
                    <div className="activity-hero-meta mt-5 inline-flex w-fit flex-wrap items-center gap-3 rounded-full px-4 py-2 text-sm text-white/82 backdrop-blur-md">
                      <span className="text-white/58">{hubHeroEyebrow}</span>
                      <span className="font-medium text-white">{hubHeroTitle}</span>
                      {hubHeroMeta ? <span className="text-white/58">{hubHeroMeta}</span> : null}
                    </div>
                  ) : null}
                </div>
              </section>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(sidebarMode === "liked" ? beats.filter((beat) => likes.some((item) => item.beat.id === beat.id)) :
                  sidebarMode === "history" ? [...beats].sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0)) :
                  sidebarMode === "playlists" ? [] :
                  sidebarMode === "audioAssets" ? purchasedBeats.map((item) => item.beat) :
                  sidebarMode === "kits" ? [] :
                  sidebarMode === "resources" ? [] :
                  sidebarMode === "hiring" ? [] :
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
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="activity-panel rounded-[26px] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-white/42">System playlist</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">Listen later</h3>
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">{library.listenLater.length} beats</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {library.listenLater.map((beat) => (
                        <BeatListRow
                          key={`listen-later-${beat.id}`}
                          beat={beat}
                          detailHref={`/beats/${beat.id}`}
                          artistHref={`/producers/${beat.producer}`}
                          onPlay={() => handleLibraryBeatPlay(beat, beats.filter((item) => library.listenLater.some((saved) => saved.id === item.id)))}
                          actionLabel="Remove"
                          actionTone="neutral"
                          onAction={() => {
                            void library.removeFromListenLater(beat.id).then(() => notify("Removed from Listen later."));
                          }}
                          message={notify}
                        />
                      ))}
                      {library.listenLater.length === 0 ? <p className="text-sm text-white/55">No beats in Listen later yet.</p> : null}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {library.playlists.map((playlist) => (
                      <section key={playlist.id} className="activity-panel rounded-[26px] p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-white/42">Custom playlist</p>
                            <h3 className="mt-2 text-2xl font-semibold text-white">{playlist.name}</h3>
                          </div>
                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">{playlist.beats.length} beats</span>
                        </div>
                        <div className="mt-4 space-y-3">
                          {playlist.beats.map((beat) => (
                            <BeatListRow
                              key={`${playlist.id}-${beat.id}`}
                              beat={beat}
                              detailHref={`/beats/${beat.id}`}
                              artistHref={`/producers/${beat.producer}`}
                              onPlay={() => handleLibraryBeatPlay(beat, beats.filter((item) => playlist.beats.some((saved) => saved.id === item.id)))}
                              actionLabel="Remove"
                              actionTone="neutral"
                              onAction={() => {
                                void library.removeBeatFromPlaylist(playlist.id, beat.id).then(() => notify(`Removed from ${playlist.name}.`));
                              }}
                              message={notify}
                            />
                          ))}
                          {playlist.beats.length === 0 ? <p className="text-sm text-white/55">This playlist is empty.</p> : null}
                        </div>
                      </section>
                    ))}
                    {library.playlists.length === 0 ? <p className="activity-panel rounded-[26px] p-5 text-sm text-white/55">No custom playlists yet. Use the three-dot menu on any beat to create one.</p> : null}
                  </div>
                </div>
              ) : null}

              {sidebarMode === "audioAssets" ? (
                <div className={`grid gap-4 ${sidebarCollapsed ? "2xl:grid-cols-[minmax(0,1.35fr)_320px]" : "xl:grid-cols-[minmax(0,1.45fr)_340px]"}`}>
                  <section className="activity-panel rounded-[26px] p-4 md:p-5">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-white/42">Audio Assets</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">Purchased Beats</h3>
                        <p className="mt-2 text-sm text-white/58">Owned beats stay here inside activity so you can play, download, and review purchase details without leaving this workspace.</p>
                      </div>
                      <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">{purchasedBeats.length} owned</div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {purchasedBeats.map((item) => {
                        const coverUrl = resolveMediaUrl(item.beat.cover_art_obj);
                        const isCurrent = currentTrack?.id === item.beat.id;
                        return (
                          <article key={`asset-${item.id}`} className="activity-audio-asset-card activity-soft-card grid gap-3 rounded-[22px] p-3 md:grid-cols-[64px_minmax(0,1fr)_auto] md:items-center">
                            <div className="activity-audio-asset-cover activity-soft-card h-16 w-16 overflow-hidden rounded-[16px]">
                              {coverUrl ? <img src={coverUrl} alt={item.beat.title} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-sm text-white/40">No cover</div>}
                            </div>
                            <div className="min-w-0">
                              <p className={`line-clamp-1 text-base font-semibold ${isCurrent && isPlaying ? "text-[#8b4dff]" : "text-white"}`}>{item.beat.title}</p>
                              <p className="mt-1 text-sm text-white/55">{item.beat.producer_username}</p>
                              <div className="activity-audio-asset-meta mt-2 flex flex-wrap gap-2 text-[11px] text-white/56">
                                <span className="activity-audio-asset-pill rounded-full border border-white/10 px-2.5 py-1">{item.beat.genre || "Genre N/A"}</span>
                                <span className="activity-audio-asset-pill rounded-full border border-white/10 px-2.5 py-1">{item.beat.bpm ? `${item.beat.bpm} BPM` : "BPM N/A"}</span>
                                <span className="activity-audio-asset-pill rounded-full border border-white/10 px-2.5 py-1">{item.beat.key || "Key N/A"}</span>
                                <span className="activity-audio-asset-pill rounded-full border border-white/10 px-2.5 py-1">{item.license_name || "Included"}</span>
                              </div>
                            </div>
                            <div className="activity-audio-asset-actions flex items-center gap-2 md:justify-self-end">
                              <button
                                type="button"
                                onClick={() => handlePurchasedBeatPlay(item)}
                                className="activity-audio-asset-button inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition hover:bg-white/[0.08]"
                                title="Play"
                                aria-label={`Play ${item.beat.title}`}
                              >
                                <Disc3 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handlePurchasedBeatDownload(item)}
                                disabled={downloadingBeatId === item.beat.id}
                                className="activity-audio-asset-button inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition hover:bg-white/[0.08] disabled:opacity-60"
                                title="Download"
                                aria-label={`Download ${item.beat.title}`}
                              >
                                <Download className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setActivePurchase(item)}
                                className="activity-audio-asset-button inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition hover:bg-white/[0.08]"
                                title="Info"
                                aria-label={`Open purchase info for ${item.beat.title}`}
                              >
                                <Info className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                      {purchasedBeats.length === 0 ? <p className="text-sm text-white/55">No purchased beats yet.</p> : null}
                    </div>
                  </section>

                  <aside className="activity-audio-info-panel rounded-[26px] border border-white/10 bg-[#171a22] p-4 md:p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/42">Purchase Info</p>
                    {activePurchase ? (
                      <div className="mt-4 space-y-3">
                        <div className="activity-audio-info-card rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-base font-semibold text-white">{activePurchase.beat.title}</p>
                          <p className="mt-1 text-sm text-white/55">{activePurchase.beat.producer_username}</p>
                        </div>
                        <div className="activity-audio-info-card rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-white/38">Purchased</p>
                          <p className="mt-2 text-sm font-semibold text-white">{new Date(activePurchase.granted_at).toLocaleDateString()}</p>
                        </div>
                        <div className="activity-audio-info-card rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-white/38">Order</p>
                          <p className="mt-2 text-sm font-semibold text-white">#{activePurchase.order_id}</p>
                          <p className="mt-1 text-xs text-white/50">{purchaseOrdersById.get(activePurchase.order_id)?.status || activePurchase.order_status}</p>
                        </div>
                        <div className="activity-audio-info-card rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-white/38">License</p>
                          <p className="mt-2 text-sm font-semibold text-white">{activePurchase.license_name || "Included"}</p>
                        </div>
                        <div className="activity-audio-info-card rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-white/38">Paid</p>
                          <p className="mt-2 text-sm font-semibold text-white">Rs {activePurchase.purchase_price || purchaseOrdersById.get(activePurchase.order_id)?.total_price || activePurchase.beat.base_price}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="activity-audio-info-empty mt-4 rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">
                        Select the info icon on any purchased beat to see its order details here.
                      </div>
                    )}

                    <div className="activity-audio-info-empty mt-4 rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">
                      Sound kits will be added to this same panel once purchased sound-kit access is wired into the ownership flow.
                    </div>
                  </aside>
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
                <div className="space-y-5">
                  <section className="activity-hiring-hero overflow-hidden rounded-[24px] p-5 md:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-white/55">Hiring Board</p>
                        <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">{isProducerMode ? "Browse and track your producer applications" : "Manage the hiring ads you posted"}</h3>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/66">
                          {isProducerMode
                            ? "Switch between the marketplace and every offer you have already submitted."
                            : "Move between active ads, drafts, and the producer offers grouped under each project."}
                        </p>
                      </div>
                      {!isProducerMode ? (
                        <button
                          type="button"
                          onClick={() => router.push("/projects")}
                          className="inline-flex items-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#ba9eff,#8f6cff)] px-5 py-3 text-sm font-semibold text-[#140f20] shadow-[0_16px_36px_rgba(114,76,201,0.28)] transition hover:scale-[1.01]"
                        >
                          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                          Create Hiring Ad
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      {(isProducerMode
                        ? [
                            { value: "marketplace", label: "Marketplace" },
                            { value: "my_applications", label: "My Applications" },
                          ]
                        : [
                            { value: "my_ads", label: "My Ads" },
                            { value: "drafts", label: "Drafts" },
                            { value: "offers_received", label: "Offers Received" },
                          ]).map((option) => {
                        const active = isProducerMode ? producerHiringTab === option.value : artistHiringTab === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              if (isProducerMode) {
                                setProducerHiringTab(option.value as ProducerHiringTab);
                              } else {
                                setArtistHiringTab(option.value as ArtistHiringTab);
                              }
                            }}
                            className={`activity-hiring-tab rounded-[18px] px-5 py-3 text-sm font-semibold transition ${active ? "activity-hiring-tab-active" : ""}`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>

                    {isProducerMode && producerHiringTab === "marketplace" ? (
                      <div className="mt-6 flex flex-wrap gap-3">
                        {hiringTypeOptions.map((option) => {
                          const active = hiringTypeFilter === option.value;
                          return (
                            <button
                              key={`market-${option.value}`}
                              type="button"
                              onClick={() => setHiringTypeFilter(option.value)}
                              className={`activity-hiring-filter rounded-[16px] px-4 py-2.5 text-sm font-medium transition ${active ? "activity-hiring-filter-active" : ""}`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {isProducerMode && producerHiringTab === "my_applications" ? (
                      <div className="mt-6 flex flex-wrap gap-3">
                        {[
                          { value: "all", label: "All" },
                          { value: "pending", label: "Pending" },
                          { value: "accepted", label: "Accepted" },
                          { value: "rejected", label: "Rejected" },
                        ].map((option) => {
                          const active = producerApplicationStatusFilter === option.value;
                          return (
                            <button
                              key={`application-${option.value}`}
                              type="button"
                              onClick={() => setProducerApplicationStatusFilter(option.value)}
                              className={`activity-hiring-filter rounded-[16px] px-4 py-2.5 text-sm font-medium transition ${active ? "activity-hiring-filter-active" : ""}`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>

                  {!isProducerMode && artistHiringTab === "drafts" ? (
                    <section className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-lg font-semibold text-white">Saved Drafts</h4>
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/62">{visibleHiringDrafts.length} drafts</span>
                      </div>
                      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                        {visibleHiringDrafts.map((draft) => (
                          <article key={`hiring-draft-${draft.id}`} className="rounded-[24px] border border-[#ffd38a]/15 bg-[#19150f] p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <span className="rounded-full border border-[#ffd38a]/20 bg-[#ffd38a]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ffd38a]">Draft</span>
                                <h4 className="mt-4 text-2xl font-semibold leading-tight text-white">{draft.title}</h4>
                                <p className="mt-2 text-sm text-white/54">{formatHiringType(draft.project_type)}</p>
                              </div>
                              <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 text-right">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">Offer</p>
                                <p className="mt-2 text-2xl font-semibold text-white">Rs {formatHiringCurrency(draft.offer_price || draft.budget)}</p>
                              </div>
                            </div>
                            <p className="mt-5 line-clamp-3 text-sm leading-6 text-white/62">{draft.description || "Draft saved without a full description yet."}</p>
                            <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/6 pt-5">
                              <p className="text-sm text-white/52">Saved {new Date(draft.created_at).toLocaleDateString()}</p>
                              <button type="button" onClick={() => router.push(`/projects?draft=${draft.id}`)} className="inline-flex items-center gap-2 rounded-[16px] bg-[#a887ff] px-4 py-2.5 text-sm font-semibold text-[#120d1d] transition hover:bg-[#b497ff]">Open Draft</button>
                            </div>
                          </article>
                        ))}
                      </div>
                      {visibleHiringDrafts.length === 0 ? (
                        <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center text-sm text-white/58">
                          No drafts yet. Save one from the projects form when you want to come back later.
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  {isProducerMode && producerHiringTab === "my_applications" ? (
                    <section className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-lg font-semibold text-white">My Applications</h4>
                          <p className="mt-1 text-sm text-white/55">Track every offer you have sent and see whether it is still pending, accepted, or rejected.</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/62">{filteredProducerApplications.length} applications</span>
                      </div>

                      <div className="space-y-4">
                        {filteredProducerApplications.map((application) => (
                          <article key={`application-${application.id}`} className="activity-card rounded-[24px] p-5 transition duration-300 hover:-translate-y-0.5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${application.application_status === "accepted" ? "bg-[#9ee8dc]/14 text-[#9ee8dc]" : application.application_status === "rejected" ? "bg-[#ffb4a9]/12 text-[#ffb4a9]" : "bg-white/[0.07] text-white/68"}`}>{application.application_status}</span>
                                  <span className="text-[11px] uppercase tracking-[0.16em] text-white/38">Applied {formatHiringDate(application.created_at)}</span>
                                </div>
                                <h4 className="mt-4 text-2xl font-semibold leading-tight text-white">{application.project_title}</h4>
                                <p className="mt-2 text-sm text-white/54">{formatHiringType(application.project_type)} â€¢ Artist {application.artist_username || "Unknown"}</p>
                              </div>
                              <div className="activity-subpanel rounded-[18px] px-4 py-3 text-right">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">Your Offer</p>
                                <p className="mt-2 text-2xl font-semibold text-white">Rs {formatHiringCurrency(application.amount)}</p>
                              </div>
                            </div>

                            <div className="mt-5 grid gap-3 md:grid-cols-3">
                              <div className="activity-soft-card rounded-[18px] p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Project Budget</p>
                                <p className="mt-2 text-sm font-medium text-white">Rs {formatHiringCurrency(application.project_budget)}</p>
                              </div>
                              <div className="activity-soft-card rounded-[18px] p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Brief Status</p>
                                <p className="mt-2 text-sm font-medium text-white">{application.brief_status}</p>
                              </div>
                              <div className="activity-soft-card rounded-[18px] p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Project Posted</p>
                                <p className="mt-2 text-sm font-medium text-white">{formatHiringDate(application.brief_created_at)}</p>
                              </div>
                            </div>

                            <div className="activity-soft-card mt-5 rounded-[18px] p-4">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Your Pitch</p>
                              <p className="mt-2 text-sm leading-6 text-white/72">{application.message || "No pitch message was added with this application."}</p>
                            </div>

                            {application.application_status === "accepted" && application.conversation_id ? (
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => openConversationPanel(application.conversation_id!)}
                                  className="inline-flex items-center gap-2 rounded-[14px] bg-[#9ee8dc] px-4 py-2 text-sm font-semibold text-[#0d1716] transition hover:bg-[#b5f3e8]"
                                >
                                  <MessageSquareMore className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                                  Message Artist
                                </button>
                              </div>
                            ) : null}
                          </article>
                        ))}
                      </div>

                      {filteredProducerApplications.length === 0 ? (
                        <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center text-sm text-white/58">
                          No applications match this filter yet.
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  {((isProducerMode && producerHiringTab === "marketplace") || (!isProducerMode && artistHiringTab !== "drafts")) ? (
                  <section className="space-y-4">
                    <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                      {(isProducerMode ? visibleHiringBriefs : artistHiringTab === "offers_received" ? artistOfferBriefs : artistActiveBriefs).map((brief) => {
                        const isExpanded = expandedHiringBriefId === brief.id;
                        const isApplying = activeProposalBriefId === brief.id;
                        const { minimum, maximum, suggested } = getHiringNegotiationRange(brief);
                        const activeProposalAmount = proposalDrafts[brief.id] ?? (suggested > 0 ? suggested.toFixed(0) : "");
                        const numericProposalAmount = Number(activeProposalAmount || suggested);
                        const proposalOutOfRange = Number.isFinite(numericProposalAmount) ? numericProposalAmount < minimum || numericProposalAmount > maximum : true;

                        return (
                          <div key={`hiring-brief-${brief.id}`} className={isExpanded ? "xl:col-span-2 2xl:col-span-3" : ""}>
                            <article className="activity-card group rounded-[24px] p-5 transition duration-300 hover:-translate-y-0.5">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getHiringModeLabel(brief) === "Targeted" ? "bg-[#8f6cff]/16 text-[#c7b2ff]" : "bg-white/[0.07] text-white/68"}`}>
                                      {getHiringModeLabel(brief)}
                                    </span>
                                    <span className="text-[11px] uppercase tracking-[0.16em] text-white/38">{formatHiringDate(brief.created_at)}</span>
                                  </div>
                                  <h4 className="mt-4 text-2xl font-semibold leading-tight text-white">{brief.title}</h4>
                                  <p className="mt-2 text-sm text-white/54">{formatHiringType(brief.project_type)}</p>
                                </div>
                                <div className="activity-subpanel rounded-[18px] px-4 py-3 text-right">
                                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">Budget</p>
                                  <p className="mt-2 text-2xl font-semibold text-white">Rs {formatHiringCurrency(brief.offer_price || brief.budget)}</p>
                                </div>
                              </div>

                              <p className="mt-5 line-clamp-3 text-sm leading-6 text-white/62">{brief.description}</p>

                              <div className="mt-5 flex flex-wrap gap-2">
                                {brief.preferred_genre ? <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">{brief.preferred_genre}</span> : null}
                                {brief.instrument_types.slice(0, 2).map((item) => <span key={`${brief.id}-${item}`} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">{item}</span>)}
                                {brief.mood_types.slice(0, 2).map((item) => <span key={`${brief.id}-mood-${item}`} className="rounded-full border border-[#ff9bc8]/20 bg-[#ff9bc8]/10 px-3 py-1 text-xs text-[#ffd4e8]">{item}</span>)}
                              </div>

                              <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/6 pt-5">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.16em] text-white/38">{isProducerMode ? "Artist" : "Offers Received"}</p>
                                  <p className="mt-2 text-sm font-medium text-white">{isProducerMode ? brief.artist_username : `${brief.proposal_count} offer${brief.proposal_count === 1 ? "" : "s"}`}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {isProducerMode ? (
                                    <>
                                      <button type="button" onClick={() => toggleHiringBrief(brief.id)} className="inline-flex items-center gap-2 rounded-[16px] border border-white/10 px-4 py-2.5 text-sm font-medium text-white/82 transition hover:bg-white/[0.05]">
                                        {isExpanded ? "Close Brief" : "Open Brief"}
                                        <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                                      </button>
                                      <button type="button" onClick={() => openProposalComposer(brief)} className="inline-flex items-center gap-2 rounded-[16px] bg-[#a887ff] px-4 py-2.5 text-sm font-semibold text-[#120d1d] transition hover:bg-[#b497ff]">
                                        Apply
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button type="button" onClick={() => router.push("/projects")} className="inline-flex items-center gap-2 rounded-[16px] border border-white/10 px-4 py-2.5 text-sm font-medium text-white/82 transition hover:bg-white/[0.05]">
                                        <Pencil className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                                        Edit
                                      </button>
                                      <button type="button" onClick={() => toggleHiringBrief(brief.id)} className="inline-flex items-center gap-2 rounded-[16px] bg-[#a887ff] px-4 py-2.5 text-sm font-semibold text-[#120d1d] transition hover:bg-[#b497ff]">
                                        {isExpanded ? "Hide Offers" : "View Offers"}
                                      </button>
                                      <button type="button" onClick={() => router.push("/projects")} className="inline-flex items-center gap-2 rounded-[16px] border border-white/10 px-4 py-2.5 text-sm font-medium text-white/64 transition hover:bg-white/[0.05]">
                                        <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </article>

                            {isExpanded ? (
                              <section className="activity-expanded mt-3 rounded-[24px] p-5 md:p-6">
                                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                                  <div>
                                    <p className="text-xs uppercase tracking-[0.24em] text-white/48">Brief Details</p>
                                    <h5 className="mt-3 text-3xl font-semibold text-white">{brief.title}</h5>
                                    <p className="mt-3 max-w-3xl text-sm leading-7 text-white/68">{brief.description}</p>

                                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                      <div className="activity-soft-card rounded-[18px] p-4">
                                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Genre</p>
                                        <p className="mt-2 text-sm font-medium text-white">{brief.preferred_genre || "Open"}</p>
                                      </div>
                                      <div className="activity-soft-card rounded-[18px] p-4">
                                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Tracks</p>
                                        <p className="mt-2 text-sm font-medium text-white">{brief.expected_track_count}</p>
                                      </div>
                                      <div className="activity-soft-card rounded-[18px] p-4">
                                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Timeline</p>
                                        <p className="mt-2 text-sm font-medium text-white">{brief.delivery_timeline_days ? `${brief.delivery_timeline_days} days` : "Flexible"}</p>
                                      </div>
                                    </div>

                                    {brief.target_genre_style ? (
                                      <div className="activity-subpanel mt-5 rounded-[20px] p-4">
                                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Style Direction</p>
                                        <p className="mt-2 text-sm leading-6 text-white/72">{brief.target_genre_style}</p>
                                      </div>
                                    ) : null}

                                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                                      <div>
                                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Instruments</p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          {brief.instrument_types.length > 0 ? brief.instrument_types.map((item) => (
                                            <span key={`${brief.id}-instrument-full-${item}`} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/72">{item}</span>
                                          )) : <span className="text-sm text-white/45">No instruments specified.</span>}
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Mood</p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          {brief.mood_types.length > 0 ? brief.mood_types.map((item) => (
                                            <span key={`${brief.id}-mood-full-${item}`} className="rounded-full border border-[#ff9bc8]/20 bg-[#ff9bc8]/10 px-3 py-1 text-xs text-[#ffd4e8]">{item}</span>
                                          )) : <span className="text-sm text-white/45">No moods specified.</span>}
                                        </div>
                                      </div>
                                    </div>

                                    {brief.reference_links && brief.reference_links.length > 0 ? (
                                      <div className="mt-5">
                                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">References</p>
                                        <div className="mt-3 flex flex-col gap-2">
                                          {brief.reference_links.map((link, index) => (
                                            <a key={`${brief.id}-reference-${index}`} href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/78 transition hover:bg-white/[0.07]">
                                              <span className="truncate">{link}</span>
                                              <ArrowUpRight className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>

                                  <div className="space-y-4">
                                    <div className="activity-panel rounded-[22px] p-5">
                                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Project Type</p>
                                      <p className="mt-2 text-lg font-semibold text-white">{formatHiringType(brief.project_type)}</p>
                                      <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">Budget</p>
                                      <p className="mt-2 text-3xl font-semibold text-white">Rs {formatHiringCurrency(brief.offer_price || brief.budget)}</p>
                                      <p className="mt-4 text-sm leading-6 text-white/58">
                                        {isProducerMode
                                          ? brief.producer_username
                                            ? `This brief is targeted to ${brief.producer_username}.`
                                            : "This is an open brief. You can send your own offer from here."
                                          : brief.producer_username
                                            ? `Producer locked after acceptance: ${brief.producer_username}.`
                                            : "Review offers below and accept the producer that fits this brief best."}
                                      </p>
                                      {isProducerMode ? (
                                        <button type="button" onClick={() => openProposalComposer(brief)} className="mt-5 inline-flex w-full items-center justify-center rounded-[18px] bg-[#a887ff] px-4 py-3 text-sm font-semibold text-[#120d1d] transition hover:bg-[#b497ff]">
                                          Apply
                                        </button>
                                      ) : null}
                                    </div>

                                    {!isProducerMode ? (
                                      <div className="activity-panel rounded-[22px] p-5">
                                        <div className="flex items-center justify-between gap-3">
                                          <div>
                                            <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Offers</p>
                                            <p className="mt-2 text-lg font-semibold text-white">{brief.proposals.length} received</p>
                                          </div>
                                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/62">{brief.workflow_label}</span>
                                        </div>
                                        <div className="mt-4 space-y-3">
                                          {brief.proposals.length > 0 ? brief.proposals.map((proposal) => (
                                            <div key={`proposal-${proposal.id}`} className="activity-soft-card rounded-[18px] p-4">
                                              <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                  <p className="text-base font-semibold text-white">{proposal.producer_username || "Producer"}</p>
                                                  <p className="mt-1 text-sm text-white/58">Sent {formatHiringDate(proposal.created_at)}</p>
                                                </div>
                                                <div className="text-right">
                                                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Offer</p>
                                                  <p className="mt-1 text-2xl font-semibold text-white">Rs {formatHiringCurrency(proposal.amount)}</p>
                                                </div>
                                              </div>
                                              <p className="mt-3 text-sm leading-6 text-white/72">{proposal.message || "No message added with this offer yet."}</p>
                                              <div className="mt-4 flex flex-wrap gap-2">
                                                <Link href={`/producers/${proposal.producer}`} className="inline-flex items-center gap-2 rounded-[14px] border border-white/10 px-4 py-2 text-sm text-white/82 transition hover:bg-white/[0.05]">
                                                  View Profile
                                                  <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                                                </Link>
                                                <button type="button" onClick={() => void handleAcceptProposal(brief.id, proposal.id)} disabled={acceptingProposalId === proposal.id || brief.status !== "pending"} className="inline-flex items-center gap-2 rounded-[14px] bg-[#a887ff] px-4 py-2 text-sm font-semibold text-[#120d1d] transition hover:bg-[#b497ff] disabled:opacity-60">
                                                  {acceptingProposalId === proposal.id ? "Accepting..." : "Accept Offer"}
                                                </button>
                                                {brief.status === "accepted" && proposal.conversation_id ? (
                                                  <button
                                                    type="button"
                                                    onClick={() => openConversationPanel(proposal.conversation_id!)}
                                                    className="inline-flex items-center gap-2 rounded-[14px] border border-[#9ee8dc]/30 bg-[#9ee8dc]/10 px-4 py-2 text-sm font-semibold text-[#9ee8dc] transition hover:bg-[#9ee8dc]/18"
                                                  >
                                                    <MessageSquareMore className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                                                    Message Creator
                                                  </button>
                                                ) : null}
                                              </div>
                                            </div>
                                          )) : <p className="text-sm text-white/50">No offers yet. Producers will appear here after they apply.</p>}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>

                                {isProducerMode && isApplying ? (
                                  <form onSubmit={(event) => void handleSubmitProposal(event, brief)} className="activity-panel mt-6 rounded-[22px] border border-[#a887ff]/18 p-5">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div>
                                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Send Offer</p>
                                        <p className="mt-2 text-lg font-semibold text-white">Negotiate your price and message</p>
                                      </div>
                                      <button type="button" onClick={() => setActiveProposalBriefId(null)} className="rounded-[14px] border border-white/10 px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.05]">Close</button>
                                    </div>
                                    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
                                      <label className="space-y-3">
                                        <span className="text-xs uppercase tracking-[0.22em] text-white/52">Why are you a fit?</span>
                                        <textarea value={proposalMessages[brief.id] ?? ""} onChange={(event) => handleProposalMessageChange(brief.id, event.target.value)} placeholder="Share your sound, turnaround, and what you would deliver for this project..." className="min-h-[150px] w-full rounded-[18px] border border-white/10 bg-[#1c1f27] px-4 py-4 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#a887ff]" />
                                      </label>
                                      <div className="activity-panel rounded-[20px] p-4">
                                        <p className="text-xs uppercase tracking-[0.22em] text-white/52">Your Offer</p>
                                        <div className="mt-4 grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-3">
                                          <button type="button" onClick={() => adjustProposalAmount(brief, "down")} className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] text-white/78 transition hover:bg-white/[0.08]">
                                            <Minus className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                                          </button>
                                          <input value={activeProposalAmount} onChange={(event) => handleProposalAmountChange(brief.id, event.target.value)} className="h-12 w-full rounded-[14px] border border-white/10 bg-[#0e1016] px-4 text-center text-base text-white outline-none focus:border-[#a887ff]" />
                                          <button type="button" onClick={() => adjustProposalAmount(brief, "up")} className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-[#a887ff]/30 bg-[#a887ff] text-[#120d1d] transition hover:bg-[#b497ff]">
                                            <Plus className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                                          </button>
                                        </div>
                                        <p className={`mt-3 text-xs ${proposalOutOfRange ? "text-[#ffb4a9]" : "text-white/48"}`}>Keep the offer between Rs {formatHiringCurrency(String(minimum))} and Rs {formatHiringCurrency(String(maximum))}.</p>
                                        <button type="submit" disabled={submittingProposalId === brief.id || proposalOutOfRange} className="mt-5 inline-flex w-full items-center justify-center rounded-[16px] bg-[#a887ff] px-4 py-3 text-sm font-semibold text-[#120d1d] transition hover:bg-[#b497ff] disabled:opacity-60">
                                          {submittingProposalId === brief.id ? "Sending Offer..." : "Send Offer"}
                                        </button>
                                      </div>
                                    </div>
                                  </form>
                                ) : null}
                              </section>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                  ) : null}

                  {((isProducerMode && producerHiringTab === "marketplace") || (!isProducerMode && artistHiringTab !== "drafts")) && (isProducerMode ? visibleHiringBriefs.length : (artistHiringTab === "offers_received" ? artistOfferBriefs.length : artistActiveBriefs.length)) === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center text-sm text-white/58">
                      {isProducerMode
                        ? "No active hiring ads match this filter yet. Try another production type."
                        : artistHiringTab === "offers_received"
                          ? "No producer offers have arrived yet. They will appear grouped by project here."
                          : "You have not posted any hiring ads in this filter yet. Use Create Hiring Ad to post one."}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {["briefs", "negotiations"].includes(sidebarMode) ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Link
                    href="/projects"
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



