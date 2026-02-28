import { CHANNEL_IDS } from "../../lib/channels";
import { fetchChannelUploads, type YtItem } from "../../lib/youtube";
import { VideoGrid } from "../../components/VideoGrid";

export const dynamic = "force-dynamic";

export default async function Channels() {
  const apiKey = (process.env.YOUTUBE_API_KEY ?? "").trim();
  const hasKey = apiKey.startsWith("AIza");

  const channel = CHANNEL_IDS?.[0];
  const uploads: YtItem[] = channel ? await fetchChannelUploads(channel, 36) : [];

  return (
    <div className="pt-6">
      <section className="rounded-[22px] border border-line bg-card p-4 md:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black">Channel Videos</h1>
            <p className="mt-1 text-sm text-muted">
              Latest uploads from <span className="text-white/80">{String(channel ?? "@InclusiveQuest")}</span>
            </p>
          </div>

          <div className="text-xs text-muted">
            {hasKey ? (
              <span className="inline-flex items-center rounded-full border border-line bg-white/5 px-3 py-2">
                API enabled
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-line bg-white/5 px-3 py-2">
                API missing (RSS fallback)
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="mt-6">
        {uploads.length ? (
          <VideoGrid items={uploads} />
        ) : (
          <div className="rounded-[22px] border border-line bg-card p-6 text-muted">
            No videos returned yet. If this persists:
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              <li>Verify the handle in <code className="text-white/80">lib/channels.ts</code> is correct.</li>
              <li>If you set <code className="text-white/80">YOUTUBE_API_KEY</code> in Vercel, redeploy after saving.</li>
              <li>Check Vercel runtime logs for YouTube API / RSS errors.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
