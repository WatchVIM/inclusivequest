import Image from "next/image";
import Link from "next/link";
import type { YtItem } from "../lib/youtube";

export function VideoGrid({ items }: { items: YtItem[] }) {
  return (
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
          </div>

          <div className="p-4">
            <div className="line-clamp-2 text-sm font-extrabold">{v.title}</div>
            <div className="mt-1 text-xs text-white/60">{v.channelTitle}</div>
            <div className="mt-3 flex items-center gap-2 text-xs font-black text-white/70">
              <span className="h-2 w-2 rounded-full bg-brandRed" />
              Watch page supports ASL panel
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
