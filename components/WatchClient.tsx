"use client";

import { useState } from "react";
import { YoutubePlayer } from "@/components/YoutubePlayer";
import { AslPanel } from "@/components/AslPanel";

export function WatchClient({
  videoId,
  title,
  description,
  channelTitle,
  aslUrl
}:{
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  aslUrl?: string;
}){
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="pt-6">
      <div className="mb-4">
        <h1 className="text-2xl font-black">{title}</h1>
        <div className="mt-1 text-sm text-muted">{channelTitle}</div>
        {description ? <p className="mt-3 line-clamp-4 text-sm text-muted">{description}</p> : null}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <AslPanel url={aslUrl} masterTime={t} masterPlaying={playing} />

        <div className="w-full flex-1">
          <YoutubePlayer
            videoId={videoId}
            onTime={setT}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          <div className="mt-3 rounded-[18px] border border-line bg-card p-4 text-xs text-muted">
            To enable ASL for this video, map <code className="text-white/80">{videoId}</code> to an ASL MP4 URL in <code className="text-white/80">lib/asl-map.ts</code>.
          </div>
        </div>
      </div>
    </div>
  );
}
