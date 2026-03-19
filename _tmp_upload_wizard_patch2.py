from pathlib import Path

path = Path(r'frontend/app/producer/upload-wizard/page.tsx')
text = path.read_text(encoding='utf-8')

text = text.replace('import { useEffect, useMemo, useState } from "react";', 'import { type ReactNode, useEffect, useMemo, useState } from "react";')
text = text.replace('icon: React.ReactNode;', 'icon: ReactNode;')

text = text.replace(
'''  const searchParams = useSearchParams();
  const { token, user } = useAuth();
''',
'''  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
''')

text = text.replace(
'''  const [exclusiveNegotiable, setExclusiveNegotiable] = useState(false);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [metaErrors, setMetaErrors] = useState<Record<string, string>>({});
''',
'''  const [exclusiveNegotiable, setExclusiveNegotiable] = useState(false);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [beatTags, setBeatTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [uploadCardState, setUploadCardState] = useState<BeatDraftMedia["upload_card_state"]>({});
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [metaErrors, setMetaErrors] = useState<Record<string, string>>({});
''')

text = text.replace(
'''    setMood(item.mood ?? "");
    setDescription(item.description ?? "");
    setBasePrice(item.base_price ?? "0.00");
''',
'''    setMood(item.mood ?? "");
    setDescription(item.description ?? "");
    setBeatTags((item.media?.tags ?? []).length ? item.media?.tags ?? [] : []);
    setUploadCardState((prev) => ({ ...prev, ...(item.media?.upload_card_state ?? {}) }));
    setBasePrice(item.base_price ?? "0.00");
''')

text = text.replace(
'''  const toggleInstrumentType = (value: string) => {
    setInstrumentTypes((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
    setMetaErrors((prev) => ({ ...prev, instrumentType: "" }));
  };
''',
'''  const toggleInstrumentType = (value: string) => {
    setInstrumentTypes((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
    setMetaErrors((prev) => ({ ...prev, instrumentType: "" }));
  };

  const toggleMood = (value: string) => {
    setMood((prev) => (prev === value ? "" : value));
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

  const buildBeatDraftMedia = () => JSON.stringify({
    ...(beatDraft?.media ?? {}),
    tags: beatTags,
    upload_card_state: uploadCardState,
  });

  const clearBeatWizardSession = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(BEAT_WIZARD_SESSION_KEY);
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
    mood ||
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
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(BEAT_WIZARD_SESSION_KEY);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as { beatTags?: string[]; uploadCardState?: BeatDraftMedia["upload_card_state"] };
      if (payload.beatTags?.length) setBeatTags(payload.beatTags);
      if (payload.uploadCardState) setUploadCardState(payload.uploadCardState);
    } catch {
      window.sessionStorage.removeItem(BEAT_WIZARD_SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(BEAT_WIZARD_SESSION_KEY, JSON.stringify({ beatTags, uploadCardState }));
  }, [beatTags, uploadCardState]);

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
      if (!href || href.startswith("#") if False else False):
        pass
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasBeatWizardProgress]);
''')

text = text.replace('if (!href || href.startswith("#") if False else False):\n        pass', 'if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;\n      const nextUrl = new URL(href, window.location.href);\n      const currentUrl = new URL(window.location.href);\n      if (nextUrl.origin !== currentUrl.origin) return;\n      if (`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}` === `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`) return;\n      event.preventDefault();\n      setPendingHref(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);\n      setLeaveModalOpen(true);')
text = text.replace('    window.addEventListener("beforeunload", handleBeforeUnload);\n    return () => {\n      window.removeEventListener("beforeunload", handleBeforeUnload);\n    };', '    window.addEventListener("beforeunload", handleBeforeUnload);\n    document.addEventListener("click", handleDocumentClick, true);\n    return () => {\n      window.removeEventListener("beforeunload", handleBeforeUnload);\n      document.removeEventListener("click", handleDocumentClick, true);\n    };')

path.write_text(text, encoding='utf-8')
