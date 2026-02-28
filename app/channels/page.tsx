import { CHANNEL_IDS } from "../../lib/channels";
import { fetchChannelUploads, type YtItem } from "../../lib/youtube";
import { VideoGrid } from "../../components/VideoGrid";

export const dynamic = "force-dynamic";

export default async function Channels() {
  const apiKey = (process.env.YOUTUBE_API_KEY ?? "").trim();
  const hasKey = apiKey.startsWith("AIza");

  const channel = CHANNEL_IDS?.[0] ?? "@InclusiveQuest";
  const uploads: YtItem[] = await fetchChannelUploads(channel, 36);

  return (
    <div className="pt-6">
      <section className="relative overflow-hidden rounded-[26px] border border-white/10 bg-white/5 p-4 md:p-6">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brandRed/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brandBlue/15 blur-3xl" />

        <div className="relative flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black">InclusiveQuest Channel</h1>
            <p className="mt-1 text-sm text-white/70">
              Latest uploads from <span className="text-white/90">{channel}</span>
            </p>
          </div>

          <div className="text-xs text-white/60">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2">
              {hasKey ? "API enabled" : "API missing (RSS fallback)"}
            </span>
          </div>
        </div>
      </section>

      <div className="mt-6">
        {uploads.length ? (
          <VideoGrid items={uploads} />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
            No videos returned yet. Check:
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              <li><code className="text-white/90">lib/channels.ts</code> has <code className="text-white/90">@InclusiveQuest</code></li>
              <li>Vercel env var <code className="text-white/90">YOUTUBE_API_KEY</code> is set (optional)</li>
              <li>Redeploy after updating env vars</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
