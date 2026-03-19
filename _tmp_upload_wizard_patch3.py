from pathlib import Path

path = Path(r'frontend/app/producer/upload-wizard/page.tsx')
text = path.read_text(encoding='utf-8')

text = text.replace(
'''                  <div className="space-y-1">
                    <div className={`rounded-lg border bg-[#2f3138] p-3 ${metaErrors.instrumentType ? beat22InvalidClass : "border-white/10"}`}>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm text-white/85">Instruments</p>
                        <span className="text-xs text-white/45">{instrumentTypes.length} selected</span>
                      </div>
                      <div className="grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                        {beatMetadataOptions.instrument_types.map((item) => (
                          <label key={item} className="flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-white/80">
                            <input type="checkbox" checked={instrumentTypes.includes(item)} onChange={() => toggleInstrumentType(item)} className="h-4 w-4 accent-[#8b28ff]" />
                            <span>{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {metaErrors.instrumentType ? <p className="text-xs text-[#f2be43]">⚠ {metaErrors.instrumentType}</p> : null}
                  </div>
                  <div className="space-y-1">
                    <select className={`${beat22SelectClass} ${metaErrors.mood ? beat22InvalidClass : ""}`} value={mood} onChange={(e) => { setMood(e.target.value); setMetaErrors((prev) => ({ ...prev, mood: "" })); }}>
                      <option value="">Moods</option>
                      {beatMetadataOptions.moods.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    {metaErrors.mood ? <p className="text-xs text-[#f2be43]">⚠ {metaErrors.mood}</p> : null}
                  </div>
''',
'''                  <UploadWizardPicker
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
                    selectedValues={mood ? [mood] : []}
                    onToggle={toggleMood}
                    placeholder="Moods"
                    error={metaErrors.mood}
                  />
''')

text = text.replace(
'''                  <div className="space-y-1 md:col-span-2">
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
''',
'''                  <div className="space-y-1 md:col-span-2">
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
                  <textarea className="min-h-24 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm md:col-span-2" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
''')

text = text.replace(
'                      form.append("description", description);\n                      form.append("base_price", basePrice || "0.00");',
'                      form.append("description", description);\n                      form.append("media", buildBeatDraftMedia());\n                      form.append("base_price", basePrice || "0.00");'
)

old_media = '''              {step === 1 ? (
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
'''
new_media = '''              {step === 1 ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-[#f2be43]/25 bg-[#2a2619] px-4 py-3 text-sm text-[#efd7a0]">
                    <p className="font-semibold text-[#ffd979]">Add Account & Bank Details</p>
                    <p className="mt-0.5 text-[#d7c08b]">Saved draft uploads stay here across steps. If you refresh before uploading, the browser can remember the file name for this tab, but you may need to pick the file again.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="rounded-xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-5">
                      <p className="text-sm text-white/80">Upload tagged MP3 file (.mp3)</p>
                      <input type="file" accept=".mp3,audio/mpeg" onChange={(e) => { const file = e.target.files?.[0] ?? null; setTaggedMp3(file); updateUploadCard("tagged_mp3", file); }} className="mt-3 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80" />
                      <UploadAssetCard icon={<Music2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />} title="Tagged MP3" status={taggedMp3 ? "Selected in this browser session" : beatDraft?.preview_audio_obj ? "Saved to draft" : uploadCardState?.tagged_mp3 ? "Remembered for this tab" : ""} fileName={taggedMp3?.name ?? uploadCardState?.tagged_mp3 ?? fileNameFromUrl(beatDraft?.preview_audio_obj)} href={resolveMediaUrl(beatDraft?.preview_audio_obj)} />
                    </label>
                    <label className="rounded-xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-5">
                      <p className="text-sm text-white/80">Upload cover art (.png, .jpg, .jpeg)</p>
                      <input type="file" accept="image/png,image/jpg,image/jpeg" onChange={(e) => { const file = e.target.files?.[0] ?? null; setCoverArt(file); updateUploadCard("cover_art", file); }} className="mt-3 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80" />
                      <UploadAssetCard icon={<ImageIcon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />} title="Cover Art" status={coverArt ? "Selected in this browser session" : beatDraft?.cover_art_obj ? "Saved to draft" : uploadCardState?.cover_art ? "Remembered for this tab" : ""} fileName={coverArt?.name ?? uploadCardState?.cover_art ?? fileNameFromUrl(beatDraft?.cover_art_obj)} href={resolveMediaUrl(beatDraft?.cover_art_obj)} />
                    </label>
                    <label className="rounded-xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-5">
                      <p className="text-sm text-white/80">Upload untagged WAV file (.wav)</p>
                      <input type="file" accept=".wav,audio/wav" onChange={(e) => { const file = e.target.files?.[0] ?? null; setWavFile(file); updateUploadCard("wav", file); }} className="mt-3 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80" />
                      <UploadAssetCard icon={<FileAudio className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />} title="WAV File" status={wavFile ? "Selected in this browser session" : beatDraft?.audio_file_obj ? "Saved to draft" : uploadCardState?.wav ? "Remembered for this tab" : ""} fileName={wavFile?.name ?? uploadCardState?.wav ?? fileNameFromUrl(beatDraft?.audio_file_obj)} href={resolveMediaUrl(beatDraft?.audio_file_obj)} />
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
                          form.append("media", buildBeatDraftMedia());
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
'''
text = text.replace(old_media, new_media)

text = text.replace(
'                          form.append("declaration_accepted", declarationAccepted ? "true" : "false");\n                          await patchBeatDraft(form, true);\n                          setMessage("License details saved as draft.");',
'                          form.append("declaration_accepted", declarationAccepted ? "true" : "false");\n                          form.append("media", buildBeatDraftMedia());\n                          await patchBeatDraft(form, true);\n                          setMessage("License details saved as draft.");'
)
text = text.replace(
'                          form.append("declaration_accepted", declarationAccepted ? "true" : "false");\n                          await patchBeatDraft(form, true);\n                          const draft = await ensureBeatDraft();',
'                          form.append("declaration_accepted", declarationAccepted ? "true" : "false");\n                          form.append("media", buildBeatDraftMedia());\n                          await patchBeatDraft(form, true);\n                          const draft = await ensureBeatDraft();'
)
text = text.replace(
'                          setPublishedBeat(beat);\n                          setMessage(`Beat published: ${beat.title}`);',
'                          clearBeatWizardSession();\n                          setUploadCardState({});\n                          setPublishedBeat(beat);\n                          setMessage(`Beat published: ${beat.title}`);'
)
text = text.replace(
'''      {publishedBeat ? (
''',
'''      {leaveModalOpen ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[520px] rounded-[28px] border border-white/10 bg-[#202126] p-8 text-center shadow-2xl shadow-black/40">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/8 text-white/85">
              <AlertTriangle className="h-8 w-8" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <h3 className="mt-6 text-2xl font-semibold">Leave this upload?</h3>
            <p className="mt-3 text-sm text-white/62">Unsaved local selections may be lost. Saved draft files and metadata will still stay on the draft.</p>
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
''')

path.write_text(text, encoding='utf-8')
