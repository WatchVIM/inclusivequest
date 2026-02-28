import Link from "next/link";
import { CHANNEL_IDS } from "../lib/channels";
import { fetchChannelUploads, type YtItem } from "../lib/youtube";
import { HeroPlayer } from "../components/HeroPlayer";
import { VideoRow } from "../components/VideoRow";

export const dynamic = "force-dynamic";

export default async function Home() {
  const apiKey = (process.env.YOUTUBE_API_KEY ?? "").trim();
  const hasKey = apiKey.startsWith("AIza");

  const channel = CHANNEL_IDS?.[0] ?? "@InclusiveQuest";
  const uploads: YtItem[] = await fetchChannelUploads(channel, 40);

  const hero = uploads?.[0];
  // 18 items = 6 rows of 3 (requested: 3 per row)
  const more = uploads?.slice(1, 19) ?? [];

  return (
    <div className="pt-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[26px] border border-white/10 bg-white/5 p-4 md:p-6">
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="iq-chip">
                <span className="h-2 w-2 rounded-full bg-brandRed" />
                Deaf-first viewing
              </span>
              <span className="iq-chip">ASL Avatar Panel</span>
              <span className="iq-chip">YouTube Channel Hub</span>
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
              InclusiveQuest
            </h1>

            <p className="mt-2 max-w-2xl text-white/70">
              Netflix x Hulu-inspired layout, powered by the InclusiveQuest YouTube channel — built for the Deaf community with an optional ASL avatar panel on every watch page.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/channels"
                className="rounded-xl bg-brandRed px-4 py-2 text-sm font-black text-white hover:bg-brandRed/90"
              >
                Explore Videos
              </Link>

              {hero?.videoId ? (
                <Link
                  href={`/watch/${hero.videoId}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white hover:bg-white/10"
                >
                  Play Latest
                </Link>
              ) : null}
            </div>
          </div>

          <div className="text-xs text-white/60 md:text-right">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2">
              {hasKey ? "YouTube API enabled" : "API missing (RSS fallback)"}
            </div>
            <div className="mt-2">
              Source: <span className="text-white/80">{channel}</span>
            </div>
          </div>
        </div>

        <div className="relative mt-6">
          {hero?.videoId ? (
            <>
              <HeroPlayer videoId={hero.videoId} />
              <div className="mt-4">
                <div className="text-sm font-extrabold text-white line-clamp-2">{hero.title}</div>
                <div className="mt-1 text-xs text-white/60">{hero.channelTitle}</div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-white/70">
              No videos were returned. Verify the channel handle in <code className="text-white/90">lib/channels.ts</code> and redeploy.
            </div>
          )}
        </div>
      </section>

      {/* MORE VIDEOS: 3 per row */}
      <VideoRow title="More Videos" items={more} />

      <div className="mt-4">
        <Link href="/channels" className="text-sm font-black text-white/80 hover:text-white">
          View all videos →
        </Link>
      </div>

      {/* CTA */}
      <section className="mt-10 iq-card p-6">
        <h2 className="text-xl font-black">ASL-ready watch experience</h2>
        <p className="mt-2 text-sm text-white/70">
          The watch page supports a stationary ASL avatar panel on the left (desktop) / below (mobile). Add ASL tracks by mapping
          <code className="mx-1 text-white/90">videoId → MP4 URL</code> in <code className="text-white/90">lib/asl-map.ts</code>.
        </p>
      </section>
    </div>
  );
}
