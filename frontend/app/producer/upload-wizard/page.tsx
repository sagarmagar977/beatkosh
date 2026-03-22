"use client";

import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ChevronDown, FileAudio, ImageIcon, Music2, Package, Search, X } from "lucide-react";

import { useAuth } from "@/app/auth-context";
import { apiRequest, resolveMediaUrl } from "@/lib/api";

type BeatDraftMedia = {
  tags?: string[];
  upload_card_state?: {
    tagged_mp3?: string;
    wav?: string;
    stems?: string;
    cover_art?: string;
  };
};

type BeatDraft = {
  id: number;
  title: string;
  beat_type: string;
  genre: string;
  instrument_type: string;
  instrument_types: string[];
  bpm: number | null;
  key: string;
  mood: string;
  mood_types: string[];
  description: string;
  base_price: string;
  commercial_mode: string;
  enable_free_mp3_download: boolean;
  non_exclusive_wav_enabled: boolean;
  non_exclusive_wav_fee: string;
  non_exclusive_stems_enabled: boolean;
  non_exclusive_stems_fee: string;
  non_exclusive_publishing_rights: string;
  non_exclusive_master_recordings: string;
  non_exclusive_license_period: string;
  exclusive_enabled: boolean;
  exclusive_license_fee: string;
  exclusive_publishing_rights: string;
  exclusive_negotiable: boolean;
  declaration_accepted: boolean;
  selected_license_ids: number[];
  current_step: number;
  status: "draft" | "published";
  published_beat: number | null;
  media?: BeatDraftMedia;
  audio_file_obj?: string | null;
  preview_audio_obj?: string | null;
  stems_file_obj?: string | null;
  cover_art_obj?: string | null;
  featured_cover_photo?: number | null;
  featured_producer_ids?: number[];
};

type FeaturedCoverPhoto = {
  id: number;
  title: string;
  image_url: string;
};

type FeaturedProducerCandidate = {
  producer_id: number;
  username: string;
  producer_name: string;
  headline: string;
  avatar_obj?: string | null;
  relation: "mutual" | "following" | "follows_you";
};

type SoundKitDraft = {
  id: number;
  title: string;
  kit_type: string;
  description: string;
  genre: string;
  mood: string;
  bpm_min: number | null;
  bpm_max: number | null;
  base_price: string;
  reference_links: string[];
  tags: string[];
  current_step: number;
  status: "draft" | "published";
  published_sound_kit: number | null;
  cover_art_obj?: string | null;
  archive_file_obj?: string | null;
  preview_audio_obj?: string | null;
};

type PublishedBeat = {
  id: number;
  title: string;
  producer_username: string;
  beat_type?: string;
  instrument_type?: string;
  instrument_types?: string[];
  preview_audio_obj?: string | null;
  audio_file_obj?: string | null;
  stems_file_obj?: string | null;
};

type PublishedSoundKit = {
  id: number;
  title: string;
  producer_username: string;
  preview_audio_obj?: string | null;
  cover_art_obj?: string | null;
};

type BeatMetadataOptions = {
  beat_types: string[];
  genres: string[];
  instrument_types: string[];
  moods: string[];
  keys: string[];
  commercial_modes: string[];
  publishing_rights: string[];
  master_recordings: string[];
  license_periods: string[];
};

const beatSteps = ["Meta Data", "Media Upload", "License"];
const kitSteps = ["Kit Type", "Metadata", "Upload Files", "Licensing"];
const BEAT_WIZARD_SESSION_KEY = "producer-upload-wizard-beat-session";
const KIT_WIZARD_SESSION_KEY = "producer-upload-wizard-kit-session";

type UploadWizardPickerProps = {
  label: string;
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  placeholder: string;
  error?: string;
  multiple?: boolean;
};

function UploadWizardPicker({ label, options, selectedValues, onToggle, placeholder, error, multiple = false }: UploadWizardPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((item) => item.toLowerCase().includes(normalized));
  }, [options, query]);

  const selectedLabel = selectedValues.length === 0
    ? placeholder
    : multiple
      ? `${selectedValues.length} selected`
      : selectedValues[0];

  return (
    <div className="space-y-1">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={`flex h-12 w-full items-center justify-between rounded-lg border bg-[#2f3138] px-4 text-sm text-white/85 ${error ? "border-[#f2be43] shadow-[0_0_0_1px_rgba(242,190,67,0.25)]" : "border-white/10"}`}
        >
          <span className={selectedValues.length === 0 ? "text-white/38" : "text-white/85"}>{selectedLabel}</span>
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} strokeWidth={1.8} aria-hidden="true" />
        </button>
        {open ? (
          <div className="absolute z-20 mt-2 w-full rounded-xl border border-white/10 bg-[#24262d] p-3 shadow-2xl shadow-black/35">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" strokeWidth={1.8} aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}`}
                className="h-11 w-full rounded-lg border border-white/10 bg-[#1e2026] pl-10 pr-3 text-sm text-white/85 outline-none placeholder:text-white/30"
              />
            </div>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {filteredOptions.map((item) => {
                const active = selectedValues.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      onToggle(item);
                      if (!multiple) {
                        setOpen(false);
                        setQuery("");
                      }
                    }}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${active ? "border-[#8b28ff]/60 bg-[#8b28ff]/12 text-white" : "border-white/8 bg-white/[0.03] text-white/76"}`}
                  >
                    <span>{item}</span>
                    <span className={`h-4 w-4 rounded-sm border ${active ? "border-[#8b28ff] bg-[#8b28ff]" : "border-white/25 bg-transparent"}`} />
                  </button>
                );
              })}
              {filteredOptions.length === 0 ? <p className="px-2 py-3 text-sm text-white/45">No matches found.</p> : null}
            </div>
          </div>
        ) : null}
      </div>
      {selectedValues.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedValues.map((item) => (
            <span key={item} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/75">{item}</span>
          ))}
        </div>
      ) : null}
      {error ? <p className="text-xs text-[#f2be43]">Warning {error}</p> : null}
    </div>
  );
}

function UploadAssetCard({ icon, title, status, fileName, href, previewUrl, compactPreview = false }: { icon: ReactNode; title: string; status: string; fileName?: string; href?: string; previewUrl?: string | null; compactPreview?: boolean }) {
  if (!fileName && !href) return null;
  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-[#17191f] px-3 py-3 text-sm text-white/75">
      <div className="flex items-start gap-3">
        {previewUrl ? <img src={previewUrl} alt={title} className={`${compactPreview ? "h-12 w-12 rounded-lg" : "h-16 w-16 rounded-xl"} object-cover`} /> : null}
        <div className="mt-0.5 text-white/55">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white/82">{title}</p>
          <p className="truncate text-white/55">{fileName ?? "Saved file"}</p>
          <p className="mt-1 text-xs text-white/38">{status}</p>
          {href ? <a href={href} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs text-[#b784ff] hover:text-[#d2b0ff]">Open saved file</a> : null}
        </div>
      </div>
    </div>
  );
}

async function cropImageToSquare(file: File): Promise<File> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const instance = new Image();
      instance.onload = () => resolve(instance);
      instance.onerror = () => reject(new Error("Could not load image for cropping"));
      instance.src = imageUrl;
    });

    const size = Math.min(image.width, image.height);
    const offsetX = (image.width - size) / 2;
    const offsetY = (image.height - size) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(image, offsetX, offsetY, size, size, 0, 0, size, size);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type || "image/jpeg", 0.92));
    if (!blob) return file;
    return new File([blob], file.name, { type: blob.type || file.type || "image/jpeg" });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export default function ProducerUploadWizardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const draftParam = searchParams.get("draft");
  const freshParam = searchParams.get("fresh");
  const [flow, setFlow] = useState<"beat" | "kit">("beat");
  const [step, setStep] = useState(0);
  const [beatDraft, setBeatDraft] = useState<BeatDraft | null>(null);
  const [kitDraft, setKitDraft] = useState<SoundKitDraft | null>(null);
  const [publishedBeat, setPublishedBeat] = useState<PublishedBeat | null>(null);
  const [publishedKit, setPublishedKit] = useState<PublishedSoundKit | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [beatType, setBeatType] = useState("");
  const [genre, setGenre] = useState("");
  const [instrumentTypes, setInstrumentTypes] = useState<string[]>([]);
  const [bpm, setBpm] = useState("");
  const [keyText, setKeyText] = useState("");
  const [moodTypes, setMoodTypes] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("0.00");
  const [beatMetadataOptions, setBeatMetadataOptions] = useState<BeatMetadataOptions>({
    beat_types: [],
    genres: [],
    instrument_types: [],
    moods: [],
    keys: [],
    commercial_modes: [],
    publishing_rights: [],
    master_recordings: [],
    license_periods: [],
  });
  const [commercialMode, setCommercialMode] = useState("Presets");
  const [enableFreeMp3Download, setEnableFreeMp3Download] = useState(false);
  const [nonExclusiveWavEnabled, setNonExclusiveWavEnabled] = useState(true);
  const [nonExclusiveWavFee, setNonExclusiveWavFee] = useState("0.00");
  const [nonExclusiveStemsEnabled, setNonExclusiveStemsEnabled] = useState(false);
  const [nonExclusiveStemsFee, setNonExclusiveStemsFee] = useState("0.00");
  const [nonExclusivePublishingRights, setNonExclusivePublishingRights] = useState("");
  const [nonExclusiveMasterRecordings, setNonExclusiveMasterRecordings] = useState("");
  const [nonExclusiveLicensePeriod, setNonExclusiveLicensePeriod] = useState("");
  const [exclusiveEnabled, setExclusiveEnabled] = useState(false);
  const [exclusiveLicenseFee, setExclusiveLicenseFee] = useState("0.00");
  const [exclusivePublishingRights, setExclusivePublishingRights] = useState("");
  const [exclusiveNegotiable, setExclusiveNegotiable] = useState(false);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [beatTags, setBeatTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [uploadCardState, setUploadCardState] = useState<BeatDraftMedia["upload_card_state"]>({});
  const [sessionReady, setSessionReady] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [metaErrors, setMetaErrors] = useState<Record<string, string>>({});

  const [taggedMp3, setTaggedMp3] = useState<File | null>(null);
  const [wavFile, setWavFile] = useState<File | null>(null);
  const [stemsFile, setStemsFile] = useState<File | null>(null);
  const [coverArt, setCoverArt] = useState<File | null>(null);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [featuredCovers, setFeaturedCovers] = useState<FeaturedCoverPhoto[]>([]);
  const [selectedFeaturedCoverId, setSelectedFeaturedCoverId] = useState<number | null>(null);
  const [featuredProducerCandidates, setFeaturedProducerCandidates] = useState<FeaturedProducerCandidate[]>([]);
  const [featuredProducerIds, setFeaturedProducerIds] = useState<number[]>([]);

  const [kitType, setKitType] = useState("");
  const [kitTitle, setKitTitle] = useState("");
  const [kitDescription, setKitDescription] = useState("");
  const [kitGenre, setKitGenre] = useState("");
  const [kitMood, setKitMood] = useState("");
  const [kitBpmMin, setKitBpmMin] = useState("");
  const [kitBpmMax, setKitBpmMax] = useState("");
  const [kitBasePrice, setKitBasePrice] = useState("0.00");
  const [kitReference, setKitReference] = useState("");
  const [kitTags, setKitTags] = useState("");
  const [kitArchiveFile, setKitArchiveFile] = useState<File | null>(null);
  const [kitPreviewAudio, setKitPreviewAudio] = useState<File | null>(null);
  const [kitCoverArt, setKitCoverArt] = useState<File | null>(null);
  const customCoverInputRef = useRef<HTMLInputElement | null>(null);

  const beatWizardSessionKey = useMemo(() => `${BEAT_WIZARD_SESSION_KEY}:${draftParam ?? "active"}`, [draftParam]);
  const kitWizardSessionKey = useMemo(() => `${KIT_WIZARD_SESSION_KEY}:${draftParam ?? "active"}`, [draftParam]);

  const steps = flow === "beat" ? beatSteps : kitSteps;
  const selectedFeaturedCover = useMemo(() => featuredCovers.find((item) => item.id === selectedFeaturedCoverId) ?? null, [featuredCovers, selectedFeaturedCoverId]);
  const selectedFeaturedCoverUrl = useMemo(() => resolveMediaUrl(selectedFeaturedCover?.image_url), [selectedFeaturedCover]);
  const customCoverPreviewUrl = useMemo(() => (coverArt ? URL.createObjectURL(coverArt) : null), [coverArt]);
  const producerModeReady = Boolean(user?.is_producer && user?.active_role === "producer");
  const beat22SelectClass = "h-12 w-full rounded-lg border border-white/10 bg-[#2f3138] px-4 text-sm text-white/85 outline-none";
  const beat22InvalidClass = "border-[#f2be43] shadow-[0_0_0_1px_rgba(242,190,67,0.25)]";

  const syncBeatFromDraft = (item: BeatDraft) => {
    setStep(Math.max(0, Math.min((item.current_step ?? 1) - 1, beatSteps.length - 1)));
    setTitle(item.title ?? "");
    setBeatType(item.beat_type ?? "");
    setGenre(item.genre ?? "");
    setInstrumentTypes(item.instrument_types?.length ? item.instrument_types : item.instrument_type ? [item.instrument_type] : []);
    setBpm(item.bpm ? String(item.bpm) : "");
    setKeyText(item.key ?? "");
    setMoodTypes(item.mood_types?.length ? item.mood_types : item.mood ? [item.mood] : []);
    setDescription(item.description ?? "");
    setSelectedFeaturedCoverId(item.featured_cover_photo ?? null);
    setFeaturedProducerIds(Array.isArray(item.featured_producer_ids) ? item.featured_producer_ids.map((value) => Number(value)).filter((value) => Number.isFinite(value)) : []);
    setBeatTags((prev) => ((item.media?.tags ?? []).length ? item.media?.tags ?? [] : prev));
    setUploadCardState((prev) => ({ ...prev, ...(item.media?.upload_card_state ?? {}) }));
    setBasePrice(item.base_price ?? "0.00");
    setCommercialMode(item.commercial_mode ?? "Presets");
    setEnableFreeMp3Download(Boolean(item.enable_free_mp3_download));
    setNonExclusiveWavEnabled(Boolean(item.non_exclusive_wav_enabled));
    setNonExclusiveWavFee(item.non_exclusive_wav_fee ?? "0.00");
    setNonExclusiveStemsEnabled(Boolean(item.non_exclusive_stems_enabled));
    setNonExclusiveStemsFee(item.non_exclusive_stems_fee ?? "0.00");
    setNonExclusivePublishingRights(item.non_exclusive_publishing_rights ?? "");
    setNonExclusiveMasterRecordings(item.non_exclusive_master_recordings ?? "");
    setNonExclusiveLicensePeriod(item.non_exclusive_license_period ?? "");
    setExclusiveEnabled(Boolean(item.exclusive_enabled));
    setExclusiveLicenseFee(item.exclusive_license_fee ?? "0.00");
    setExclusivePublishingRights(item.exclusive_publishing_rights ?? "");
    setExclusiveNegotiable(Boolean(item.exclusive_negotiable));
    setDeclarationAccepted(Boolean(item.declaration_accepted));
  };

  const syncKitFromDraft = (item: SoundKitDraft) => {
    setStep(Math.max(0, Math.min((item.current_step ?? 1) - 1, kitSteps.length - 1)));
    setKitTitle(item.title ?? "");
    setKitType(item.kit_type ?? "");
    setKitDescription(item.description ?? "");
    setKitGenre(item.genre ?? "");
    setKitMood(item.mood ?? "");
    setKitBpmMin(item.bpm_min ? String(item.bpm_min) : "");
    setKitBpmMax(item.bpm_max ? String(item.bpm_max) : "");
    setKitBasePrice(item.base_price ?? "0.00");
    setKitReference((item.reference_links ?? [])[0] ?? "");
    setKitTags((item.tags ?? []).join(", "));
  };

  const resetBeatWizardState = () => {
    setBeatDraft(null);
    setPublishedBeat(null);
    setTitle("");
    setBeatType("");
    setGenre("");
    setInstrumentTypes([]);
    setBpm("");
    setKeyText("");
    setMoodTypes([]);
    setDescription("");
    setBasePrice("0.00");
    setBeatTags([]);
    setTagInput("");
    setUploadCardState({});
    setCommercialMode("Presets");
    setEnableFreeMp3Download(false);
    setNonExclusiveWavEnabled(true);
    setNonExclusiveWavFee("0.00");
    setNonExclusiveStemsEnabled(false);
    setNonExclusiveStemsFee("0.00");
    setNonExclusivePublishingRights("");
    setNonExclusiveMasterRecordings("");
    setNonExclusiveLicensePeriod("");
    setExclusiveEnabled(false);
    setExclusiveLicenseFee("0.00");
    setExclusivePublishingRights("");
    setExclusiveNegotiable(false);
    setDeclarationAccepted(false);
    setTaggedMp3(null);
    setWavFile(null);
    setStemsFile(null);
    setCoverArt(null);
    setSelectedFeaturedCoverId(null);
    setFeaturedProducerIds([]);
    setCoverPickerOpen(false);
    setMetaErrors({});
    setMessage(null);
    setError(null);
    setStep(0);
  };

  const resetKitWizardState = () => {
    setKitDraft(null);
    setPublishedKit(null);
    setKitType("");
    setKitTitle("");
    setKitDescription("");
    setKitGenre("");
    setKitMood("");
    setKitBpmMin("");
    setKitBpmMax("");
    setKitBasePrice("0.00");
    setKitReference("");
    setKitTags("");
    setKitArchiveFile(null);
    setKitPreviewAudio(null);
    setKitCoverArt(null);
    setMessage(null);
    setError(null);
    setStep(0);
  };

  const applyBeatWizardSession = (payload: Partial<{
    step: number;
    title: string;
    beatType: string;
    genre: string;
    instrumentTypes: string[];
    bpm: string;
    keyText: string;
    moodTypes: string[];
    description: string;
    basePrice: string;
    beatTags: string[];
    tagInput: string;
    uploadCardState: BeatDraftMedia["upload_card_state"];
    commercialMode: string;
    enableFreeMp3Download: boolean;
    nonExclusiveWavEnabled: boolean;
    nonExclusiveWavFee: string;
    nonExclusiveStemsEnabled: boolean;
    nonExclusiveStemsFee: string;
    nonExclusivePublishingRights: string;
    nonExclusiveMasterRecordings: string;
    nonExclusiveLicensePeriod: string;
    exclusiveEnabled: boolean;
    exclusiveLicenseFee: string;
    exclusivePublishingRights: string;
    exclusiveNegotiable: boolean;
    declarationAccepted: boolean;
    selectedFeaturedCoverId: number | null;
  }>) => {
    if (typeof payload.step === "number") setStep(payload.step);
    if (typeof payload.title === "string") setTitle(payload.title);
    if (typeof payload.beatType === "string") setBeatType(payload.beatType);
    if (typeof payload.genre === "string") setGenre(payload.genre);
    if (Array.isArray(payload.instrumentTypes)) setInstrumentTypes(payload.instrumentTypes);
    if (typeof payload.bpm === "string") setBpm(payload.bpm);
    if (typeof payload.keyText === "string") setKeyText(payload.keyText);
    if (Array.isArray(payload.moodTypes)) setMoodTypes(payload.moodTypes);
    if (typeof payload.description === "string") setDescription(payload.description);
    if (typeof payload.basePrice === "string") setBasePrice(payload.basePrice);
    if (Array.isArray(payload.beatTags)) setBeatTags(payload.beatTags);
    if (typeof payload.tagInput === "string") setTagInput(payload.tagInput);
    if (payload.uploadCardState) setUploadCardState(payload.uploadCardState);
    if (typeof payload.commercialMode === "string") setCommercialMode(payload.commercialMode);
    if (typeof payload.enableFreeMp3Download === "boolean") setEnableFreeMp3Download(payload.enableFreeMp3Download);
    if (typeof payload.nonExclusiveWavEnabled === "boolean") setNonExclusiveWavEnabled(payload.nonExclusiveWavEnabled);
    if (typeof payload.nonExclusiveWavFee === "string") setNonExclusiveWavFee(payload.nonExclusiveWavFee);
    if (typeof payload.nonExclusiveStemsEnabled === "boolean") setNonExclusiveStemsEnabled(payload.nonExclusiveStemsEnabled);
    if (typeof payload.nonExclusiveStemsFee === "string") setNonExclusiveStemsFee(payload.nonExclusiveStemsFee);
    if (typeof payload.nonExclusivePublishingRights === "string") setNonExclusivePublishingRights(payload.nonExclusivePublishingRights);
    if (typeof payload.nonExclusiveMasterRecordings === "string") setNonExclusiveMasterRecordings(payload.nonExclusiveMasterRecordings);
    if (typeof payload.nonExclusiveLicensePeriod === "string") setNonExclusiveLicensePeriod(payload.nonExclusiveLicensePeriod);
    if (typeof payload.exclusiveEnabled === "boolean") setExclusiveEnabled(payload.exclusiveEnabled);
    if (typeof payload.exclusiveLicenseFee === "string") setExclusiveLicenseFee(payload.exclusiveLicenseFee);
    if (typeof payload.exclusivePublishingRights === "string") setExclusivePublishingRights(payload.exclusivePublishingRights);
    if (typeof payload.exclusiveNegotiable === "boolean") setExclusiveNegotiable(payload.exclusiveNegotiable);
    if (typeof payload.declarationAccepted === "boolean") setDeclarationAccepted(payload.declarationAccepted);
    if (typeof payload.selectedFeaturedCoverId === "number" || payload.selectedFeaturedCoverId === null) setSelectedFeaturedCoverId(payload.selectedFeaturedCoverId ?? null);
  };

  const applyKitWizardSession = (payload: Partial<{
    step: number;
    kitType: string;
    kitTitle: string;
    kitDescription: string;
    kitGenre: string;
    kitMood: string;
    kitBpmMin: string;
    kitBpmMax: string;
    kitBasePrice: string;
    kitReference: string;
    kitTags: string;
  }>) => {
    if (typeof payload.step === "number") setStep(payload.step);
    if (typeof payload.kitType === "string") setKitType(payload.kitType);
    if (typeof payload.kitTitle === "string") setKitTitle(payload.kitTitle);
    if (typeof payload.kitDescription === "string") setKitDescription(payload.kitDescription);
    if (typeof payload.kitGenre === "string") setKitGenre(payload.kitGenre);
    if (typeof payload.kitMood === "string") setKitMood(payload.kitMood);
    if (typeof payload.kitBpmMin === "string") setKitBpmMin(payload.kitBpmMin);
    if (typeof payload.kitBpmMax === "string") setKitBpmMax(payload.kitBpmMax);
    if (typeof payload.kitBasePrice === "string") setKitBasePrice(payload.kitBasePrice);
    if (typeof payload.kitReference === "string") setKitReference(payload.kitReference);
    if (typeof payload.kitTags === "string") setKitTags(payload.kitTags);
  };

  useEffect(() => {
    const run = async () => {
      if (!token) {
        return;
      }
      try {
        const [beatDrafts, soundKitDrafts, metadataOptions, featuredCoverData, collaboratorData] = await Promise.all([
          apiRequest<BeatDraft[]>("/beats/upload-drafts/", { token }),
          apiRequest<SoundKitDraft[]>("/soundkits/upload-drafts/", { token }),
          apiRequest<BeatMetadataOptions>("/beats/metadata-options/"),
          apiRequest<FeaturedCoverPhoto[]>("/beats/featured-covers/"),
          producerModeReady ? apiRequest<FeaturedProducerCandidate[]>("/account/featured-producers/candidates/", { token }) : Promise.resolve([]),
        ]);
        setBeatMetadataOptions(metadataOptions);
        setFeaturedCovers(featuredCoverData);
        setFeaturedProducerCandidates(collaboratorData);

        const flowParam = searchParams.get("flow");
        const draftId = draftParam ? Number(draftParam) : null;
        const isFreshStart = freshParam === "1" && !draftId;
        if (isFreshStart) {
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(beatWizardSessionKey);
            window.sessionStorage.removeItem(kitWizardSessionKey);
          }
          if (flowParam === "kit") {
            resetKitWizardState();
          } else {
            resetBeatWizardState();
          }
        }
        const selectedBeatDraft = draftId ? beatDrafts.find((item) => item.id === draftId) ?? null : null;
        setBeatDraft(selectedBeatDraft);
        if (selectedBeatDraft && flowParam !== "kit") {
          syncBeatFromDraft(selectedBeatDraft);
        }

        const selectedKitDraft = draftId ? soundKitDrafts.find((item) => item.id === draftId) ?? null : null;
        setKitDraft(selectedKitDraft);
        if (selectedKitDraft && flowParam === "kit") {
          syncKitFromDraft(selectedKitDraft);
        }

        if (typeof window !== "undefined") {
          const beatRaw = window.sessionStorage.getItem(beatWizardSessionKey);
          if (beatRaw && flowParam !== "kit" && !isFreshStart) {
            applyBeatWizardSession(JSON.parse(beatRaw));
          }
          const kitRaw = window.sessionStorage.getItem(kitWizardSessionKey);
          if (kitRaw && flowParam === "kit" && !isFreshStart) {
            applyKitWizardSession(JSON.parse(kitRaw));
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load wizard");
      } finally {
        setSessionReady(true);
      }
    };
    void run();
  }, [beatWizardSessionKey, draftParam, freshParam, kitWizardSessionKey, producerModeReady, searchParams, token]);

  useEffect(() => {
    const flowParam = searchParams.get("flow");
    if (flowParam === "beat" || flowParam === "kit") {
      setFlow(flowParam);
      setStep(0);
    }
  }, [searchParams]);

  const ensureBeatDraft = async () => {
    if (!token) throw new Error("Login required");
    if (beatDraft) return beatDraft;
    const created = await apiRequest<BeatDraft>("/beats/upload-drafts/", { method: "POST", token, body: {} });
    setBeatDraft(created);
    syncBeatFromDraft(created);
    return created;
  };

  const ensureKitDraft = async () => {
    if (!token) throw new Error("Login required");
    if (kitDraft) return kitDraft;
    const created = await apiRequest<SoundKitDraft>("/soundkits/upload-drafts/", { method: "POST", token, body: {} });
    setKitDraft(created);
    syncKitFromDraft(created);
    return created;
  };

  const patchBeatDraft = async (body: FormData | Record<string, unknown>, isFormData = false) => {
    if (!token) throw new Error("Login required");
    const current = await ensureBeatDraft();
    const updated = await apiRequest<BeatDraft>(`/beats/upload-drafts/${current.id}/`, {
      method: "PATCH",
      token,
      body: isFormData ? (body as FormData) : body,
      isFormData,
    });
    setBeatDraft(updated);
    syncBeatFromDraft(updated);
    return updated;
  };

  const patchKitDraft = async (body: FormData | Record<string, unknown>, isFormData = false) => {
    if (!token) throw new Error("Login required");
    const current = await ensureKitDraft();
    const updated = await apiRequest<SoundKitDraft>(`/soundkits/upload-drafts/${current.id}/`, {
      method: "PATCH",
      token,
      body: isFormData ? (body as FormData) : body,
      isFormData,
    });
    setKitDraft(updated);
    syncKitFromDraft(updated);
    return updated;
  };

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const validateBeatMetadata = () => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "This field is required";
    if (!beatType) next.beatType = "This field is required";
    if (!genre) next.genre = "This field is required";
    if (instrumentTypes.length === 0) next.instrumentType = "Select at least one instrument";
    if (moodTypes.length === 0) next.mood = "Select at least one mood";
    if (!bpm.trim()) next.bpm = "This field is required";
    if (!keyText) next.keyText = "This field is required";
    const numericBasePrice = Number(basePrice);
    if (!basePrice.trim() || Number.isNaN(numericBasePrice) || numericBasePrice <= 0) {
      next.basePrice = "Base price must be greater than 0";
    }
    return next;
  };

  const toggleInstrumentType = (value: string) => {
    setInstrumentTypes((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
    setMetaErrors((prev) => ({ ...prev, instrumentType: "" }));
  };

  const toggleMood = (value: string) => {
    setMoodTypes((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
    setMetaErrors((prev) => ({ ...prev, mood: "" }));
  };

  const addBeatTag = () => {
    const nextTag = tagInput.trim();
    if (!nextTag) return;
    setBeatTags((prev) => (prev.includes(nextTag) ? prev : [...prev, nextTag]));
    setTagInput("");
  };

  const removeBeatTag = (value: string) => {
    setBeatTags((prev) => prev.filter((item) => item !== value));
  };

  const updateUploadCard = (key: keyof NonNullable<BeatDraftMedia["upload_card_state"]>, file: File | null) => {
    setUploadCardState((prev) => ({ ...prev, [key]: file?.name ?? prev?.[key] ?? undefined }));
  };

  const handleCustomCoverChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const rawFile = event.target.files?.[0] ?? null;
    if (!rawFile) return;
    const croppedFile = await cropImageToSquare(rawFile);
    setCoverArt(croppedFile);
    setSelectedFeaturedCoverId(null);
    updateUploadCard("cover_art", croppedFile);
    setCoverPickerOpen(false);
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleFeaturedCoverSelect = (cover: FeaturedCoverPhoto) => {
    setSelectedFeaturedCoverId(cover.id);
    setCoverArt(null);
    setUploadCardState((prev) => ({ ...prev, cover_art: cover.title }));
    setCoverPickerOpen(false);
  };

  const toggleFeaturedProducer = (producerId: number) => {
    setFeaturedProducerIds((current) => (current.includes(producerId) ? current.filter((item) => item !== producerId) : [...current, producerId]));
  };

  const buildBeatDraftMedia = () => JSON.stringify({
    ...(beatDraft?.media ?? {}),
    tags: beatTags,
    upload_card_state: uploadCardState,
  });

  const appendBeatMediaFiles = (form: FormData) => {
    if (taggedMp3) form.append("preview_audio_upload", taggedMp3);
    if (wavFile) {
      form.append("audio_file_upload", wavFile);
      return;
    }
    // Preserve older user behavior where only the MP3 picker was used by
    // storing that file as the main beat audio when no source file exists yet.
    if (!beatDraft?.audio_file_obj && taggedMp3) {
      form.append("audio_file_upload", taggedMp3);
    }
  };

  const clearBeatWizardSession = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(beatWizardSessionKey);
    }
  };

  const clearKitWizardSession = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(kitWizardSessionKey);
    }
  };

  const fileNameFromUrl = (raw?: string | null) => {
    if (!raw) return "";
    const normalized = raw.split("?")[0];
    return decodeURIComponent(normalized.split("/").pop() ?? normalized);
  };

  const hasBeatWizardProgress = flow === "beat" && !publishedBeat && Boolean(
    beatDraft?.status === "draft" ||
    title.trim() ||
    beatType ||
    genre ||
    instrumentTypes.length ||
    moodTypes.length ||
    bpm ||
    keyText ||
    description.trim() ||
    beatTags.length ||
    taggedMp3 ||
    wavFile ||
    stemsFile ||
    coverArt ||
    beatDraft?.preview_audio_obj ||
    beatDraft?.audio_file_obj ||
    beatDraft?.stems_file_obj ||
    beatDraft?.cover_art_obj
  );

  useEffect(() => {
    if (typeof window === "undefined" || !sessionReady) return;
    window.sessionStorage.setItem(beatWizardSessionKey, JSON.stringify({
      step,
      title,
      beatType,
      genre,
      instrumentTypes,
      bpm,
      keyText,
      moodTypes,
      description,
      basePrice,
      beatTags,
      tagInput,
      uploadCardState,
      commercialMode,
      enableFreeMp3Download,
      nonExclusiveWavEnabled,
      nonExclusiveWavFee,
      nonExclusiveStemsEnabled,
      nonExclusiveStemsFee,
      nonExclusivePublishingRights,
      nonExclusiveMasterRecordings,
      nonExclusiveLicensePeriod,
      exclusiveEnabled,
      exclusiveLicenseFee,
      exclusivePublishingRights,
      exclusiveNegotiable,
      declarationAccepted,
      selectedFeaturedCoverId,
    }));
  }, [
    basePrice, beatTags, beatType, beatWizardSessionKey, bpm, commercialMode, declarationAccepted, description,
    enableFreeMp3Download, exclusiveEnabled, exclusiveLicenseFee, exclusiveNegotiable, exclusivePublishingRights,
    selectedFeaturedCoverId,
    genre, instrumentTypes, keyText, moodTypes, nonExclusiveLicensePeriod, nonExclusiveMasterRecordings,
    nonExclusivePublishingRights, nonExclusiveStemsEnabled, nonExclusiveStemsFee, nonExclusiveWavEnabled,
    nonExclusiveWavFee, sessionReady, step, tagInput, title, uploadCardState,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !sessionReady) return;
    window.sessionStorage.setItem(kitWizardSessionKey, JSON.stringify({
      step,
      kitType,
      kitTitle,
      kitDescription,
      kitGenre,
      kitMood,
      kitBpmMin,
      kitBpmMax,
      kitBasePrice,
      kitReference,
      kitTags,
    }));
  }, [kitBasePrice, kitBpmMax, kitBpmMin, kitDescription, kitGenre, kitMood, kitReference, kitTags, kitTitle, kitType, kitWizardSessionKey, sessionReady, step]);

  useEffect(() => {
    if (!hasBeatWizardProgress || typeof window === "undefined") return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
      const nextUrl = new URL(href, window.location.href);
      const currentUrl = new URL(window.location.href);
      if (nextUrl.origin !== currentUrl.origin) return;
      if (`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}` === `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`) return;
      event.preventDefault();
      setPendingHref(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      setLeaveModalOpen(true);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [hasBeatWizardProgress]);

  return (
    <div className="space-y-5">
      <section className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="surface-panel rounded-xl p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">Steps</h2>
          <div className="mt-3 space-y-2">
            {steps.map((item, idx) => (
              <button key={item} type="button" onClick={() => setStep(idx)} className={`w-full rounded-md border px-3 py-3 text-left text-sm ${step === idx ? "border-[#8b28ff]/70 bg-[#8b28ff]/20" : "border-white/10 bg-[#121522]"}`}>
                {item}
              </button>
            ))}
          </div>
        </aside>

        <div className="surface-panel rounded-xl p-4">
          {flow === "beat" ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{beatSteps[step]}</h3>
              {step === 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1 md:col-span-2">
                    <input
                      className={`h-10 w-full rounded-md border bg-white/5 px-3 text-sm ${metaErrors.title ? beat22InvalidClass : "border-white/10"}`}
                      placeholder="Beat title*"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setMetaErrors((prev) => ({ ...prev, title: "" }));
                      }}
                    />
                    {metaErrors.title ? <p className="text-xs text-[#f2be43]">⚠ {metaErrors.title}</p> : null}
                  </div>
                  <div className="space-y-1">
                    <select className={`${beat22SelectClass} ${metaErrors.beatType ? beat22InvalidClass : ""}`} value={beatType} onChange={(e) => { setBeatType(e.target.value); setMetaErrors((prev) => ({ ...prev, beatType: "" })); }}>
                      <option value="">Beat Type</option>
                      {beatMetadataOptions.beat_types.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    {metaErrors.beatType ? <p className="text-xs text-[#f2be43]">⚠ {metaErrors.beatType}</p> : null}
                  </div>
                  <div className="space-y-1">
                    <select className={`${beat22SelectClass} ${metaErrors.genre ? beat22InvalidClass : ""}`} value={genre} onChange={(e) => { setGenre(e.target.value); setMetaErrors((prev) => ({ ...prev, genre: "" })); }}>
                      <option value="">Genre</option>
                      {beatMetadataOptions.genres.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    {metaErrors.genre ? <p className="text-xs text-[#f2be43]">⚠ {metaErrors.genre}</p> : null}
                  </div>
                  <UploadWizardPicker
                    label="Instruments"
                    options={beatMetadataOptions.instrument_types}
                    selectedValues={instrumentTypes}
                    onToggle={toggleInstrumentType}
                    placeholder="Instruments"
                    error={metaErrors.instrumentType}
                    multiple
                  />
                  <UploadWizardPicker
                    label="Moods"
                    options={beatMetadataOptions.moods}
                    selectedValues={moodTypes}
                    onToggle={toggleMood}
                    placeholder="Moods"
                    error={metaErrors.mood}
                    multiple
                  />
                  <div className="space-y-1">
                    <input
                      className={`h-12 w-full rounded-lg border bg-[#2f3138] px-4 text-sm text-white/85 outline-none ${metaErrors.bpm ? beat22InvalidClass : "border-white/10"}`}
                      placeholder="Tempo (BPM)"
                      value={bpm}
                      onChange={(e) => {
                        setBpm(e.target.value);
                        setMetaErrors((prev) => ({ ...prev, bpm: "" }));
                      }}
                    />
                    {metaErrors.bpm ? <p className="text-xs text-[#f2be43]">⚠ {metaErrors.bpm}</p> : null}
                  </div>
                  <div className="space-y-1">
                    <select className={`${beat22SelectClass} ${metaErrors.keyText ? beat22InvalidClass : ""}`} value={keyText} onChange={(e) => { setKeyText(e.target.value); setMetaErrors((prev) => ({ ...prev, keyText: "" })); }}>
                      <option value="">Keys</option>
                      {beatMetadataOptions.keys.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    {metaErrors.keyText ? <p className="text-xs text-[#f2be43]">⚠ {metaErrors.keyText}</p> : null}
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <input
                      className={`h-10 w-full rounded-md border bg-white/5 px-3 text-sm ${metaErrors.basePrice ? beat22InvalidClass : "border-white/10"}`}
                      placeholder="Base price*"
                      value={basePrice}
                      onChange={(e) => {
                        setBasePrice(e.target.value);
                        setMetaErrors((prev) => ({ ...prev, basePrice: "" }));
                      }}
                    />
                    {metaErrors.basePrice ? <p className="text-xs text-[#f2be43]">! {metaErrors.basePrice}</p> : null}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white/82">Add Tags</p>
                      <p className="text-xs text-white/42">Press Enter or Add</p>
                    </div>
                    <div className="flex gap-3">
                      <input
                        className="h-12 flex-1 rounded-lg border border-white/10 bg-[#2f3138] px-4 text-sm text-white/85 outline-none placeholder:text-white/30"
                        placeholder="Enter tags"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addBeatTag();
                          }
                        }}
                      />
                      <button type="button" onClick={addBeatTag} className="rounded-lg border border-white/10 bg-white/5 px-5 text-sm text-white/82 hover:bg-white/10">Add</button>
                    </div>
                    {beatTags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {beatTags.map((tag) => (
                          <button key={tag} type="button" onClick={() => removeBeatTag(tag)} className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/78 hover:bg-white/[0.08]">
                            <span>{tag}</span>
                            <X className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-[#17191f] p-4 md:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white/86">Featured producers</p>
                        <p className="mt-1 text-xs text-white/45">Pick collaborators from producers you follow, producers who follow you, or mutual follow-backs.</p>
                      </div>
                      <p className="text-xs uppercase tracking-[0.16em] text-white/38">{featuredProducerIds.length} selected</p>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {featuredProducerCandidates.map((producer) => {
                        const active = featuredProducerIds.includes(producer.producer_id);
                        const avatarUrl = resolveMediaUrl(producer.avatar_obj);
                        return (
                          <button
                            key={producer.producer_id}
                            type="button"
                            onClick={() => toggleFeaturedProducer(producer.producer_id)}
                            className={`flex items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${active ? "border-[#8b28ff] bg-[#8b28ff]/12" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"}`}
                          >
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={producer.producer_name} className="h-12 w-12 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white/80">
                                {producer.producer_name.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 text-sm font-medium text-white/88">{producer.producer_name}</p>
                              <p className="mt-1 line-clamp-2 text-xs text-white/48">{producer.headline || `@${producer.username}`}</p>
                              <span className="mt-2 inline-flex rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/48">{producer.relation.replace("_", " ")}</span>
                            </div>
                          </button>
                        );
                      })}
                      {featuredProducerCandidates.length === 0 ? <p className="sm:col-span-2 text-sm text-white/55">No eligible producer collaborators yet. Follow other producers or wait for follow-backs to see candidates here.</p> : null}
                    </div>
                  </div>
                  <textarea className="min-h-24 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm md:col-span-2" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
                  <button
                    type="button"
                    onClick={() => void withBusy(async () => {
                      const nextErrors = validateBeatMetadata();
                      if (Object.keys(nextErrors).length > 0) {
                        setMetaErrors(nextErrors);
                        return;
                      }
                      // Backend beat draft endpoint currently expects multipart/form-data for PATCH.
                      const form = new FormData();
                      form.append("title", title);
                      form.append("beat_type", beatType);
                      form.append("genre", genre);
                      form.append("instrument_types", JSON.stringify(instrumentTypes));
                      form.append("instrument_type", instrumentTypes[0] ?? "");
                      form.append("bpm", bpm ? String(Number(bpm)) : "");
                      form.append("key", keyText);
                      form.append("mood_types", JSON.stringify(moodTypes));
                      form.append("mood", moodTypes[0] ?? "");
                      form.append("description", description);
                      form.append("featured_producer_ids", JSON.stringify(featuredProducerIds));
                      form.append("media", buildBeatDraftMedia());
                      form.append("base_price", basePrice || "0.00");
                      form.append("current_step", "2");
                      await patchBeatDraft(form, true);
                      setMessage("Beat metadata saved.");
                      setStep(1);
                    })}
                    disabled={!producerModeReady || busy}
                    className="brand-btn px-4 py-2.5 text-sm md:col-span-2 disabled:opacity-60"
                  >
                    Save Metadata
                  </button>
                </div>
              ) : null}
              {step === 1 ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-[#f2be43]/25 bg-[#2a2619] px-4 py-3 text-sm text-[#efd7a0]">
                    <p className="font-semibold text-[#ffd979]">Add Account & Bank Details</p>
                    <p className="mt-0.5 text-[#d7c08b]">Saved draft uploads stay here across steps. Cover art can come from a square-cropped custom upload or a featured cover from the backend.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="rounded-xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-5">
                      <p className="text-sm text-white/80">Optional tagged preview MP3 (.mp3)</p>
                      <input type="file" accept=".mp3,audio/mpeg" onChange={(e) => { const file = e.target.files?.[0] ?? null; setTaggedMp3(file); updateUploadCard("tagged_mp3", file); }} className="mt-3 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80" />
                      <p className="mt-2 text-xs text-white/45">This is the preview artists hear before purchase. If you do not upload a separate beat file, this MP3 will also be used as the main audio.</p>
                      <UploadAssetCard icon={<Music2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />} title="Preview MP3" status={taggedMp3 ? "Selected in this browser session" : beatDraft?.preview_audio_obj ? "Saved to draft" : uploadCardState?.tagged_mp3 ? "Remembered for this tab" : ""} fileName={taggedMp3?.name ?? uploadCardState?.tagged_mp3 ?? fileNameFromUrl(beatDraft?.preview_audio_obj)} href={resolveMediaUrl(beatDraft?.preview_audio_obj)} />
                    </label>
                    <label className="rounded-xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-5">
                      <p className="text-sm text-white/80">Cover art</p>
                      <button type="button" onClick={() => setCoverPickerOpen(true)} className="mt-3 flex h-10 w-full items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 hover:bg-white/10">Choose cover art</button>
                      <p className="mt-2 text-xs text-white/45">Custom uploads are auto-cropped to a 1:1 square. You can also pick any featured cover below.</p>
                      <UploadAssetCard icon={<ImageIcon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />} title="Cover Art" status={coverArt ? "Custom cover cropped to square and ready" : selectedFeaturedCover ? "Featured cover selected" : beatDraft?.cover_art_obj ? "Saved to draft" : uploadCardState?.cover_art ? "Remembered for this tab" : ""} fileName={coverArt?.name ?? (selectedFeaturedCover ? "Featured cover" : uploadCardState?.cover_art ?? fileNameFromUrl(beatDraft?.cover_art_obj))} href={selectedFeaturedCoverUrl ?? resolveMediaUrl(beatDraft?.cover_art_obj)} previewUrl={customCoverPreviewUrl ?? selectedFeaturedCoverUrl ?? resolveMediaUrl(beatDraft?.cover_art_obj)} compactPreview />
                    </label>
                    <label className="rounded-xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-5">
                      <p className="text-sm text-white/80">Upload main beat file (.wav or .mp3)</p>
                      <input type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" onChange={(e) => { const file = e.target.files?.[0] ?? null; setWavFile(file); updateUploadCard("wav", file); }} className="mt-3 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80" />
                      <p className="mt-2 text-xs text-white/45">Required before publish. This is the audio saved to the beat record.</p>
                      <UploadAssetCard icon={<FileAudio className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />} title="Beat File" status={wavFile ? "Selected in this browser session" : beatDraft?.audio_file_obj ? "Saved to draft" : uploadCardState?.wav ? "Remembered for this tab" : ""} fileName={wavFile?.name ?? uploadCardState?.wav ?? fileNameFromUrl(beatDraft?.audio_file_obj)} href={resolveMediaUrl(beatDraft?.audio_file_obj)} />
                    </label>
                    <label className="rounded-xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-5">
                      <p className="text-sm text-white/80">Upload STEM files (.zip, .rar)</p>
                      <input type="file" accept=".zip,.rar,application/zip" onChange={(e) => { const file = e.target.files?.[0] ?? null; setStemsFile(file); updateUploadCard("stems", file); }} className="mt-3 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80" />
                      <UploadAssetCard icon={<Package className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />} title="STEM Archive" status={stemsFile ? "Selected in this browser session" : beatDraft?.stems_file_obj ? "Saved to draft" : uploadCardState?.stems ? "Remembered for this tab" : ""} fileName={stemsFile?.name ?? uploadCardState?.stems ?? fileNameFromUrl(beatDraft?.stems_file_obj)} href={resolveMediaUrl(beatDraft?.stems_file_obj)} />
                    </label>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      className="rounded-md border border-white/12 bg-white/5 px-4 py-2 text-sm text-white/80"
                    >
                      Back
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void withBusy(async () => {
                          const form = new FormData();
                          form.append("current_step", "2");
                          form.append("media", buildBeatDraftMedia());
                          appendBeatMediaFiles(form);
                          if (coverArt) form.append("cover_art_upload", coverArt);
                          if (selectedFeaturedCoverId) form.append("featured_cover_photo_id", String(selectedFeaturedCoverId));
                          form.append("featured_producer_ids", JSON.stringify(featuredProducerIds));
                          if (stemsFile) form.append("stems_file_upload", stemsFile);
                          await patchBeatDraft(form, true);
                          setMessage("Beat media saved as draft.");
                        })}
                        disabled={!producerModeReady || busy}
                        className="rounded-md border border-white/12 bg-white/5 px-4 py-2 text-sm text-white/85 disabled:opacity-60"
                      >
                        Save as draft
                      </button>
                      <button
                        type="button"
                        onClick={() => void withBusy(async () => {
                          const form = new FormData();
                          form.append("current_step", "3");
                          form.append("media", buildBeatDraftMedia());
                          appendBeatMediaFiles(form);
                          if (coverArt) form.append("cover_art_upload", coverArt);
                          if (selectedFeaturedCoverId) form.append("featured_cover_photo_id", String(selectedFeaturedCoverId));
                          form.append("featured_producer_ids", JSON.stringify(featuredProducerIds));
                          if (stemsFile) form.append("stems_file_upload", stemsFile);
                          await patchBeatDraft(form, true);
                          setMessage("Beat media uploaded.");
                          setStep(2);
                        })}
                        disabled={!producerModeReady || busy}
                        className="brand-btn px-4 py-2.5 text-sm disabled:opacity-60"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              {step === 2 ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-[#f2be43]/25 bg-[#2a2619] px-4 py-3 text-sm text-[#efd7a0]">
                    <p className="font-semibold text-[#ffd979]">Add Account & Bank Details</p>
                    <p className="mt-0.5 text-[#d7c08b]">You can upload and draft beats, but updating account and bank details is required to start selling.</p>
                  </div>

                  <h4 className="text-xl font-semibold">License Details</h4>
                  <div className="flex items-center justify-between">
                    <div className="space-x-4">
                      <button type="button" onClick={() => setCommercialMode("Manual")} className={`text-lg ${commercialMode === "Manual" ? "text-white" : "text-white/55"}`}>Manual</button>
                      <button type="button" onClick={() => setCommercialMode("Presets")} className={`text-lg ${commercialMode === "Presets" ? "text-[#f2be43]" : "text-white/55"}`}>Presets</button>
                    </div>
                    <p className="text-[#b48eff]">Upgrade to Premium</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                    <label className="flex items-center justify-between">
                      <span>Enable Free MP3 Download?</span>
                      <input type="checkbox" checked={enableFreeMp3Download} onChange={(e) => setEnableFreeMp3Download(e.target.checked)} className="h-5 w-5 accent-[#8b28ff]" />
                    </label>
                  </div>

                  <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <h5 className="text-3xl font-semibold">Non Exclusive License</h5>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                          <label className="mb-2 flex items-center justify-between">
                            <span>WAV</span>
                            <input type="checkbox" checked={nonExclusiveWavEnabled} onChange={(e) => setNonExclusiveWavEnabled(e.target.checked)} className="h-5 w-5 accent-[#8b28ff]" />
                          </label>
                          <input value={nonExclusiveWavFee} onChange={(e) => setNonExclusiveWavFee(e.target.value)} className="h-11 w-full rounded-md border border-white/10 bg-[#12141b] px-3 text-white/85" placeholder="₹ 0" />
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                          <label className="mb-2 flex items-center justify-between">
                            <span>WAV + STEMS</span>
                            <input type="checkbox" checked={nonExclusiveStemsEnabled} onChange={(e) => setNonExclusiveStemsEnabled(e.target.checked)} className="h-5 w-5 accent-[#8b28ff]" />
                          </label>
                          <input value={nonExclusiveStemsFee} onChange={(e) => setNonExclusiveStemsFee(e.target.value)} className="h-11 w-full rounded-md border border-white/10 bg-[#12141b] px-3 text-white/85" placeholder="₹ 0" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="mb-1 text-sm text-white/75">Publishing Rights (%)</p>
                          <select className={beat22SelectClass} value={nonExclusivePublishingRights} onChange={(e) => setNonExclusivePublishingRights(e.target.value)}>
                            <option value="">Select Publishing Rights</option>
                            {beatMetadataOptions.publishing_rights.map((item) => <option key={item} value={item}>{item}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="mb-1 text-sm text-white/75">No. of master recordings</p>
                          <select className={beat22SelectClass} value={nonExclusiveMasterRecordings} onChange={(e) => setNonExclusiveMasterRecordings(e.target.value)}>
                            <option value="">Select Master Recording</option>
                            {beatMetadataOptions.master_recordings.map((item) => <option key={item} value={item}>{item}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="mb-1 text-sm text-white/75">License Period</p>
                          <select className={beat22SelectClass} value={nonExclusiveLicensePeriod} onChange={(e) => setNonExclusiveLicensePeriod(e.target.value)}>
                            <option value="">Select License Period</option>
                            {beatMetadataOptions.license_periods.map((item) => <option key={item} value={item}>{item}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h5 className="text-3xl font-semibold">Exclusive License</h5>
                      <input type="checkbox" checked={exclusiveEnabled} onChange={(e) => setExclusiveEnabled(e.target.checked)} className="h-5 w-5 accent-[#8b28ff]" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input value={exclusiveLicenseFee} onChange={(e) => setExclusiveLicenseFee(e.target.value)} className="h-12 rounded-lg border border-white/10 bg-[#2f3138] px-3 text-white/85" placeholder="₹ 0" />
                      <select className={beat22SelectClass} value={exclusivePublishingRights} onChange={(e) => setExclusivePublishingRights(e.target.value)}>
                        <option value="">Select Publishing Rights</option>
                        {beatMetadataOptions.publishing_rights.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </div>
                    <label className="mt-3 inline-flex items-center gap-2">
                      <span>Is it negotiable?</span>
                      <input type="checkbox" checked={exclusiveNegotiable} onChange={(e) => setExclusiveNegotiable(e.target.checked)} className="h-5 w-5 accent-[#8b28ff]" />
                    </label>
                  </section>

                  <label className="mt-2 inline-flex items-start gap-3 text-sm text-white/70">
                    <input type="checkbox" checked={declarationAccepted} onChange={(e) => setDeclarationAccepted(e.target.checked)} className="mt-1 h-4 w-4 accent-[#8b28ff]" />
                    <span>I hereby state that the instrumental being uploaded by me does not contain any pornographic or seditious content in audio/visual manner.</span>
                  </label>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <button type="button" onClick={() => setStep(1)} className="rounded-md border border-white/12 bg-white/5 px-4 py-2 text-sm text-white/80">Back</button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void withBusy(async () => {
                          const numericBpm = Number(bpm);
                          const numericBasePrice = Number(basePrice);
                          if (
                            !title.trim() ||
                            !genre ||
                            !bpm.trim() ||
                            Number.isNaN(numericBpm) ||
                            numericBpm <= 0 ||
                            !basePrice.trim() ||
                            Number.isNaN(numericBasePrice) ||
                            numericBasePrice <= 0
                          ) {
                            setError("Complete metadata first: title, genre, bpm, and base price (must be > 0).");
                            setStep(0);
                            return;
                          }
                          if (!token) return;
                          const currentDraft = await ensureBeatDraft();
                          const refreshedDraft = await apiRequest<BeatDraft>(`/beats/upload-drafts/${currentDraft.id}/`, { token });
                          setBeatDraft(refreshedDraft);
                          syncBeatFromDraft(refreshedDraft);
                          if (!refreshedDraft.audio_file_obj) {
                            setError("Upload the main beat file in Media Upload before submitting.");
                            setStep(1);
                            return;
                          }

                          const form = new FormData();
                          form.append("current_step", "3");
                          // Re-send the core required fields to avoid publishing an incomplete draft.
                          form.append("title", title.trim());
                          form.append("genre", genre);
                          form.append("instrument_types", JSON.stringify(instrumentTypes));
                          form.append("instrument_type", instrumentTypes[0] ?? "");
                          form.append("bpm", String(numericBpm));
                          form.append("base_price", basePrice);
                          form.append("commercial_mode", commercialMode);
                          form.append("enable_free_mp3_download", enableFreeMp3Download ? "true" : "false");
                          form.append("non_exclusive_wav_enabled", nonExclusiveWavEnabled ? "true" : "false");
                          form.append("non_exclusive_wav_fee", nonExclusiveWavFee || "0.00");
                          form.append("non_exclusive_stems_enabled", nonExclusiveStemsEnabled ? "true" : "false");
                          form.append("non_exclusive_stems_fee", nonExclusiveStemsFee || "0.00");
                          form.append("non_exclusive_publishing_rights", nonExclusivePublishingRights);
                          form.append("non_exclusive_master_recordings", nonExclusiveMasterRecordings);
                          form.append("non_exclusive_license_period", nonExclusiveLicensePeriod);
                          form.append("exclusive_enabled", exclusiveEnabled ? "true" : "false");
                          form.append("exclusive_license_fee", exclusiveLicenseFee || "0.00");
                          form.append("exclusive_publishing_rights", exclusivePublishingRights);
                          form.append("exclusive_negotiable", exclusiveNegotiable ? "true" : "false");
                          form.append("declaration_accepted", declarationAccepted ? "true" : "false");
                          form.append("media", buildBeatDraftMedia());
                          if (selectedFeaturedCoverId) form.append("featured_cover_photo_id", String(selectedFeaturedCoverId));
                          form.append("featured_producer_ids", JSON.stringify(featuredProducerIds));
                          await patchBeatDraft(form, true);
                          setMessage("License details saved as draft.");
                        })}
                        disabled={!producerModeReady || busy}
                        className="rounded-md border border-white/12 bg-white/5 px-4 py-2 text-sm text-white/85 disabled:opacity-60"
                      >
                        Save as draft
                      </button>
                      <button
                        type="button"
                        onClick={() => void withBusy(async () => {
                          const form = new FormData();
                          form.append("current_step", "3");
                          form.append("commercial_mode", commercialMode);
                          form.append("enable_free_mp3_download", enableFreeMp3Download ? "true" : "false");
                          form.append("non_exclusive_wav_enabled", nonExclusiveWavEnabled ? "true" : "false");
                          form.append("non_exclusive_wav_fee", nonExclusiveWavFee || "0.00");
                          form.append("non_exclusive_stems_enabled", nonExclusiveStemsEnabled ? "true" : "false");
                          form.append("non_exclusive_stems_fee", nonExclusiveStemsFee || "0.00");
                          form.append("non_exclusive_publishing_rights", nonExclusivePublishingRights);
                          form.append("non_exclusive_master_recordings", nonExclusiveMasterRecordings);
                          form.append("non_exclusive_license_period", nonExclusiveLicensePeriod);
                          form.append("exclusive_enabled", exclusiveEnabled ? "true" : "false");
                          form.append("exclusive_license_fee", exclusiveLicenseFee || "0.00");
                          form.append("exclusive_publishing_rights", exclusivePublishingRights);
                          form.append("exclusive_negotiable", exclusiveNegotiable ? "true" : "false");
                          form.append("declaration_accepted", declarationAccepted ? "true" : "false");
                          form.append("media", buildBeatDraftMedia());
                          if (selectedFeaturedCoverId) form.append("featured_cover_photo_id", String(selectedFeaturedCoverId));
                          form.append("featured_producer_ids", JSON.stringify(featuredProducerIds));
                          await patchBeatDraft(form, true);
                          const draft = await ensureBeatDraft();
                          const beat = await apiRequest<PublishedBeat>(`/beats/upload-drafts/${draft.id}/publish/`, { method: "POST", token, body: {} });
                          if (typeof window !== "undefined") {
                            window.sessionStorage.setItem("beatkosh-global-flash", `Beat has been submitted: ${beat.title}`);
                          }
                          clearBeatWizardSession();
                          setUploadCardState({});
                          setSelectedFeaturedCoverId(null);
                          setCoverArt(null);
                          setTaggedMp3(null);
                          setWavFile(null);
                          setStemsFile(null);
                          setPublishedBeat(beat);
                          router.push("/");
                        })}
                        disabled={!producerModeReady || busy || !declarationAccepted}
                        className="brand-btn px-4 py-2.5 text-sm disabled:opacity-60"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{kitSteps[step]}</h3>
              {step === 0 ? (
                <div className="space-y-3">
                  <select className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm" value={kitType} onChange={(e) => setKitType(e.target.value)}>
                    <option value="">Select pack type</option>
                    <option value="Melody loops kit">Melody loops kit</option>
                    <option value="Drum kit">Drum kit</option>
                    <option value="Vocal kit">Vocal kit</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void withBusy(async () => {
                      await patchKitDraft({ kit_type: kitType, current_step: 2 });
                      setMessage("Sound-kit type saved.");
                      setStep(1);
                    })}
                    disabled={!producerModeReady || busy}
                    className="brand-btn px-4 py-2.5 text-sm disabled:opacity-60"
                  >
                    Save Kit Type
                  </button>
                </div>
              ) : null}
              {step === 1 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm md:col-span-2" placeholder="Title" value={kitTitle} onChange={(e) => setKitTitle(e.target.value)} />
                  <input className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm" placeholder="Genre" value={kitGenre} onChange={(e) => setKitGenre(e.target.value)} />
                  <input className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm" placeholder="Mood" value={kitMood} onChange={(e) => setKitMood(e.target.value)} />
                  <input className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm" placeholder="Min BPM" value={kitBpmMin} onChange={(e) => setKitBpmMin(e.target.value)} />
                  <input className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm" placeholder="Max BPM" value={kitBpmMax} onChange={(e) => setKitBpmMax(e.target.value)} />
                  <input className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm md:col-span-2" placeholder="Base price" value={kitBasePrice} onChange={(e) => setKitBasePrice(e.target.value)} />
                  <textarea className="min-h-24 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm md:col-span-2" placeholder="Description" value={kitDescription} onChange={(e) => setKitDescription(e.target.value)} />
                  <button
                    type="button"
                    onClick={() => void withBusy(async () => {
                      await patchKitDraft({
                        title: kitTitle,
                        description: kitDescription,
                        genre: kitGenre,
                        mood: kitMood,
                        bpm_min: kitBpmMin ? Number(kitBpmMin) : null,
                        bpm_max: kitBpmMax ? Number(kitBpmMax) : null,
                        base_price: kitBasePrice || "0.00",
                        current_step: 3,
                      });
                      setMessage("Sound-kit metadata saved.");
                      setStep(2);
                    })}
                    disabled={!producerModeReady || busy}
                    className="brand-btn px-4 py-2.5 text-sm md:col-span-2 disabled:opacity-60"
                  >
                    Save Metadata
                  </button>
                </div>
              ) : null}
              {step === 2 ? (
                <div className="space-y-3">
                  <input type="file" accept=".zip,.rar,application/zip" onChange={(e) => setKitArchiveFile(e.target.files?.[0] ?? null)} className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80" />
                  <input type="file" accept="audio/*" onChange={(e) => setKitPreviewAudio(e.target.files?.[0] ?? null)} className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80" />
                  <input type="file" accept="image/*" onChange={(e) => setKitCoverArt(e.target.files?.[0] ?? null)} className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80" />
                  <input className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm" placeholder="Reference link" value={kitReference} onChange={(e) => setKitReference(e.target.value)} />
                  <input className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm" placeholder="Tags (comma separated)" value={kitTags} onChange={(e) => setKitTags(e.target.value)} />
                  <button
                    type="button"
                    onClick={() => void withBusy(async () => {
                      const form = new FormData();
                      form.append("current_step", "4");
                      if (kitArchiveFile) form.append("archive_file_upload", kitArchiveFile);
                      if (kitPreviewAudio) form.append("preview_audio_upload", kitPreviewAudio);
                      if (kitCoverArt) form.append("cover_art_upload", kitCoverArt);
                      if (kitReference) form.append("reference_links", JSON.stringify([kitReference]));
                      if (kitTags.trim()) form.append("tags", JSON.stringify(kitTags.split(",").map((v) => v.trim()).filter(Boolean)));
                      await patchKitDraft(form, true);
                      setMessage("Sound-kit files uploaded.");
                      setStep(3);
                    })}
                    disabled={!producerModeReady || busy}
                    className="brand-btn px-4 py-2.5 text-sm disabled:opacity-60"
                  >
                    Upload Files
                  </button>
                </div>
              ) : null}
              {step === 3 ? (
                <div className="space-y-3">
                  <p className="text-sm text-white/70">Licensing is captured via base price and metadata in current backend model.</p>
                  <button
                    type="button"
                    onClick={() => void withBusy(async () => {
                      if (!token) return;
                      const draft = await ensureKitDraft();
                      const kit = await apiRequest<PublishedSoundKit>(`/soundkits/upload-drafts/${draft.id}/publish/`, { method: "POST", token, body: {} });
                      clearKitWizardSession();
                      setPublishedKit(kit);
                      setMessage(`Sound kit published: ${kit.title}`);
                    })}
                    disabled={!producerModeReady || busy}
                    className="brand-btn px-4 py-2.5 text-sm disabled:opacity-60"
                  >
                    Publish Sound Kit
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {coverPickerOpen ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-[760px] rounded-[24px] border border-white/10 bg-[#202126] p-5 shadow-2xl shadow-black/40 max-h-[88vh] overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/45">Cover Art</p>
                <h3 className="mt-2 text-xl font-semibold">Choose a square cover</h3>
                <p className="mt-2 text-sm text-white/62">Upload your own art or pick one featured cover. Everything is cropped or displayed in 1:1.</p>
              </div>
              <button type="button" onClick={() => setCoverPickerOpen(false)} className="rounded-lg border border-white/12 px-3 py-2 text-sm text-white/72 hover:bg-white/5">Close</button>
            </div>

            <div className="mt-4 rounded-[20px] border border-white/10 bg-[#17191f] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white/86">Upload custom cover</p>
                  <p className="mt-1 text-xs text-white/45">Best for your own art. The image is cropped to a square automatically.</p>
                </div>
                <button type="button" onClick={() => customCoverInputRef.current?.click()} className="brand-btn px-4 py-2 text-sm">Upload Custom Cover</button>
                <input ref={customCoverInputRef} type="file" accept="image/png,image/jpg,image/jpeg,image/webp" onChange={(event) => void handleCustomCoverChange(event)} className="hidden" />
              </div>
              {customCoverPreviewUrl ? (
                <div className="mt-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                  <img src={customCoverPreviewUrl} alt="Custom cover preview" className="h-24 w-24 rounded-2xl object-cover" />
                  <div>
                    <p className="text-sm font-medium text-white/84">{coverArt?.name}</p>
                    <p className="mt-1 text-xs text-white/45">Square crop ready for upload</p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white/86">Featured covers</p>
                  <p className="mt-1 text-xs text-white/45">Choose from the featured cover photos already available in the backend.</p>
                </div>
              </div>
              <div className="mt-4 max-h-[42vh] overflow-y-auto pr-1">
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {featuredCovers.map((cover) => {
                    const active = selectedFeaturedCoverId === cover.id;
                    const coverUrl = resolveMediaUrl(cover.image_url);
                    return (
                      <button key={cover.id} type="button" onClick={() => handleFeaturedCoverSelect(cover)} className={`aspect-square overflow-hidden rounded-[18px] border transition ${active ? "border-[#8b28ff] ring-2 ring-[#8b28ff]/50" : "border-white/10 hover:border-white/25"}`}>
                        {coverUrl ? <img src={coverUrl} alt="Featured cover" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-white/5 text-xs text-white/40">No image</div>}
                      </button>
                    );
                  })}
                  {featuredCovers.length === 0 ? <p className="col-span-full text-sm text-white/55">No featured covers are available yet.</p> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {leaveModalOpen ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[520px] rounded-[28px] border border-white/10 bg-[#202126] p-8 text-center shadow-2xl shadow-black/40">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/8 text-white/85">
              <AlertTriangle className="h-8 w-8" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <h3 className="mt-6 text-2xl font-semibold">Are you sure you want to leave?</h3>
            <p className="mt-3 text-sm text-white/62">Unsaved changes in this upload card will be lost. Saved drafts will remain available in Media Uploads.</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button type="button" onClick={() => {
                setLeaveModalOpen(false);
                if (pendingHref) router.push(pendingHref);
              }} className="rounded-lg bg-white/12 px-8 py-3 text-sm text-white/88 hover:bg-white/18">Leave</button>
              <button type="button" onClick={() => { setPendingHref(null); setLeaveModalOpen(false); }} className="rounded-lg border border-white/12 px-8 py-3 text-sm text-white/80 hover:bg-white/5">Stay here</button>
            </div>
          </div>
        </div>
      ) : null}

      {publishedBeat ? (
        <section className="surface-panel rounded-xl p-4">
          <h3 className="text-lg font-semibold">Last Published Beat</h3>
          <p className="mt-1 text-sm text-white/65">{publishedBeat.title} by {publishedBeat.producer_username}</p>
        </section>
      ) : null}

      {publishedKit ? (
        <section className="surface-panel rounded-xl p-4">
          <h3 className="text-lg font-semibold">Last Published Sound Kit</h3>
          <p className="mt-1 text-sm text-white/65">{publishedKit.title} by {publishedKit.producer_username}</p>
        </section>
      ) : null}

      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}







