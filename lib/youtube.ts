export type YtItem = {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  thumb: string;
};

function looksLikeApiKey(key?: string) {
  // Most YouTube Data API keys start with "AIza"
  return !!key && key.startsWith("AIza") && key.length > 30;
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function resolveChannelIdFromHandleHtml(handle: string): Promise<string | null> {
  // Fallback for when the API key is missing/invalid or forHandle doesn't return anything.
  // We fetch the handle page and extract the browseId (UC...).
  const url = `https://www.youtube.com/@${encodeURIComponent(handle)}`;
  const res = await fetch(url, {
    // Add a UA to reduce the chance of being served an interstitial.
    headers: { "user-agent": "Mozilla/5.0 (compatible; InclusiveQuestBot/1.0)" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;

  const html = await res.text();

  // Common patterns:
  // "browseId":"UC...."
  // "channelId":"UC...."
  const m =
    html.match(/"browseId":"(UC[^"]+)"/) ||
    html.match(/"channelId":"(UC[^"]+)"/) ||
    html.match(/"externalId":"(UC[^"]+)"/);

  return m?.[1] ?? null;
}

async function resolveChannelId(input: string, apiKey?: string): Promise<string | null> {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;

  // If it's already a UC... channel ID, use it.
  if (/^UC[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;

  // Otherwise treat it as a handle (supports "@Handle" or "Handle")
  const handle = trimmed.replace(/^@/, "");

  // 1) Try official API resolution (best)
  if (looksLikeApiKey(apiKey)) {
    const url = new URL("https://www.googleapis.com/youtube/v3/channels");
    url.searchParams.set("part", "id");
    url.searchParams.set("forHandle", handle);
    url.searchParams.set("key", apiKey!);

    const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
    if (res.ok) {
      const data = await res.json();
      const channelId = data?.items?.[0]?.id;
      if (typeof channelId === "string" && channelId.startsWith("UC")) return channelId;
    } else {
      // Log for debugging (visible in Vercel logs)
      console.error("YouTube API (forHandle) error:", res.status, await safeText(res));
    }
  }

  // 2) Fallback: scrape the YouTube handle page to find UC channel ID
  const channelId = await resolveChannelIdFromHandleHtml(handle);
  if (channelId) return channelId;

  return null;
}

async function fetchUploadsViaRss(channelId: string, maxResults: number): Promise<YtItem[]> {
  // RSS feed usually returns a limited number of recent items, but it works without an API key.
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  const res = await fetch(feedUrl, { next: { revalidate: 900 } });
  if (!res.ok) {
    console.error("YouTube RSS error:", res.status, await safeText(res));
    return [];
  }

  const xml = await res.text();

  // Very small XML parser using regex (good enough for YouTube feed structure)
  const entries = xml.split("<entry>").slice(1);

  const items: YtItem[] = [];
  for (const e of entries) {
    const videoId = (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1] || "";
    const title = (e.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "Untitled";
    const publishedAt = (e.match(/<published>([^<]+)<\/published>/) || [])[1] || "";
    const channelTitle = (e.match(/<name>([\s\S]*?)<\/name>/) || [])[1] || "";
    const thumb = (e.match(/<media:thumbnail[^>]*url="([^"]+)"/) || [])[1] || "";

    if (videoId) {
      items.push({
        videoId,
        title: decodeXml(title),
        channelTitle: decodeXml(channelTitle),
        publishedAt,
        thumb,
      });
    }
    if (items.length >= maxResults) break;
  }

  return items;
}

function decodeXml(s: string) {
  return (s ?? "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

export async function fetchChannelUploads(
  channelIdOrHandle: string,
  maxResults = 18
): Promise<YtItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  const channelId = await resolveChannelId(channelIdOrHandle, apiKey);
  if (!channelId) return [];

  // Prefer API for deeper pagination + stable JSON
  if (looksLikeApiKey(apiKey)) {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("channelId", channelId);
    url.searchParams.set("maxResults", String(Math.min(maxResults, 50)));
    url.searchParams.set("order", "date");
    url.searchParams.set("type", "video");
    url.searchParams.set("key", apiKey!);

    const res = await fetch(url.toString(), { next: { revalidate: 900 } });
    if (!res.ok) {
      console.error("YouTube API (search) error:", res.status, await safeText(res));
      // fallback to RSS
      return fetchUploadsViaRss(channelId, maxResults);
    }

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

    return items.slice(0, maxResults);
  }

  // No valid API key: use RSS as a reliable fallback
  return fetchUploadsViaRss(channelId, maxResults);
}

export async function fetchVideoMeta(
  videoId: string
): Promise<{ title: string; description: string; channelTitle: string }> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (looksLikeApiKey(apiKey)) {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("id", videoId);
    url.searchParams.set("key", apiKey!);

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.error("YouTube API (videos) error:", res.status, await safeText(res));
      return { title: "Video", description: "", channelTitle: "" };
    }

    const data = await res.json();
    const item = (data.items ?? [])[0];
    if (!item) return { title: "Video", description: "", channelTitle: "" };

    return {
      title: item?.snippet?.title ?? "Video",
      description: item?.snippet?.description ?? "",
      channelTitle: item?.snippet?.channelTitle ?? "",
    };
  }

  // Without an API key, we keep meta minimal to avoid scraping individual pages.
  return { title: "Video", description: "", channelTitle: "" };
}
