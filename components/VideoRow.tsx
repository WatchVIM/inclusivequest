import Image from "next/image";
import Link from "next/link";
import type { YtItem } from "../lib/youtube";

export function VideoRow({
  title,
  items,
}: {
  title: string;
  items: YtItem[];
}) {
  if (!items?.length) return null;

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black tracking-tight">{title}</h2>
        <span className="text-xs font-bold text-white/50">3-up grid</span>
      </div>

      {/* 3 videos per row on desktop (Netflix/Hulu feel) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((v) => (
          <Link
            key={v.videoId}
            href={`/watch/${v.videoId}`}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10"
          >
            <div className="relative aspect-video">
              <Image
                src={v.thumb}
                alt=""
                fill
                className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                sizes="(max-width: 1024px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-90" />
              <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-black text-white">
                YouTube
              </div>
            </div>

            <div className="p-4">
              <div className="line-clamp-2 text-sm font-extrabold">{v.title}</div>
              <div className="mt-1 text-xs text-white/60">{v.channelTitle}</div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-white/80">
                <span className="h-2 w-2 rounded-full bg-brandRed" />
                Watch with ASL panel
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
