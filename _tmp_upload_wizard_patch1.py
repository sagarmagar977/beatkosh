from pathlib import Path

path = Path(r'frontend/app/producer/upload-wizard/page.tsx')
text = path.read_text(encoding='utf-8')

replacements = []
replacements.append((
'''import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useAuth } from "@/app/auth-context";
import { apiRequest } from "@/lib/api";
''',
'''import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ChevronDown, FileAudio, ImageIcon, Music2, Package, Search, X } from "lucide-react";

import { useAuth } from "@/app/auth-context";
import { apiRequest, resolveMediaUrl } from "@/lib/api";
'''))

replacements.append((
'''type BeatDraft = {
''',
'''type BeatDraftMedia = {
  tags?: string[];
  upload_card_state?: {
    tagged_mp3?: string;
    wav?: string;
    stems?: string;
    cover_art?: string;
  };
};

type BeatDraft = {
'''))

replacements.append((
'''  published_beat: number | null;
  audio_file_obj?: string | null;
''',
'''  published_beat: number | null;
  media?: BeatDraftMedia;
  audio_file_obj?: string | null;
'''))

replacements.append((
'''const beatSteps = ["Meta Data", "Media Upload", "License"];
const kitSteps = ["Kit Type", "Metadata", "Upload Files", "Licensing"];

export default function ProducerUploadWizardPage() {
''',
'''const beatSteps = ["Meta Data", "Media Upload", "License"];
const kitSteps = ["Kit Type", "Metadata", "Upload Files", "Licensing"];
const BEAT_WIZARD_SESSION_KEY = "producer-upload-wizard-beat-session";

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
                        setOpen(False)
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

function UploadAssetCard({ icon, title, status, fileName, href }: { icon: React.ReactNode; title: string; status: string; fileName?: string; href?: string }) {
  if (!fileName && !href) return null;
  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-[#17191f] px-3 py-3 text-sm text-white/75">
      <div className="flex items-start gap-3">
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

export default function ProducerUploadWizardPage() {
'''))

for old, new in replacements:
    text = text.replace(old, new)

text = text.replace('setOpen(False)', 'setOpen(false);\n                        setQuery("");')
path.write_text(text, encoding='utf-8')
