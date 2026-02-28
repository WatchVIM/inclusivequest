"use client";

export function HeroPlayer({ videoId }: { videoId: string }) {
  // Autoplay policies require muted video for most browsers.
  // YouTube may still block autoplay in some cases; controls remain available.
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&controls=1&rel=0&modestbranding=1`;

  return (
    <div className="relative">
      <div className="absolute -inset-1 rounded-[26px] bg-gradient-to-r from-brandRed/40 via-brandBlue/30 to-emerald-500/20 blur-xl" />
      <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-black/40 shadow-2xl">
        <div className="relative aspect-video w-full">
          <iframe
            className="absolute inset-0 h-full w-full"
            src={src}
            title="Featured video"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
