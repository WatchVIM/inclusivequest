import Link from "next/link";
import { CHANNEL_IDS } from "../lib/channels";
import { fetchChannelUploads, type YtItem } from "../lib/youtube";
import { HeroPlayer } from "../components/HeroPlayer";
import { VideoRow } from "../components/VideoRow";

export const dynamic = "force-dynamic";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default async function Home() {
  const channelId = CHANNEL_IDS?.[0];
  const uploads: YtItem[] = channelId ? await fetchChannelUploads(channelId, 55) : [];

  const hero = uploads?.[0];
  const rest = uploads?.slice(1) ?? [];
  const rows = chunk(rest, 14).slice(0, 3);

  return (
    <div className="pt-6">
      {/* HERO */}
      <section className="rounded-[22px] border border-line bg-card p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">InclusiveQuest</h1>
            <p className="mt-2 max-w-2xl text-muted">
              A sleek YouTube-powered experience for Deaf viewers — with a stationary ASL avatar panel on the left during playback.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/channels"
                className="rounded-xl bg-white px-4 py-2 text-sm font-black text-black hover:opacity-90"
              >
                Browse Channel Feed
              </Link>
              {hero?.videoId ? (
                <Link
                  href={`/watch/${hero.videoId}`}
                  className="rounded-xl border border-line bg-white/5 px-4 py-2 text-sm font-black hover:bg-white/10"
                >
                  Watch Featured With ASL
                </Link>
              ) : null}
            </div>
          </div>

          <div className="text-xs text-muted md:text-right">
            {process.env.YOUTUBE_API_KEY ? (
              <span className="inline-flex items-center rounded-full border border-line bg-white/5 px-3 py-2">
                Live channel feed enabled
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-line bg-white/5 px-3 py-2">
                Add <code className="mx-1 text-white/80">YOUTUBE_API_KEY</code> in Vercel env vars
              </span>
            )}
          </div>
        </div>

        <div className="mt-5">
          {hero?.videoId ? (
            <>
              <HeroPlayer videoId={hero.videoId} />
              <div className="mt-3 flex flex-col gap-1">
                <div className="text-sm font-extrabold line-clamp-2">{hero.title}</div>
                <div className="text-xs text-muted">{hero.channelTitle}</div>
              </div>
            </>
          ) : (
            <div className="rounded-[22px] border border-line bg-black/30 p-6 text-muted">
              No featured video yet. Add a channel ID in <code className="text-white/80">lib/channels.ts</code> and set{" "}
              <code className="text-white/80">YOUTUBE_API_KEY</code> in Vercel.
            </div>
          )}
        </div>
      </section>

      {/* 3 ROWS UNDER HERO */}
      <div className="mx-auto max-w-7xl">
        {rows[0]?.length ? <VideoRow title="More videos" items={rows[0]} /> : null}
        {rows[1]?.length ? <VideoRow title="More videos (row 2)" items={rows[1]} /> : null}
        {rows[2]?.length ? <VideoRow title="More videos (row 3)" items={rows[2]} /> : null}
      </div>

      {/* OPTIONAL: small callout */}
      <section className="mt-10 rounded-[22px] border border-line bg-card p-6">
        <h2 className="text-xl font-black">Want ASL on every video?</h2>
        <p className="mt-2 text-sm text-muted">
          Add ASL avatar tracks per YouTube video ID in <code className="text-white/80">lib/asl-map.ts</code>. The watch page will
          sync the avatar panel to the YouTube playback time.
        </p>
      </section>
    </div>
  );
}
