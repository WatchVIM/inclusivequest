import { useEffect } from 'react';

export function useSyncedSidecar(mainRef, sidecarRef, enabled = true) {
  useEffect(() => {
    const main = mainRef.current;
    const sidecar = sidecarRef.current;

    if (!main || !sidecar) return undefined;

    const sync = () => {
      if (!enabled) return;
      if (!Number.isFinite(main.currentTime) || !Number.isFinite(sidecar.currentTime)) return;

      if (Math.abs(main.currentTime - sidecar.currentTime) > 0.35) {
        sidecar.currentTime = main.currentTime;
      }

      sidecar.playbackRate = main.playbackRate || 1;
    };

    const onPlay = async () => {
      if (!enabled) return;
      sync();
      try {
        await sidecar.play();
      } catch (error) {
        // Browser autoplay rules may require direct user interaction first.
      }
    };

    const onPause = () => sidecar.pause();
    const onWaiting = () => sidecar.pause();
    const onPlaying = () => {
      if (enabled && !main.paused) sidecar.play().catch(() => {});
    };

    main.addEventListener('play', onPlay);
    main.addEventListener('pause', onPause);
    main.addEventListener('seeked', sync);
    main.addEventListener('ratechange', sync);
    main.addEventListener('waiting', onWaiting);
    main.addEventListener('playing', onPlaying);

    const interval = window.setInterval(sync, 1000);

    return () => {
      main.removeEventListener('play', onPlay);
      main.removeEventListener('pause', onPause);
      main.removeEventListener('seeked', sync);
      main.removeEventListener('ratechange', sync);
      main.removeEventListener('waiting', onWaiting);
      main.removeEventListener('playing', onPlaying);
      window.clearInterval(interval);
    };
  }, [mainRef, sidecarRef, enabled]);
}
