import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Track } from "./types";
import { getVideoMeta, getRelatedTracks } from "@/providers";
import { cleanSongTitle, cleanArtistName } from "@/lib/normalize";
import { pushRecentlyPlayed } from "@/lib/history";
import { fetchLyrics } from "@/providers/lyrics";
import type { LyricLine } from "@/components/LyricsView";

// ══════════════════════════════════════════════════════════════
// YouTube IFrame typings
// ══════════════════════════════════════════════════════════════

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  loadVideoById: (id: string) => void;
  cueVideoById: (id: string) => void;
  setVolume: (v: number) => void;
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  destroy: () => void;
  getPlayerState: () => number;
}

interface YTEvent {
  target: YTPlayer;
  data?: number;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: string | HTMLElement,
        config: {
          videoId?: string;
          width?: number | string;
          height?: number | string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (e: YTEvent) => void;
            onStateChange?: (e: YTEvent) => void;
            onError?: (e: YTEvent) => void;
          };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YT_ENDED = 0;
const YT_PLAYING = 1;
const YT_PAUSED = 2;
const YT_BUFFERING = 3;
const YT_CUED = 5;

// ══════════════════════════════════════════════════════════════
// YouTube API Loader
// ══════════════════════════════════════════════════════════════

let apiLoaded = false;
let apiLoading = false;
const apiCallbacks: (() => void)[] = [];

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (apiLoaded && window.YT?.Player) return resolve();
    apiCallbacks.push(resolve);
    if (apiLoading) return;
    apiLoading = true;
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      apiLoaded = true;
      apiCallbacks.forEach((cb) => cb());
      apiCallbacks.length = 0;
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    document.head.appendChild(tag);
  });
}

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
  queue: Track[];
  queueIndex: number;
  volume: number;
  isMuted: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  videoActive: boolean;
  lyrics: LyricLine[];
  lyricsSynced: boolean;
  lyricsLoading: boolean;
}

interface PlayerActions {
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seekTo: (time: number) => void;
  playNext: () => void;
  playPrev: () => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  setVideoActive: (active: boolean) => void;
  attachVideo: (el: HTMLElement | null) => void;
}

const initialState: PlayerState = {
  currentTrack: null,
  isPlaying: false,
  isLoading: false,
  isReady: false,
  error: null,
  currentTime: 0,
  duration: 0,
  queue: [],
  queueIndex: -1,
  volume: 100,
  isMuted: false,
  repeat: "off",
  shuffle: false,
  videoActive: false,
  lyrics: [],
  lyricsSynced: false,
  lyricsLoading: false,
};

const OFFSCREEN =
  "position:fixed;left:-9999px;top:0;width:320px;height:180px;opacity:0;pointer-events:none;";

const PlayerContext = createContext<(PlayerState & PlayerActions) | null>(null);

// ══════════════════════════════════════════════════════════════
// Provider
// ══════════════════════════════════════════════════════════════

export function PlayerProvider({ children }: { children: ReactNode }) {
  const playerRef = useRef<YTPlayer | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<PlayerState>(initialState);
  const pendingRef = useRef<{ id: string } | null>(null);
  const rafRef = useRef<number | null>(null);
  const attachTargetRef = useRef<HTMLElement | null>(null);
  const lyricsReqRef = useRef(0);

  // مدیریت related tracks
  const relatedDoneRef = useRef<Set<string>>(new Set());
  const relatedReqRef = useRef(0);
  const relatedRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, _setState] = useState<PlayerState>(() => {
    let vol = 100;
    try {
      const saved = localStorage.getItem("mp_volume");
      if (saved !== null)
        vol = Math.max(0, Math.min(100, parseInt(saved, 10) || 100));
    } catch {}
    return { ...initialState, volume: vol };
  });

  const setState = useCallback((partial: Partial<PlayerState>) => {
    _setState((prev) => {
      const next = { ...prev, ...partial };
      stateRef.current = next;
      return next;
    });
  }, []);

  // ── Position YT iframe ──────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const host = hostRef.current;
      const target = attachTargetRef.current;
      if (host) {
        if (target && stateRef.current.videoActive) {
          const r = target.getBoundingClientRect();
          host.style.cssText =
            `position:fixed;z-index:5;border-radius:1.5rem;overflow:hidden;` +
            `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;opacity:1;pointer-events:auto;` +
            `box-shadow:0 30px 80px -20px rgba(0,0,0,0.7);`;
        } else {
          host.style.cssText = OFFSCREEN;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Load lyrics ─────────────────────────────────────────────
  const loadLyrics = useCallback(
    async (track: Track) => {
      const reqId = ++lyricsReqRef.current;
      setState({ lyrics: [], lyricsSynced: false, lyricsLoading: true });
      try {
        const res = await fetchLyrics(
          track.title,
          track.artist || "",
          track.duration
        );
        if (reqId !== lyricsReqRef.current) return;
        setState({
          lyrics: res?.lines || [],
          lyricsSynced: res?.synced || false,
          lyricsLoading: false,
        });
      } catch {
        if (reqId === lyricsReqRef.current)
          setState({ lyricsLoading: false });
      }
    },
    [setState]
  );

  // ══════════════════════════════════════════════════════════════
  // ⭐ Related tracks — بازنویسی کامل
  // ══════════════════════════════════════════════════════════════

  const fetchRelatedForTrack = useCallback(
    async (trackId: string, retryCount = 0) => {
      // اگر موفق fetch شده بود، دوباره نگیر
      if (relatedDoneRef.current.has(trackId)) {
        console.log(`[Player] Related already done for: ${trackId}, skipping`);
        return;
      }

      const reqId = ++relatedReqRef.current;
      console.log(`[Player] 🎵 Fetching related tracks for: ${trackId} (attempt ${retryCount + 1})`);

      try {
        const related = await getRelatedTracks(trackId);

        // چک کن request قدیمی نباشد
        if (reqId !== relatedReqRef.current) {
          console.log("[Player] ⏭️ Superseded by newer request");
          return;
        }

        // چک کن هنوز همان آهنگ در حال پخش است
        const s = stateRef.current;
        if (!s.currentTrack || s.currentTrack.id !== trackId) {
          console.log("[Player] ⏭️ Track changed, discarding results");
          return;
        }

        console.log(`[Player] 📥 Got ${related.length} related tracks from API`);

        // حذف duplicateها
        const existingIds = new Set(s.queue.map((t) => t.id));
        const newTracks = related
          .filter((t) => t.id !== trackId && !existingIds.has(t.id))
          .slice(0, 25);

        console.log(
          `[Player] ✅ Adding ${newTracks.length} new tracks to queue (was ${s.queue.length})`
        );

        if (newTracks.length > 0) {
          setState({ queue: [...s.queue, ...newTracks] });
          // فقط وقتی واقعاً track اضافه شد، done حساب کن
          relatedDoneRef.current.add(trackId);
        } else {
          // صفر نتیجه → اجازه retry بده
          console.log(`[Player] ⚠️ No usable related tracks, will retry later`);
          relatedDoneRef.current.delete(trackId);

          // retry بعد از ۵ ثانیه (حداکثر ۳ بار)
          if (retryCount < 3) {
            if (relatedRetryTimerRef.current) {
              clearTimeout(relatedRetryTimerRef.current);
            }
            relatedRetryTimerRef.current = setTimeout(() => {
              const cur = stateRef.current;
              if (cur.currentTrack?.id === trackId) {
                console.log(`[Player] 🔄 Retrying related for: ${trackId}`);
                fetchRelatedForTrack(trackId, retryCount + 1);
              }
            }, 5000 * (retryCount + 1)); // 5s, 10s, 15s
          }
        }
      } catch (e) {
        console.error("[Player] ❌ Failed to fetch related:", e);
        relatedDoneRef.current.delete(trackId);

        // retry on error too
        if (retryCount < 3) {
          if (relatedRetryTimerRef.current) {
            clearTimeout(relatedRetryTimerRef.current);
          }
          relatedRetryTimerRef.current = setTimeout(() => {
            const cur = stateRef.current;
            if (cur.currentTrack?.id === trackId) {
              fetchRelatedForTrack(trackId, retryCount + 1);
            }
          }, 5000 * (retryCount + 1));
        }
      }
    },
    [setState]
  );

  // Cleanup retry timer
  useEffect(() => {
    return () => {
      if (relatedRetryTimerRef.current) {
        clearTimeout(relatedRetryTimerRef.current);
      }
    };
  }, []);

  // ⭐ وقتی آهنگ عوض شد یا به آخر queue نزدیک شدیم → related بگیر
  useEffect(() => {
    const s = stateRef.current;
    if (!s.currentTrack) return;

    const remaining = s.queue.length - s.queueIndex - 1;

    console.log(
      `[Player] Queue check: track="${s.currentTrack.title?.slice(0, 30)}", ` +
        `index=${s.queueIndex}, total=${s.queue.length}, remaining=${remaining}`
    );

    if (remaining <= 4) {
      fetchRelatedForTrack(s.currentTrack.id);
    }
  }, [state.queueIndex, state.currentTrack?.id, state.queue.length, fetchRelatedForTrack]);

  // ══════════════════════════════════════════════════════════════
  // Load and play
  // ══════════════════════════════════════════════════════════════

  const loadAndPlayRef = useRef<
    | ((track: Track, queue?: Track[], queueIndex?: number) => void)
    | undefined
  >(undefined);

  const loadAndPlay = useCallback(
    (track: Track, queue?: Track[], queueIndex?: number) => {
      const prev = stateRef.current;
      const partial: Partial<PlayerState> = {
        currentTrack: track,
        isLoading: true,
        error: null,
        isPlaying: false,
        currentTime: 0,
        duration: track.duration || 0,
      };
      if (queue !== undefined) partial.queue = queue;
      partial.queueIndex =
        queueIndex !== undefined ? queueIndex : prev.queueIndex;
      setState(partial);

      // Lyrics
      loadLyrics(track);

      // Fetch metadata if missing
      if (!track.artist || !track.title || track.title === "آهنگ") {
        getVideoMeta(track.id).then((meta) => {
          if (meta && stateRef.current.currentTrack?.id === track.id) {
            const merged: Track = {
              ...stateRef.current.currentTrack!,
              title: cleanSongTitle(meta.title) || track.title,
              artist: cleanArtistName(meta.artist) || track.artist,
              thumbnail: meta.thumbnail || track.thumbnail,
              duration: meta.duration || track.duration,
            };
            setState({ currentTrack: merged });
            loadLyrics(merged);
            pushRecentlyPlayed(merged);

            // ⭐ بعد از گرفتن metadata واقعی، دوباره related بگیر
            // چون ممکن است اولین بار title = "آهنگ" بوده و provider درست کار نکرده
            const remaining = stateRef.current.queue.length - stateRef.current.queueIndex - 1;
            if (remaining <= 4) {
              relatedDoneRef.current.delete(track.id);
              fetchRelatedForTrack(track.id);
            }
          }
        });
      }

      pushRecentlyPlayed(track);

      // Play
      const player = playerRef.current;
      if (player && stateRef.current.isReady) {
        try {
          player.loadVideoById(track.id);
        } catch {
          pendingRef.current = { id: track.id };
        }
      } else {
        pendingRef.current = { id: track.id };
      }
    },
    [setState, loadLyrics, fetchRelatedForTrack]
  );
  loadAndPlayRef.current = loadAndPlay;

  // ── Advance to next ─────────────────────────────────────────
  const advance = useCallback(
    (auto: boolean) => {
      const s = stateRef.current;

      if (s.repeat === "one" && auto) {
        playerRef.current?.seekTo(0, true);
        playerRef.current?.playVideo();
        return;
      }

      if (s.queue.length === 0) return;

      let nextIdx: number;

      if (s.shuffle && s.queue.length > 1) {
        do {
          nextIdx = Math.floor(Math.random() * s.queue.length);
        } while (nextIdx === s.queueIndex && s.queue.length > 1);
      } else {
        nextIdx = s.queueIndex + 1;
      }

      if (nextIdx < s.queue.length) {
        loadAndPlayRef.current?.(s.queue[nextIdx], s.queue, nextIdx);
      } else if (s.repeat === "all") {
        loadAndPlayRef.current?.(s.queue[0], s.queue, 0);
      } else {
        setState({ isPlaying: false });
      }
    },
    [setState]
  );

  // ── Init YT engine ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    loadYouTubeAPI().then(() => {
      if (cancelled || !mountRef.current || !window.YT) return;
      const inner = document.createElement("div");
      mountRef.current.appendChild(inner);
      playerRef.current = new window.YT.Player(inner, {
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0,
          controls: 1,
          disablekb: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            setState({ isReady: true });
            try {
              e.target.setVolume(stateRef.current.volume);
            } catch {}
            if (pendingRef.current) {
              const id = pendingRef.current.id;
              pendingRef.current = null;
              try {
                e.target.loadVideoById(id);
              } catch {}
            }
          },
          onStateChange: (e) => {
            const st = e.data;
            if (st === YT_PLAYING) {
              setState({
                isPlaying: true,
                isLoading: false,
                error: null,
                duration:
                  e.target.getDuration() || stateRef.current.duration,
              });
            } else if (st === YT_PAUSED) {
              setState({ isPlaying: false, isLoading: false });
            } else if (st === YT_BUFFERING) {
              setState({ isLoading: true });
            } else if (st === YT_CUED) {
              setState({ isLoading: false });
            } else if (st === YT_ENDED) {
              advance(true);
            }
          },
          onError: () => {
            setState({
              isLoading: false,
              error: "این آهنگ قابل پخش نیست.",
            });
            setTimeout(() => advance(true), 1500);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Time polling ────────────────────────────────────────────
  useEffect(() => {
    let id: number;
    const poll = () => {
      const p = playerRef.current;
      if (p && stateRef.current.isPlaying) {
        try {
          const t = p.getCurrentTime() || 0;
          const d = p.getDuration() || stateRef.current.duration;
          setState({ currentTime: t, duration: d || 0 });
        } catch {}
      }
      id = window.setTimeout(poll, 250);
    };
    id = window.setTimeout(poll, 250);
    return () => clearTimeout(id);
  }, [setState]);

  // ══════════════════════════════════════════════════════════════
  // Actions
  // ══════════════════════════════════════════════════════════════

  const playTrack = useCallback(
    (track: Track) => loadAndPlay(track, [track], 0),
    [loadAndPlay]
  );

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    const s = stateRef.current;
    if (!p || !s.currentTrack) return;
    if (s.isPlaying) p.pauseVideo();
    else p.playVideo();
  }, []);

  const pause = useCallback(() => playerRef.current?.pauseVideo(), []);
  const resume = useCallback(() => playerRef.current?.playVideo(), []);

  const seekTo = useCallback(
    (time: number) => {
      playerRef.current?.seekTo(time, true);
      setState({ currentTime: time });
    },
    [setState]
  );

  const playNext = useCallback(() => advance(false), [advance]);

  const playPrev = useCallback(() => {
    const p = playerRef.current;
    const s = stateRef.current;
    if (p && s.currentTime > 3) {
      p.seekTo(0, true);
      setState({ currentTime: 0 });
      return;
    }
    if (s.queueIndex > 0) {
      loadAndPlay(s.queue[s.queueIndex - 1], s.queue, s.queueIndex - 1);
    } else {
      p?.seekTo(0, true);
      setState({ currentTime: 0 });
    }
  }, [loadAndPlay, setState]);

  const setQueue = useCallback(
    (tracks: Track[], startIndex = 0) => {
      if (!tracks.length) return;

      console.log(
        `[Player] setQueue called: ${tracks.length} tracks, start=${startIndex}`
      );

      // پاک کردن cache related
      relatedDoneRef.current.clear();
      relatedReqRef.current++;
      if (relatedRetryTimerRef.current) {
        clearTimeout(relatedRetryTimerRef.current);
        relatedRetryTimerRef.current = null;
      }

      const idx = Math.max(0, Math.min(startIndex, tracks.length - 1));
      loadAndPlay(tracks[idx], tracks, idx);
    },
    [loadAndPlay]
  );

  const addToQueue = useCallback(
    (track: Track) => {
      const s = stateRef.current;
      if (s.queue.some((t) => t.id === track.id)) return;
      setState({ queue: [...s.queue, track] });
    },
    [setState]
  );

  const removeFromQueue = useCallback(
    (index: number) => {
      const s = stateRef.current;
      if (index < 0 || index >= s.queue.length) return;
      if (index === s.queueIndex) return;

      const newQueue = [...s.queue];
      newQueue.splice(index, 1);
      const newIndex = index < s.queueIndex ? s.queueIndex - 1 : s.queueIndex;
      setState({ queue: newQueue, queueIndex: newIndex });
    },
    [setState]
  );

  const clearQueue = useCallback(() => {
    const s = stateRef.current;
    relatedDoneRef.current.clear();
    if (relatedRetryTimerRef.current) {
      clearTimeout(relatedRetryTimerRef.current);
      relatedRetryTimerRef.current = null;
    }
    if (!s.currentTrack) {
      setState({ queue: [], queueIndex: -1 });
    } else {
      setState({ queue: [s.currentTrack], queueIndex: 0 });
    }
  }, [setState]);

  const setVolume = useCallback(
    (v: number) => {
      const vol = Math.max(0, Math.min(100, v));
      try {
        playerRef.current?.setVolume(vol);
        if (vol > 0 && stateRef.current.isMuted) {
          playerRef.current?.unMute();
          setState({ isMuted: false });
        }
      } catch {}
      setState({ volume: vol });
    },
    [setState]
  );

  const toggleMute = useCallback(() => {
    const p = playerRef.current;
    const s = stateRef.current;
    try {
      if (s.isMuted) {
        p?.unMute();
        setState({ isMuted: false });
      } else {
        p?.mute();
        setState({ isMuted: true });
      }
    } catch {}
  }, [setState]);

  const cycleRepeat = useCallback(() => {
    const order: RepeatMode[] = ["off", "all", "one"];
    const cur = stateRef.current.repeat;
    setState({ repeat: order[(order.indexOf(cur) + 1) % order.length] });
  }, [setState]);

  const toggleShuffle = useCallback(
    () => setState({ shuffle: !stateRef.current.shuffle }),
    [setState]
  );

  const setVideoActive = useCallback(
    (active: boolean) => setState({ videoActive: active }),
    [setState]
  );

  const attachVideo = useCallback((el: HTMLElement | null) => {
    attachTargetRef.current = el;
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      )
        return;
      const s = stateRef.current;
      if (!s.currentTrack) return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          if (s.isPlaying) playerRef.current?.pauseVideo();
          else playerRef.current?.playVideo();
          break;
        case "ArrowRight":
          e.preventDefault();
          seekTo(Math.min(s.duration || 0, s.currentTime + 5));
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekTo(Math.max(0, s.currentTime - 5));
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(s.volume + 5);
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(s.volume - 5);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seekTo, setVolume]);

  // ── Persist volume ──────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem("mp_volume", String(state.volume));
    } catch {}
  }, [state.volume]);

  // ── Media Session ───────────────────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const t = state.currentTrack;
    if (!t) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title,
        artist: t.artist || "",
        artwork: [{ src: t.thumbnail, sizes: "512x512", type: "image/jpeg" }],
      });
      navigator.mediaSession.setActionHandler("play", () => resume());
      navigator.mediaSession.setActionHandler("pause", () => pause());
      navigator.mediaSession.setActionHandler("previoustrack", () =>
        playPrev()
      );
      navigator.mediaSession.setActionHandler("nexttrack", () => playNext());
    } catch {}
  }, [state.currentTrack, resume, pause, playPrev, playNext]);

  return (
    <PlayerContext.Provider
      value={{
        ...state,
        playTrack,
        togglePlay,
        pause,
        resume,
        seekTo,
        playNext,
        playPrev,
        setQueue,
        addToQueue,
        removeFromQueue,
        clearQueue,
        setVolume,
        toggleMute,
        cycleRepeat,
        toggleShuffle,
        setVideoActive,
        attachVideo,
      }}
    >
      <div
        ref={hostRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: 320,
          height: 180,
          opacity: 0,
          pointerEvents: "none",
        }}
        aria-hidden
      >
        <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      </div>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be inside PlayerProvider");
  return ctx;
}