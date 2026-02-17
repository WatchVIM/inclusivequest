import { ASL_MAP } from "../../../lib/asl-map";
import { fetchVideoMeta } from "../../../lib/youtube";
import { WatchClient } from "../../../components/WatchClient";

export default async function WatchPage({
  params,
}:{
  params: Promise<{ id: string }>;
}){
  const { id: videoId } = await params;

  const meta = await fetchVideoMeta(videoId);
  const aslUrl = ASL_MAP[videoId]?.aslUrl;

  return (
    <WatchClient
      videoId={videoId}
      title={meta.title}
      description={meta.description}
      channelTitle={meta.channelTitle}
      aslUrl={aslUrl}
    />
  );
}
