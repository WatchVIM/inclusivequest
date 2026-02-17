import Image from "next/image";
import Link from "next/link";
import type { YtItem } from "../lib/youtube";

export function VideoGrid({ items }: { items: YtItem[] }){
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
      {items.map((v) => (
        <Link key={v.videoId} href={`/watch/${v.videoId}`} className="group overflow-hidden rounded-[18px] border border-line bg-card hover:bg-white/5">
          <div className="relative aspect-video">
            <Image
              src={v.thumb}
              alt=""
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              sizes="(max-width: 1024px) 50vw, 16vw"
            />
          </div>
          <div className="p-2.5">
            <div className="line-clamp-2 text-sm font-extrabold">{v.title}</div>
            <div className="mt-1 text-xs text-muted">{v.channelTitle}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
