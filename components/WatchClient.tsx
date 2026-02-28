"use client";

import { useState } from "react";
import { YoutubePlayer } from "./YoutubePlayer";
import { AslPanel } from "./AslPanel";

export function WatchClient({
  videoId,
  title,
  description,
  channelTitle,
  aslUrl,
}: {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  aslUrl?: string;
}) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="pt-6">
      <section className="iq-card p-5 md:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">{title}</h1>
            <div className="mt-1 text-sm text-white/60">{channelTitle}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="iq-chip">ASL Panel Ready</span>
            <span className="iq-chip">YouTube</span>
          </div>
        </div>

        {description ? (
          <p className="mt-4 line-clamp-4 text-sm text-white/70">{description}</p>
        ) : null}

        <div className="mt-6 flex flex-col gap-4 lg:flex-row">
          {/* Left ASL panel */}
          <AslPanel url={aslUrl} masterTime={t} masterPlaying={playing} />

          {/* Main player */}
          <div className="w-full flex-1">
            <YoutubePlayer
              videoId={videoId}
              onTime={setT}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />

            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/65">
              To enable ASL for this video, map <code className="text-white/90">{videoId}</code> to an ASL MP4 URL in{" "}
              <code className="text-white/90">lib/asl-map.ts</code>.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
