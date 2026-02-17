import { CHANNEL_IDS } from "@/lib/channels";
import { fetchChannelUploads, type YtItem } from "@/lib/youtube";
import { VideoGrid } from "@/components/VideoGrid";

export const dynamic = "force-dynamic";

export default async function Channels(){
  const lists = await Promise.all(CHANNEL_IDS.map((id) => fetchChannelUploads(id, 18)));
  const all: YtItem[] = lists.flat();

  all.sort((a,b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));

  return (
    <div className="pt-6">
      <h1 className="text-2xl font-black">Channels</h1>
      <p className="mt-2 text-muted">
        Latest uploads from your curated channel list.
        {!process.env.YOUTUBE_API_KEY ? " (Add YOUTUBE_API_KEY in Vercel Env Vars to load videos.)" : ""}
      </p>

      <div className="mt-6">
        <VideoGrid items={all.slice(0, 36)} />
      </div>
    </div>
  );
}
