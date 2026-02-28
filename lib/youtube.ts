export type YtItem = {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  thumb: string;
};

async function resolveChannelId(input: string, apiKey: string): Promise<string | null> {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;

  // If it's already a UC... channel ID, use it.
  if (/^UC[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;

  // Otherwise treat it as a handle (supports "@Handle" or "Handle")
  const handle = trimmed.replace(/^@/, "");

  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "id");
  url.searchParams.set("forHandle", handle);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) return null;

  const data = await res.json();
  const channelId = data?.items?.[0]?.id;
  return typeof channelId === "string" ? channelId : null;
}

export async function fetchChannelUploads(
  channelIdOrHandle: string,
  maxResults = 18
): Promise<YtItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const channelId = await resolveChannelId(channelIdOrHandle, apiKey);
  if (!channelId) return [];

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("order", "date");
  url.searchParams.set("type", "video");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 900 } });
  if (!res.ok) return [];

  const data = await res.json();
  const items: YtItem[] = (data.items ?? [])
    .map((it: any) => ({
      videoId: it?.id?.videoId ?? "",
      title: it?.snippet?.title ?? "Untitled",
      channelTitle: it?.snippet?.channelTitle ?? "",
      publishedAt: it?.snippet?.publishedAt ?? "",
      thumb:
        it?.snippet?.thumbnails?.medium?.url ??
        it?.snippet?.thumbnails?.default?.url ??
        "",
    }))
    .filter((x: YtItem) => x.videoId);

  return items;
}

export async function fetchVideoMeta(
  videoId: string
): Promise<{ title: string; description: string; channelTitle: string }> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { title: "Video", description: "", channelTitle: "" };

  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("id", videoId);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return { title: "Video", description: "", channelTitle: "" };

  const data = await res.json();
  const item = (data.items ?? [])[0];
  if (!item) return { title: "Video", description: "", channelTitle: "" };

  return {
    title: item?.snippet?.title ?? "Video",
    description: item?.snippet?.description ?? "",
    channelTitle: item?.snippet?.channelTitle ?? "",
  };
}
