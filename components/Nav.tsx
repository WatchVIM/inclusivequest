import Link from "next/link";

export function Nav() {
  return (
    <header className="sticky top-0 z-40">
      <div className="iq-glass border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brandRed/90 text-sm font-black">
                IQ
              </span>
              <span className="text-lg font-black tracking-tight">InclusiveQuest</span>
            </Link>

            <nav className="hidden items-center gap-1 text-sm md:flex">
              <Link href="/channels" className="rounded-xl px-3 py-2 text-white/80 hover:bg-white/5 hover:text-white">
                Channels
              </Link>
              <Link href="/store" className="rounded-xl px-3 py-2 text-white/80 hover:bg-white/5 hover:text-white">
                Store
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-xs font-bold text-white/50">Search</span>
                <span className="text-xs text-white/30">(coming soon)</span>
              </div>
            </div>
            <Link
              href="/channels"
              className="rounded-xl bg-brandRed px-4 py-2 text-sm font-black text-white hover:bg-brandRed/90"
            >
              Watch
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 pb-2 md:hidden">
        <Link href="/channels" className="iq-chip">Channels</Link>
        <Link href="/store" className="iq-chip">Store</Link>
      </div>
    </header>
  );
}
