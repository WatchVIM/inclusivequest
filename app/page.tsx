import Link from "next/link";

export default function Home(){
  return (
    <div className="pt-6">
      <section className="rounded-[22px] border border-line bg-card p-6">
        <h1 className="text-3xl font-black tracking-tight">InclusiveQuest</h1>
        <p className="mt-2 max-w-2xl text-muted">
          A sleek YouTube-powered experience for Deaf viewers with an ASL avatar panel displayed in a stationary left box (desktop).
        </p>
        <div className="mt-5 flex gap-2">
          <Link href="/channels" className="rounded-xl bg-white px-4 py-2 text-sm font-black text-black hover:opacity-90">
            Browse Channels
          </Link>
          <Link href="/store" className="rounded-xl border border-line bg-white/5 px-4 py-2 text-sm font-black hover:bg-white/10">
            Store
          </Link>
        </div>
      </section>

      <section className="mt-8 rounded-[22px] border border-line bg-card p-6">
        <h2 className="text-xl font-black">ASL Implementation</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
          <li>YouTube videos are embedded via the official IFrame Player.</li>
          <li>ASL is a separate avatar video in the left panel (hosted by you).</li>
          <li>The ASL track syncs to YouTube time and play/pause state.</li>
        </ul>
      </section>
    </div>
  );
}
