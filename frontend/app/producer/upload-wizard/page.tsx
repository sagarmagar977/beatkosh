"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useAuth } from "@/app/auth-context";
import { apiRequest } from "@/lib/api";

type BeatDraft = {
  id: number;
  title: string;
  beat_type: string;
  genre: string;
  instrument_type: string;
  bpm: number | null;
  key: string;
  mood: string;
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
  audio_file_obj?: string | null;
  preview_audio_obj?: string | null;
  stems_file_obj?: string | null;
  cover_art_obj?: string | null;
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

export default function ProducerUploadWizardPage() {
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
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
  const [instrumentType, setInstrumentType] = useState("");
  const [bpm, setBpm] = useState("");
  const [keyText, setKeyText] = useState("");
  const [mood, setMood] = useState("");
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
  const [metaErrors, setMetaErrors] = useState<Record<string, string>>({});

  const [taggedMp3, setTaggedMp3] = useState<File | null>(null);
  const [wavFile, setWavFile] = useState<File | null>(null);
  const [stemsFile, setStemsFile] = useState<File | null>(null);
  const [coverArt, setCoverArt] = useState<File | null>(null);

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

  const steps = flow === "beat" ? beatSteps : kitSteps;
  const producerModeReady = Boolean(user?.is_producer && user?.active_role === "producer");
  const beat22SelectClass = "h-12 w-full rounded-lg border border-white/10 bg-[#2f3138] px-4 text-sm text-white/85 outline-none";
  const beat22InvalidClass = "border-[#f2be43] shadow-[0_0_0_1px_rgba(242,190,67,0.25)]";

  const syncBeatFromDraft = (item: BeatDraft) => {
    setTitle(item.title ?? "");
    setBeatType(item.beat_type ?? "");
    setGenre(item.genre ?? "");
    setInstrumentType(item.instrument_type ?? "");
    setBpm(item.bpm ? String(item.bpm) : "");
    setKeyText(item.key ?? "");
    setMood(item.mood ?? "");
    setDescription(item.description ?? "");
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

  useEffect(() => {
    const run = async () => {
      if (!token) {
        return;
      }
      try {
        const [beatDrafts, soundKitDrafts, metadataOptions] = await Promise.all([
          apiRequest<BeatDraft[]>("/beats/upload-drafts/", { token }),
          apiRequest<SoundKitDraft[]>("/soundkits/upload-drafts/", { token }),
          apiRequest<BeatMetadataOptions>("/beats/metadata-options/"),
        ]);
        setBeatMetadataOptions(metadataOptions);

        const activeBeatDraft = beatDrafts.find((item) => item.status === "draft") ?? null;
        setBeatDraft(activeBeatDraft);
        if (activeBeatDraft) {
          syncBeatFromDraft(activeBeatDraft);
        }

        const activeKitDraft = soundKitDrafts.find((item) => item.status === "draft") ?? null;
        setKitDraft(activeKitDraft);
        if (activeKitDraft) {
          syncKitFromDraft(activeKitDraft);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load wizard");
      }
    };
    void run();
  }, [token]);

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
    if (!instrumentType) next.instrumentType = "This field is required";
    if (!mood) next.mood = "This field is required";
    if (!bpm.trim()) next.bpm = "This field is required";
    if (!keyText) next.keyText = "This field is required";
    const numericBasePrice = Number(basePrice);
    if (!basePrice.trim() || Number.isNaN(numericBasePrice) || numericBasePrice <= 0) {
      next.basePrice = "Base price must be greater than 0";
    }
    return next;
  };

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
                    {metaErrors.title ? <p className="text-xs text-[#f2be43]">âš  {metaErrors.title}</p> : null}
                  </div>
                  <div className="space-y-1">
                    <select className={`${beat22SelectClass} ${metaErrors.beatType ? beat22InvalidClass : ""}`} value={beatType} onChange={(e) => { setBeatType(e.target.value); setMetaErrors((prev) => ({ ...prev, beatType: "" })); }}>
                      <option value="">Beat Type</option>
                      {beatMetadataOptions.beat_types.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    {metaErrors.beatType ? <p className="text-xs text-[#f2be43]">âš  {metaErrors.beatType}</p> : null}
                  </div>
                  <div className="space-y-1">
                    <select className={`${beat22SelectClass} ${metaErrors.genre ? beat22InvalidClass : ""}`} value={genre} onChange={(e) => { setGenre(e.target.value); setMetaErrors((prev) => ({ ...prev, genre: "" })); }}>
                      <option value="">Genre</option>
                      {beatMetadataOptions.genres.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    {metaErrors.genre ? <p className="text-xs text-[#f2be43]">âš  {metaErrors.genre}</p> : null}
                  </div>
                  <div className="space-y-1">
                    <select className={`${beat22SelectClass} ${metaErrors.instrumentType ? beat22InvalidClass : ""}`} value={instrumentType} onChange={(e) => { setInstrumentType(e.target.value); setMetaErrors((prev) => ({ ...prev, instrumentType: "" })); }}>
                      <option value="">Instruments</option>
                      {beatMetadataOptions.instrument_types.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    {metaErrors.instrumentType ? <p className="text-xs text-[#f2be43]">âš  {metaErrors.instrumentType}</p> : null}
                  </div>
                  <div className="space-y-1">
                    <select className={`${beat22SelectClass} ${metaErrors.mood ? beat22InvalidClass : ""}`} value={mood} onChange={(e) => { setMood(e.target.value); setMetaErrors((prev) => ({ ...prev, mood: "" })); }}>
                      <option value="">Moods</option>
                      {beatMetadataOptions.moods.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    {metaErrors.mood ? <p className="text-xs text-[#f2be43]">âš  {metaErrors.mood}</p> : null}
                  </div>
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
                    {metaErrors.bpm ? <p className="text-xs text-[#f2be43]">âš  {metaErrors.bpm}</p> : null}
                  </div>
                  <div className="space-y-1">
                    <select className={`${beat22SelectClass} ${metaErrors.keyText ? beat22InvalidClass : ""}`} value={keyText} onChange={(e) => { setKeyText(e.target.value); setMetaErrors((prev) => ({ ...prev, keyText: "" })); }}>
                      <option value="">Keys</option>
                      {beatMetadataOptions.keys.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    {metaErrors.keyText ? <p className="text-xs text-[#f2be43]">âš  {metaErrors.keyText}</p> : null}
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
                      form.append("instrument_type", instrumentType);
                      form.append("bpm", bpm ? String(Number(bpm)) : "");
                      form.append("key", keyText);
                      form.append("mood", mood);
                      form.append("description", description);
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
                <div className="space-y-3">
                  <div className="rounded-lg border border-[#f2be43]/25 bg-[#2a2619] px-4 py-3 text-sm text-[#efd7a0]">
                    <p className="font-semibold text-[#ffd979]">Add Account & Bank Details</p>
                    <p className="mt-0.5 text-[#d7c08b]">You can upload and draft beats, but updating account and bank details is required to start selling.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="rounded-xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-5">
                      <p className="text-sm text-white/80">Upload tagged MP3 file (.mp3)</p>
                      <input type="file" accept=".mp3,audio/mpeg" onChange={(e) => setTaggedMp3(e.target.files?.[0] ?? null)} className="mt-3 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80" />
                    </label>
                    <label className="rounded-xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-5">
                      <p className="text-sm text-white/80">Upload cover art (.png, .jpg, .jpeg)</p>
                      <input type="file" accept="image/png,image/jpg,image/jpeg" onChange={(e) => setCoverArt(e.target.files?.[0] ?? null)} className="mt-3 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80" />
                    </label>
                    <label className="rounded-xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-5">
                      <p className="text-sm text-white/80">Upload untagged WAV file (.wav)</p>
                      <input type="file" accept=".wav,audio/wav" onChange={(e) => setWavFile(e.target.files?.[0] ?? null)} className="mt-3 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80" />
                    </label>
                    <label className="rounded-xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-5">
                      <p className="text-sm text-white/80">Upload STEM files (.zip, .rar)</p>
                      <input type="file" accept=".zip,.rar,application/zip" onChange={(e) => setStemsFile(e.target.files?.[0] ?? null)} className="mt-3 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80" />
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
                          if (taggedMp3) form.append("preview_audio_upload", taggedMp3);
                          if (wavFile) form.append("audio_file_upload", wavFile);
                          if (coverArt) form.append("cover_art_upload", coverArt);
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
                          if (taggedMp3) form.append("preview_audio_upload", taggedMp3);
                          if (wavFile) form.append("audio_file_upload", wavFile);
                          if (coverArt) form.append("cover_art_upload", coverArt);
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
                          <input value={nonExclusiveWavFee} onChange={(e) => setNonExclusiveWavFee(e.target.value)} className="h-11 w-full rounded-md border border-white/10 bg-[#12141b] px-3 text-white/85" placeholder="â‚¹ 0" />
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                          <label className="mb-2 flex items-center justify-between">
                            <span>WAV + STEMS</span>
                            <input type="checkbox" checked={nonExclusiveStemsEnabled} onChange={(e) => setNonExclusiveStemsEnabled(e.target.checked)} className="h-5 w-5 accent-[#8b28ff]" />
                          </label>
                          <input value={nonExclusiveStemsFee} onChange={(e) => setNonExclusiveStemsFee(e.target.value)} className="h-11 w-full rounded-md border border-white/10 bg-[#12141b] px-3 text-white/85" placeholder="â‚¹ 0" />
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
                      <input value={exclusiveLicenseFee} onChange={(e) => setExclusiveLicenseFee(e.target.value)} className="h-12 rounded-lg border border-white/10 bg-[#2f3138] px-3 text-white/85" placeholder="â‚¹ 0" />
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
                          if (!refreshedDraft.preview_audio_obj && !refreshedDraft.audio_file_obj) {
                            setError("Upload audio in Media Upload step so the beat is playable before submitting.");
                            setStep(1);
                            return;
                          }

                          const form = new FormData();
                          form.append("current_step", "3");
                          // Re-send the core required fields to avoid publishing an incomplete draft.
                          form.append("title", title.trim());
                          form.append("genre", genre);
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
                          await patchBeatDraft(form, true);
                          const draft = await ensureBeatDraft();
                          const beat = await apiRequest<PublishedBeat>(`/beats/upload-drafts/${draft.id}/publish/`, { method: "POST", token, body: {} });
                          setPublishedBeat(beat);
                          setMessage(`Beat published: ${beat.title}`);
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

