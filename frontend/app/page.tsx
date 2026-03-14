const topChips = ["For You", "Liked", "Your Downloads", "Recently Played", "All Beats", "Trending", "Followed By You", "Follower Drops"];

const cards = [
  { title: "MENTALITY", artist: "Zack Beats", price: "Rs 1,275" },
  { title: "2K26", artist: "Ritzraj Music", price: "Rs 1,700" },
  { title: "DUBA", artist: "Kai SZN", price: "Rs 999" },
  { title: "RNB BEAT", artist: "Abhay Kumar", price: "Rs 750" },
];

const latestRows = [
  { name: "MENTALITY", producer: "NATPRODUCTION", bpm: 136, key: "F Minor", price: "Rs 999" },
  { name: "2K26", producer: "Ritzraj Music", bpm: 97, key: "Ab Minor", price: "Rs 999" },
  { name: "DUBA", producer: "Kai SZN", bpm: 98, key: "C Minor", price: "Rs 777" },
  { name: "AAWARA", producer: "ShravanBeats", bpm: 97, key: "E Minor", price: "Rs 1,700" },
  { name: "AVATAR", producer: "Pal Beats", bpm: 94, key: "C Minor", price: "Rs 599" },
];

function CardGrid({ title }: { title: string }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button type="button" className="text-xs text-white/55">
          View all
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={`${title}-${card.title}`} className="app-card p-3">
            <div className="h-24 rounded-md bg-gradient-to-br from-[#2f1a44] to-[#21131f]" />
            <p className="mt-3 font-semibold">{card.title}</p>
            <p className="text-xs text-white/55">{card.artist}</p>
            <button type="button" className="brand-btn mt-3 w-full px-3 py-2 text-sm">
              {card.price}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-xl p-4">
        <p className="text-sm text-white/65">Welcome, sagar thapa</p>
        <h1 className="mt-1 text-2xl font-semibold">Your listening dashboard</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {topChips.map((chip, idx) => (
            <button key={chip} type="button" className={`chip ${idx === 0 ? "active" : ""}`}>
              {chip}
            </button>
          ))}
        </div>
      </section>

      <CardGrid title="Super Beats" />
      <CardGrid title="New Finds" />
      <CardGrid title="Curated Playlists" />

      <section className="surface-panel rounded-xl p-4">
        <h2 className="text-lg font-semibold">Latest Beats</h2>
        <div className="mt-3 space-y-2">
          {latestRows.map((row) => (
            <div key={row.name} className="grid grid-cols-[1.2fr_auto] items-center gap-3 rounded-md border border-white/10 bg-[#121522] px-3 py-2">
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="text-xs text-white/55">
                  {row.producer} • {row.bpm} BPM • {row.key}
                </p>
              </div>
              <button type="button" className="brand-btn px-3 py-2 text-xs">
                {row.price}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
