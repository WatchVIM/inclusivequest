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
  const apiKey = (process.env.YOUTUBE_API_KEY ?? "").trim();
  const hasKey = apiKey.startsWith("AIza");

  const channel = CHANNEL_IDS?.[0];
  const uploads: YtItem[] = channel ? await fetchChannelUploads(channel, 55) : [];

  const hero = uploads?.[0];
  const rest = uploads?.slice(1) ?? [];
  const rows = chunk(rest, 14).slice(0, 3);

  return (
    <div className="pt-6">
      {/* HERO */}
      <section className="rounded-[22px] border border-line bg-card p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-tight">InclusiveQuest</h1>
            <p className="mt-2 max-w-2xl text-muted">
              A sleek YouTube-powered channel hub for the Deaf community — featuring a stationary ASL avatar panel on the left during playback.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/channels"
                className="rounded-xl bg-white px-4 py-2 text-sm font-black text-black hover:opacity-90"
              >
                Browse Videos
              </Link>

              {hero?.videoId ? (
                <Link
                  href={`/watch/${hero.videoId}`}
                  className="rounded-xl border border-line bg-white/5 px-4 py-2 text-sm font-black hover:bg-white/10"
                >
                  Watch Latest
                </Link>
              ) : null}
            </div>
          </div>

          <div className="text-xs text-muted md:text-right">
            {hasKey ? (
              <span className="inline-flex items-center rounded-full border border-line bg-white/5 px-3 py-2">
                YouTube API enabled
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-line bg-white/5 px-3 py-2">
                Add <code className="mx-1 text-white/80">YOUTUBE_API_KEY</code> in Vercel (optional — RSS fallback works)
              </span>
            )}
            <div className="mt-2 text-xs text-muted">
              Source: <span className="text-white/80">{String(channel ?? "@InclusiveQuest")}</span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          {hero?.videoId ? (
            <>
              <HeroPlayer videoId={hero.videoId} />
              <div className="mt-3 flex flex-col gap-1">
                <div className="line-clamp-2 text-sm font-extrabold">{hero.title}</div>
                <div className="text-xs text-muted">{hero.channelTitle}</div>
              </div>
            </>
          ) : (
            <div className="rounded-[22px] border border-line bg-black/30 p-6 text-muted">
              No videos were returned.
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                <li>Confirm <code className="text-white/80">lib/channels.ts</code> contains <code className="text-white/80">@InclusiveQuest</code> (or your UC channel id).</li>
                <li>If you set <code className="text-white/80">YOUTUBE_API_KEY</code> in Vercel, redeploy after saving env vars.</li>
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* 3 ROWS UNDER HERO */}
      <div className="mx-auto max-w-7xl">
        {rows[0]?.length ? <VideoRow title="More videos" items={rows[0]} /> : null}
        {rows[1]?.length ? <VideoRow title="More videos" items={rows[1]} /> : null}
        {rows[2]?.length ? <VideoRow title="More videos" items={rows[2]} /> : null}
      </div>

      {/* Sleek footer callout */}
      <section className="mt-10 rounded-[22px] border border-line bg-card p-6">
        <h2 className="text-xl font-black">ASL Avatar Panel</h2>
        <p className="mt-2 text-sm text-muted">
          On each watch page, an ASL avatar track can play in a stationary left-side panel (desktop), synced to the YouTube video time.
          Add ASL tracks by mapping <code className="text-white/80">videoId → MP4 URL</code> in <code className="text-white/80">lib/asl-map.ts</code>.
        </p>
      </section>
    </div>
  );
}
