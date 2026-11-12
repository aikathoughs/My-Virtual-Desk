import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "./data";
import type { CRTState, DVDState, View } from "./interaction";

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          host?: string;
          videoId?: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, string | number | undefined>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
            onError?: (event: { data: number; target: YTPlayerInstance }) => void;
          };
        },
      ) => YTPlayerInstance;
      PlayerState?: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  loadVideoById: (videoId: string) => void;
  cueVideoById: (videoId: string) => void;
  getPlayerState: () => number;
  getVideoData?: () => { video_id?: string; title?: string; author?: string };
  destroy: () => void;
}

let ytApiPromise: Promise<void> | null = null;

export function loadYouTubeIframeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.YT && typeof window.YT.Player === "function") {
    return Promise.resolve();
  }
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      ytApiPromise = null;
      reject(new Error("YOUTUBE_API_TIMEOUT"));
    }, 10000);

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeout);
      if (prevReady) prevReady();
      resolve();
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        ytApiPromise = null;
        reject(new Error("YOUTUBE_API_NETWORK_ERROR"));
      };
      document.head.appendChild(script);
    }
  });

  return ytApiPromise;
}

export type YouTubeCRTController = {
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  replay: () => void;
  stopAndClear: () => void;
};

type YouTubeCRTProps = {
  portalRef: React.RefObject<HTMLDivElement | null>;
  view: View;
  phase: DVDState;
  crtState: CRTState;
  project?: Project;
  onCRTStateChange: (next: CRTState) => void;
  onPlayerReadyAdvancePhase: () => void;
  onEject: () => void;
  onToggleZoom: () => void;
  controllerRef: React.MutableRefObject<YouTubeCRTController | null>;
};

export default function YouTubeCRT({
  portalRef,
  view,
  phase,
  crtState,
  project,
  onCRTStateChange,
  onPlayerReadyAdvancePhase,
  onEject,
  onToggleZoom,
  controllerRef,
}: YouTubeCRTProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const activeVideoIdRef = useRef<string | null>(null);
  const readyHandledRef = useRef(false);
  const titleCardTimerRef = useRef<number | null>(null);
  const crtStateRef = useRef<CRTState>(crtState);
  crtStateRef.current = crtState;
  const [showTitleCard, setShowTitleCard] = useState(false);
  const [apiReadyForIframe, setApiReadyForIframe] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);

  const sendIframeCommand = useCallback((func: string, args: unknown[] = []) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(JSON.stringify({ event: "command", func, args }), "*");
    } catch {
      // ignore cross-origin postMessage errors
    }
  }, []);

  const clearTitleCardTimer = useCallback(() => {
    if (titleCardTimerRef.current !== null) {
      window.clearTimeout(titleCardTimerRef.current);
      titleCardTimerRef.current = null;
    }
  }, []);

  const destroyPlayer = useCallback(() => {
    clearTitleCardTimer();
    setShowTitleCard(false);
    setApiReadyForIframe(false);
    readyHandledRef.current = false;
    activeVideoIdRef.current = null;
    sendIframeCommand("stopVideo");
    if (playerRef.current) {
      try {
        playerRef.current.stopVideo();
      } catch {
        // ignore if already stopped
      }
      try {
        playerRef.current.pauseVideo();
      } catch {
        // ignore if already paused
      }
      try {
        playerRef.current.destroy();
      } catch {
        // ignore if already destroyed
      }
      playerRef.current = null;
    }
  }, [clearTitleCardTimer, sendIframeCommand]);

  // Expose imperative controls to App (for Play/Pause, Replay, Eject)
  useEffect(() => {
    controllerRef.current = {
      play: () => {
        setShowTitleCard(false);
        sendIframeCommand("playVideo");
        if (playerRef.current) {
          try {
            playerRef.current.playVideo();
          } catch {
            // ignore
          }
        }
      },
      pause: () => {
        sendIframeCommand("pauseVideo");
        if (playerRef.current) {
          try {
            playerRef.current.pauseVideo();
          } catch {
            // ignore
          }
        }
      },
      togglePlayPause: () => {
        setShowTitleCard(false);
        const p = playerRef.current;
        if (!p) return;
        try {
          const st = p.getPlayerState();
          if (st === 1 || crtStateRef.current === "VIDEO_PLAYING") {
            sendIframeCommand("pauseVideo");
            p.pauseVideo();
          } else {
            sendIframeCommand("playVideo");
            p.playVideo();
          }
        } catch {
          // ignore
        }
      },
      replay: () => {
        setShowTitleCard(false);
        sendIframeCommand("seekTo", [0, true]);
        sendIframeCommand("playVideo");
        const p = playerRef.current;
        if (!p) return;
        try {
          p.seekTo(0, true);
          p.playVideo();
        } catch {
          // ignore
        }
      },
      stopAndClear: () => {
        destroyPlayer();
      },
    };
    return () => {
      controllerRef.current = null;
    };
  }, [controllerRef, destroyPlayer, sendIframeCommand]);

  // Animate visible 0-100% progress bar during READING_DISC / CONNECTING_TO_YOUTUBE / VIDEO_LOADING
  useEffect(() => {
    if (!["READING_DISC", "CONNECTING_TO_YOUTUBE", "VIDEO_LOADING"].includes(crtState)) {
      if (
        ["VIDEO_READY", "VIDEO_PLAYING", "VIDEO_PAUSED", "VIDEO_BUFFERING", "VIDEO_ENDED"].includes(
          crtState,
        )
      ) {
        setLoadProgress(100);
      } else {
        setLoadProgress(0);
      }
      return;
    }
    const start = performance.now();
    const id = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const cap = crtState === "READING_DISC" ? 48 : crtState === "CONNECTING_TO_YOUTUBE" ? 78 : 94;
      setLoadProgress((prev) => Math.min(cap, Math.max(prev + 4, Math.round(elapsed / 28))));
    }, 80);
    return () => window.clearInterval(id);
  }, [crtState]);

  // Should the YouTube player be active for the current DVD phase?
  const shouldMountPlayer =
    Boolean(project) && ["PROJECT_LOADING", "PROJECT_READY", "PROJECT_PLAYING"].includes(phase);

  // Clean up immediately when ejecting or returning to IDLE / OFF
  useEffect(() => {
    if (!shouldMountPlayer) {
      destroyPlayer();
    }
  }, [shouldMountPlayer, destroyPlayer]);

  // Initialize official YouTube IFrame Player API when disc enters PROJECT_LOADING
  useEffect(() => {
    if (!shouldMountPlayer || !project) return;

    let cancelled = false;
    const videoId = project.youtubeVideoId;
    activeVideoIdRef.current = videoId;
    readyHandledRef.current = false;

    // Step 5 & 6: Display READING VIDEO SOURCE, then CONNECTING TO VIDEO SOURCE..., then initialize YT.Player
    onCRTStateChange("READING_DISC");
    const connectTimer = window.setTimeout(() => {
      if (!cancelled) onCRTStateChange("CONNECTING_TO_YOUTUBE");
    }, 480);
    const loadingTimer = window.setTimeout(() => {
      if (cancelled) return;
      onCRTStateChange("VIDEO_LOADING");

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        onCRTStateChange("CONNECTION_ERROR");
        onPlayerReadyAdvancePhase();
        return;
      }

      loadYouTubeIframeAPI()
        .then(() => {
          if (cancelled) return;
          if (!window.YT || typeof window.YT.Player !== "function") {
            onCRTStateChange("CONNECTION_ERROR");
            onPlayerReadyAdvancePhase();
            return;
          }
          setApiReadyForIframe(true);
        })
        .catch(() => {
          if (cancelled) return;
          onCRTStateChange("CONNECTION_ERROR");
          onPlayerReadyAdvancePhase();
        });
    }, 960);

    return () => {
      cancelled = true;
      window.clearTimeout(connectTimer);
      window.clearTimeout(loadingTimer);
      destroyPlayer();
    };
  }, [
    shouldMountPlayer,
    project,
    retryCount,
    onCRTStateChange,
    onPlayerReadyAdvancePhase,
    destroyPlayer,
  ]);

  // Bind YT.Player synchronously as soon as the iframe is mounted after API readiness
  useEffect(() => {
    if (!shouldMountPlayer || !apiReadyForIframe || !project) return;
    const iframeEl = iframeRef.current;
    if (!iframeEl || !window.YT || typeof window.YT.Player !== "function") return;

    let cancelled = false;
    const videoId = project.youtubeVideoId;
    activeVideoIdRef.current = videoId;

    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
    }

    const player = new window.YT.Player(iframeEl, {
      events: {
        onReady: (event) => {
          if (cancelled || activeVideoIdRef.current !== videoId) return;
          readyHandledRef.current = true;
          setLoadProgress(100);

          // Step 7 & 8: Confirm actual YouTube player is ready, show book title card, then VIDEO_READY
          setShowTitleCard(true);
          onCRTStateChange("VIDEO_READY");
          onPlayerReadyAdvancePhase();

          clearTitleCardTimer();
          titleCardTimerRef.current = window.setTimeout(() => {
            if (cancelled) return;
            setShowTitleCard(false);
            sendIframeCommand("playVideo");
            try {
              event.target.playVideo();
            } catch {
              // If autoplay is blocked, CRT remains in VIDEO_READY with PLAY button visible
            }
          }, 1200);
        },
        onStateChange: (event) => {
          if (cancelled || activeVideoIdRef.current !== videoId) return;
          readyHandledRef.current = true;
          const st = event.data;
          // YT.PlayerState: ENDED = 0, PLAYING = 1, PAUSED = 2, BUFFERING = 3, CUED = 5
          if (st === 1) {
            setShowTitleCard(false);
            onCRTStateChange("VIDEO_PLAYING");
          } else if (st === 2) {
            onCRTStateChange("VIDEO_PAUSED");
          } else if (st === 3) {
            onCRTStateChange("VIDEO_BUFFERING");
          } else if (st === 0) {
            onCRTStateChange("VIDEO_ENDED");
          } else if (st === 5) {
            onCRTStateChange("VIDEO_READY");
          }
        },
        onError: (event) => {
          if (cancelled || activeVideoIdRef.current !== videoId) return;
          readyHandledRef.current = true;
          clearTitleCardTimer();
          setShowTitleCard(false);
          const code = event.data;
          // 101 and 150 indicate embedding is disabled by the video owner
          if (code === 101 || code === 150) {
            onCRTStateChange("EMBEDDING_DISABLED");
          } else if (code === 2 || code === 100) {
            onCRTStateChange("VIDEO_UNAVAILABLE");
          } else {
            onCRTStateChange("VIDEO_UNAVAILABLE");
          }
          onPlayerReadyAdvancePhase();
        },
      },
    });

    playerRef.current = player;

    return () => {
      cancelled = true;
    };
  }, [
    shouldMountPlayer,
    apiReadyForIframe,
    project,
    retryCount,
    onCRTStateChange,
    onPlayerReadyAdvancePhase,
    clearTitleCardTimer,
  ]);

  const originParam =
    typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : "";
  const iframeSrc = project
    ? `https://www.youtube.com/embed/${project.youtubeVideoId}?enablejsapi=1&playsinline=1&rel=0&origin=${originParam}`
    : undefined;

  const isErrorState =
    crtState === "VIDEO_UNAVAILABLE" ||
    crtState === "EMBEDDING_DISABLED" ||
    crtState === "CONNECTION_ERROR";

  const isPreReadyState =
    crtState === "DISC_DETECTED" ||
    crtState === "READING_DISC" ||
    crtState === "CONNECTING_TO_YOUTUBE" ||
    crtState === "VIDEO_LOADING";

  const showPortalContent =
    phase !== "OFF" &&
    view !== "notebook" &&
    view !== "window" &&
    view !== "studentId" &&
    (shouldMountPlayer || phase === "DISC_READING");

  return (
    <div
      ref={portalRef}
      className={`crt-screen-portal ${showPortalContent ? "active" : "hidden"}`}
      data-crt-state={crtState}
      data-video-id={project?.youtubeVideoId ?? ""}
    >
      {project && (
        <div className="crt-inner-frame">
          {/* Top CRT Header Bar */}
          <div className="crt-header-bar">
            <span className="crt-header-left">
              {project.id} // {project.title.toUpperCase()}
            </span>
            <span className="crt-header-right">{crtState.replace(/_/g, " ")}</span>
          </div>

          {/* Main CRT Viewport Area (preserves 16:9 YouTube aspect ratio inside 4:3 CRT) */}
          <div className="crt-stage-area">
            {shouldMountPlayer && apiReadyForIframe && iframeSrc && (
              <div
                className={`crt-yt-aspect-box ${
                  isPreReadyState || isErrorState || showTitleCard ? "obscured" : "visible"
                }`}
              >
                <iframe
                  key={`${project.youtubeVideoId}-${retryCount}`}
                  ref={iframeRef}
                  id="my-virtual-desk-yt-iframe"
                  className="crt-yt-iframe"
                  src={iframeSrc}
                  title={`${project.id} — ${project.title}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            )}

            {/* Pre-playback / Loading overlays */}
            {crtState === "DISC_DETECTED" && (
              <div className="crt-status-overlay">
                <span className="crt-status-eyebrow">MY VIRTUAL DESK OPTICAL DRIVE</span>
                <h3 className="crt-status-title">DISC DETECTED</h3>
                <p className="crt-status-sub">
                  {project.id} — {project.title} ({project.author})
                </p>
              </div>
            )}

            {(crtState === "READING_DISC" ||
              crtState === "CONNECTING_TO_YOUTUBE" ||
              crtState === "VIDEO_LOADING") && (
              <div className="crt-status-overlay">
                <span className="crt-status-eyebrow">
                  {crtState === "READING_DISC"
                    ? "READING VIDEO SOURCE"
                    : "CONNECTING TO VIDEO SOURCE..."}
                </span>
                <h3 className="crt-status-title">
                  {crtState === "READING_DISC"
                    ? "READING VIDEO SOURCE"
                    : crtState === "CONNECTING_TO_YOUTUBE"
                      ? "CONNECTING TO VIDEO SOURCE..."
                      : "LOADING YOUTUBE PLAYER..."}
                </h3>
                <div className="crt-progress-track">
                  <div
                    className="crt-progress-fill"
                    style={{
                      width: `${loadProgress}%`,
                      backgroundColor: project.accent,
                    }}
                  />
                </div>
                <p className="crt-status-sub">
                  {loadProgress}% • ID: {project.youtubeVideoId}
                </p>
              </div>
            )}

            {/* Selected Book Title Card */}
            {showTitleCard && !isErrorState && (
              <div className="crt-status-overlay crt-title-card">
                <span className="crt-status-eyebrow" style={{ color: project.accent }}>
                  {project.id} // GREAT BOOKS ARCHIVE
                </span>
                <h3 className="crt-status-title">{project.title}</h3>
                <div className="crt-title-divider" style={{ backgroundColor: project.accent }} />
                <p className="crt-status-author">AUTHOR: {project.author}</p>
                <p className="crt-status-sub">{project.description}</p>
                <div className="crt-error-actions">
                  <button
                    type="button"
                    className="crt-play-cta"
                    onClick={() => controllerRef.current?.play()}
                  >
                    ▶ PLAY VIDEO
                  </button>
                </div>
              </div>
            )}

            {/* VIDEO READY — PRESS PLAY prompt when autoplay is blocked or waiting */}
            {!showTitleCard && crtState === "VIDEO_READY" && (
              <div className="crt-ready-banner">
                <span>VIDEO READY — PRESS PLAY</span>
                <button
                  type="button"
                  className="crt-play-cta"
                  onClick={() => controllerRef.current?.play()}
                >
                  ▶ PLAY VIDEO
                </button>
              </div>
            )}

            {/* BUFFERING indicator */}
            {!showTitleCard && crtState === "VIDEO_BUFFERING" && (
              <div className="crt-buffering-badge">BUFFERING VIDEO...</div>
            )}

            {/* VIDEO ENDED overlay */}
            {!showTitleCard && crtState === "VIDEO_ENDED" && (
              <div className="crt-ready-banner">
                <span>PLAYBACK COMPLETE</span>
                <button
                  type="button"
                  className="crt-play-cta"
                  onClick={() => controllerRef.current?.replay()}
                >
                  ↺ REPLAY VIDEO
                </button>
              </div>
            )}

            {/* Error States: never leave CRT black */}
            {crtState === "VIDEO_UNAVAILABLE" && (
              <div className="crt-status-overlay crt-error-overlay">
                <span className="crt-status-eyebrow">PLAYBACK ERROR // {project.id}</span>
                <h3 className="crt-status-title">UNABLE TO PLAY THIS VIDEO</h3>
                <p className="crt-status-sub">
                  {project.title} ({project.youtubeVideoId}) is unavailable or restricted.
                </p>
                <div className="crt-error-actions">
                  <button type="button" onClick={onEject}>
                    ⏏ EJECT DISC
                  </button>
                </div>
              </div>
            )}

            {crtState === "EMBEDDING_DISABLED" && (
              <div className="crt-status-overlay crt-error-overlay">
                <span className="crt-status-eyebrow">EMBED RESTRICTION // {project.id}</span>
                <h3 className="crt-status-title">THIS VIDEO CANNOT BE PLAYED HERE</h3>
                <p className="crt-status-sub">
                  The video owner has disabled embedded playback for {project.title} (
                  {project.youtubeVideoId}).
                </p>
                <div className="crt-error-actions">
                  <button type="button" onClick={onEject}>
                    ⏏ EJECT DISC
                  </button>
                </div>
              </div>
            )}

            {crtState === "CONNECTION_ERROR" && (
              <div className="crt-status-overlay crt-error-overlay">
                <span className="crt-status-eyebrow">NETWORK FAULT // {project.id}</span>
                <h3 className="crt-status-title">CHECK YOUR INTERNET CONNECTION</h3>
                <p className="crt-status-sub">
                  Could not reach YouTube embedded player service for {project.title}.
                </p>
                <div className="crt-error-actions">
                  <button type="button" onClick={() => setRetryCount((c) => c + 1)}>
                    ↻ RETRY
                  </button>
                  <button type="button" onClick={onEject}>
                    ⏏ EJECT DISC
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom CRT Control Bar */}
          <div className="crt-footer-bar">
            <div className="crt-footer-meta">
              <span>{project.author}</span>
            </div>
            <div className="crt-footer-controls">
              {!isErrorState && !isPreReadyState && (
                <>
                  <button type="button" onClick={() => controllerRef.current?.togglePlayPause()}>
                    {crtState === "VIDEO_PLAYING" ? "❚❚ PAUSE" : "▶ PLAY"}
                  </button>
                  <button type="button" onClick={() => controllerRef.current?.replay()}>
                    ↺ REPLAY
                  </button>
                </>
              )}
              <button type="button" onClick={onToggleZoom}>
                {view === "screen" ? "− DESK" : "+ ZOOM"}
              </button>
              <button type="button" onClick={onEject}>
                ⏏ EJECT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
