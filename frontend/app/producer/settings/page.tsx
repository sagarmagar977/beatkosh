const setupItems = [
  { label: "Account", progress: "20%" },
  { label: "Payout Bank Details", progress: "0%" },
  { label: "Studio Setup", progress: "20%" },
  { label: "Studio Controls", progress: "--" },
  { label: "Manage Subscription", progress: "Free plan" },
];

export default function ProducerSettingsPage() {
  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="surface-panel rounded-xl p-4">
        <h1 className="text-lg font-semibold">Seller Setup</h1>
        <div className="mt-3 space-y-2">
          {setupItems.map((item, index) => (
            <div key={item.label} className={`rounded-md border px-3 py-3 ${index === 0 ? "border-[#8b28ff]/70 bg-[#8b28ff]/20" : "border-white/10 bg-[#121522]"}`}>
              <p className="text-sm">{item.label}</p>
              <p className="text-xs text-white/55">{item.progress}</p>
            </div>
          ))}
        </div>
      </aside>

      <section className="surface-panel rounded-xl p-4">
        <h2 className="text-xl font-semibold">Account</h2>
        <div className="mt-3 rounded-md border border-yellow-400/25 bg-yellow-400/10 p-3 text-sm text-yellow-200">
          Add Account and Bank Details. You can upload drafts, but publishing requires full setup.
        </div>

        <form className="mt-4 grid gap-3 md:grid-cols-2">
          <input className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80" placeholder="Mobile No." />
          <button type="button" className="rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80">
            Verify
          </button>
          <input className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80" placeholder="First name" />
          <input className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80" placeholder="Last name" />
          <input className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 md:col-span-2" placeholder="Email" />
          <input className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80" placeholder="Studio name" />
          <input className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80" placeholder="Studio handle" />
          <input className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 md:col-span-2" placeholder="Billing address" />
          <button type="button" className="brand-btn mt-2 px-4 py-2.5 text-sm md:col-span-2">
            Submit
          </button>
        </form>
      </section>
    </div>
  );
}
