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
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-lg font-black">{title}</h2>
      </div>

      <div className="overflow-x-auto">
        <div className="flex w-max gap-3 pb-2">
          {items.map((v) => (
            <Link
              key={v.videoId}
              href={`/watch/${v.videoId}`}
              className="group w-[220px] overflow-hidden rounded-[18px] border border-line bg-card hover:bg-white/5 md:w-[260px]"
            >
              <div className="relative aspect-video">
                <Image
                  src={v.thumb}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  sizes="260px"
                />
              </div>
              <div className="p-2.5">
                <div className="line-clamp-2 text-sm font-extrabold">{v.title}</div>
                <div className="mt-1 text-xs text-muted">{v.channelTitle}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
