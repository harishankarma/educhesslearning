import { useEffect, useRef, useState, useCallback } from "react";
import { getYouTubeId } from "@/lib/utils";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoaded = false;
let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (apiLoaded) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise<void>((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true;
      resolve();
    };
  });
  return apiLoadPromise;
}

export default function YouTubeIframe({
  url,
  startSeconds = 0,
  endSeconds = 0,
  onEnd,
  onTimeUpdate,
  className,
}: {
  url: string;
  startSeconds?: number;
  endSeconds?: number;
  onEnd?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onEndRef = useRef(onEnd);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const endRef = useRef(endSeconds);
  const [ready, setReady] = useState(false);

  // Keep refs current without triggering re-renders / effect re-runs
  onEndRef.current = onEnd;
  onTimeUpdateRef.current = onTimeUpdate;
  endRef.current = endSeconds;

  const handleEnd = useCallback(() => {
    onEndRef.current?.();
  }, []);

  // Create / destroy player when url changes
  useEffect(() => {
    const ytId = getYouTubeId(url);
    if (!ytId || !containerRef.current) return;

    let cancelled = false;

    loadYouTubeAPI().then(() => {
      if (cancelled || !containerRef.current) return;

      // Create a fresh div for the player to mount into
      const mountDiv = document.createElement("div");
      mountDiv.style.width = "100%";
      mountDiv.style.height = "100%";
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(mountDiv);

      playerRef.current = new window.YT.Player(mountDiv, {
        videoId: ytId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          start: startSeconds,
          end: endSeconds || undefined,
          enablejsapi: 1,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setReady(true);
            playerRef.current?.playVideo();
          },
          onStateChange: (e: any) => {
            if (cancelled) return;
            if (e.data === window.YT.PlayerState.ENDED) {
              handleEnd();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (playerRef.current && playerRef.current.destroy) {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
      }
    };
  }, [url]); // intentionally NOT depending on start/end/callbacks

  // Start time tracking only once when ready
  useEffect(() => {
    if (!ready) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!playerRef.current) return;
      const t = playerRef.current.getCurrentTime?.() ?? 0;
      onTimeUpdateRef.current?.(t);
      const end = endRef.current;
      if (end > 0 && t >= end) {
        playerRef.current.pauseVideo?.();
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        handleEnd();
      }
    }, 250);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [ready, handleEnd]);

  return <div ref={containerRef} className={className} />;
}
