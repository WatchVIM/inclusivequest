import Link from "next/link";

export function Nav(){
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-black/30 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-black tracking-tight">InclusiveQuest</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/channels" className="rounded-xl px-3 py-2 hover:bg-white/5">Channels</Link>
          <Link href="/store" className="rounded-xl px-3 py-2 hover:bg-white/5">Store</Link>
        </nav>
      </div>
    </header>
  );
}
