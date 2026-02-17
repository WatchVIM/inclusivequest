"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void; }
}

type Props = {
  videoId: string;
  onTime?: (t: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
};

export function YoutubePlayer({ videoId, onTime, onPlay, onPause }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const stopPoll = () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };

    const startPoll = () => {
      stopPoll();
      pollRef.current = window.setInterval(() => {
        try {
          const p = playerRef.current;
          if (!p || typeof p.getCurrentTime !== "function") return;
          const t = p.getCurrentTime();
          if (typeof t === "number") onTime?.(t);
        } catch {}
      }, 250);
    };

    const createPlayer = () => {
      if (cancelled) return;
      if (!hostRef.current || !window.YT?.Player) return;

      hostRef.current.innerHTML = "";

      playerRef.current = new window.YT.Player(hostRef.current, {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            try {
              const t = playerRef.current?.getCurrentTime?.();
              if (typeof t === "number") onTime?.(t);
            } catch {}
          },
          onStateChange: (e: any) => {
            if (e?.data === 1) { onPlay?.(); startPoll(); } // playing
            if (e?.data === 2 || e?.data === 0) { onPause?.(); stopPoll(); } // paused/ended
          }
        }
      });
    };

    const loadApi = () => {
      if (window.YT?.Player) { createPlayer(); return; }

      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existing) {
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        s.async = true;
        document.body.appendChild(s);
      }

      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); createPlayer(); };

      // Fallback
      const start = Date.now();
      const timer = window.setInterval(() => {
        if (window.YT?.Player) { window.clearInterval(timer); createPlayer(); }
        if (Date.now() - start > 5000) window.clearInterval(timer);
      }, 100);
    };

    loadApi();

    return () => {
      cancelled = true;
      stopPoll();
      try { playerRef.current?.destroy?.(); } catch {}
      playerRef.current = null;
    };
  }, [videoId, onTime, onPlay, onPause]);

  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-black/40">
      <div ref={hostRef} className="aspect-video w-full" />
    </div>
  );
}
