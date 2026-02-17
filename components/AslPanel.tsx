"use client";

import { useEffect, useRef, useState } from "react";

export function AslPanel({
  url,
  masterTime,
  masterPlaying,
}:{
  url?: string;
  masterTime: number;
  masterPlaying: boolean;
}){
  const ref = useRef<HTMLVideoElement | null>(null);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const v = ref.current;
    if (!v || !enabled) return;

    const drift = Math.abs((v.currentTime ?? 0) - masterTime);
    if (drift > 0.35) v.currentTime = masterTime;

    if (masterPlaying && v.paused) v.play().catch(()=>{});
    if (!masterPlaying && !v.paused) v.pause();
  }, [masterTime, masterPlaying, enabled]);

  return (
    <div className="w-full lg:w-[420px] flex-shrink-0">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-extrabold">ASL Avatar</div>
        <button
          onClick={() => setEnabled(v => !v)}
          className="rounded-xl border border-line bg-white/5 px-3 py-2 text-xs font-bold hover:bg-white/10"
        >
          {enabled ? "Turn Off" : "Turn On"}
        </button>
      </div>

      {url ? (
        <div className="overflow-hidden rounded-[18px] border border-line bg-black/40">
          <video ref={ref} src={url} playsInline muted controls className="h-auto w-full" />
        </div>
      ) : (
        <div className="rounded-[18px] border border-line bg-card p-4 text-muted">
          ASL avatar track not available for this video yet.
        </div>
      )}
    </div>
  );
}
