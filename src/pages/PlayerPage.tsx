import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Loader2,
  ChevronDown,
  Mic2,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Video,
  Music,
  ListMusic,
  X,
} from "lucide-react";
import { usePlayer } from "@/lib/playerStore";
import { formatDuration } from "@/lib/normalize";
import LyricsView from "@/components/LyricsView";
import DownloadButton from "@/components/DownloadButton";

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    togglePlay,
    playNext,
    playPrev,
    seekTo,
    setQueue,
    queue,
    queueIndex,
    error,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    repeat,
    cycleRepeat,
    shuffle,
    toggleShuffle,
    videoActive,
    setVideoActive,
    attachVideo,
    lyrics,
    lyricsSynced,
    lyricsLoading,
  } = usePlayer();

  const [tab, setTab] = useState<"cover" | "lyrics">("cover");
  const [showQueue, setShowQueue] = useState(false);
  const videoBoxRef = useRef<HTMLDivElement | null>(null);

  // Ensure the requested track is playing (deep link / refresh)
  useEffect(() => {
    if (!id) return;
    if (currentTrack?.id !== id) {
      setQueue(
        [
          {
            id,
            title: "آهنگ",
            artist: "",
            thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          },
        ],
        0
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const displayTrack = currentTrack;

  // Attach / detach the shared video engine over our placeholder
  useEffect(() => {
    if (videoActive && videoBoxRef.current) {
      attachVideo(videoBoxRef.current);
    } else {
      attachVideo(null);
    }
  }, [videoActive, attachVideo, tab]);

  useEffect(() => {
    return () => {
      attachVideo(null);
      setVideoActive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const thumbnailUrl =
    displayTrack?.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  const handleSeekBar = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo((parseFloat(e.target.value) / 100) * duration);
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Dynamic background from album art */}
      <div className="fixed inset-0 -z-10">
        <motion.div
          key={thumbnailUrl}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 scale-125"
          style={{
            backgroundImage: `url(${thumbnailUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(110px) saturate(180%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-[#08080a]" />
      </div>

      {/* Top bar */}
      <div className="mx-auto max-w-xl px-5 pt-4">
        <div className="flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => navigate(-1)}
            className="btn-glass flex h-10 w-10 items-center justify-center rounded-full text-white/70"
          >
            <ChevronDown size={20} />
          </motion.button>

          <div className="flex flex-col items-center">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 font-en">
              Now Playing
            </span>
          </div>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowQueue(true)}
            className="btn-glass flex h-10 w-10 items-center justify-center rounded-full text-white/70"
          >
            <ListMusic size={18} />
          </motion.button>
        </div>
      </div>

      <div className="mx-auto flex max-w-xl flex-col px-5 pb-44 pt-6">
        {/* Cover / Lyrics switch */}
        <AnimatePresence mode="wait">
          {tab === "cover" ? (
            <motion.div
              key="cover"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Album art (or video overlay target) */}
              <motion.div
                animate={{ scale: isPlaying ? 1 : 0.9 }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                className="relative mx-auto w-full max-w-[330px]"
              >
                <div
                  ref={videoBoxRef}
                  className="cover-glow relative aspect-square overflow-hidden rounded-[2rem] shadow-2xl shadow-black/70 ring-1 ring-white/10"
                  style={{ backgroundImage: `url(${thumbnailUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
                >
                  {!videoActive && (
                    <>
                      <img
                        src={thumbnailUrl}
                        alt={displayTrack?.title || ""}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
                      {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                          <Loader2 size={34} className="animate-spin text-emerald-300" />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>

              {/* Title & artist */}
              <div className="mt-8 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-2xl font-bold leading-tight text-white" dir="auto">
                    {displayTrack?.title || "در حال پخش…"}
                  </h1>
                  {displayTrack?.artist && (
                    <p className="mt-1.5 truncate text-base text-emerald-300/90" dir="auto">
                      {displayTrack.artist}
                    </p>
                  )}
                </div>
                {/* اکشن‌ها: دانلود + سوییچ ویدیو (فقط در پلیر اصلی) */}
                <div className="flex flex-shrink-0 items-center gap-2">
                  <DownloadButton videoId={id} title={displayTrack?.title} compact />
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setVideoActive(!videoActive)}
                    className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${
                      videoActive
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "btn-glass text-white/70"
                    }`}
                  >
                    {videoActive ? <Music size={14} /> : <Video size={14} />}
                    {videoActive ? "کاور" : "ویدیو"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="lyrics"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Compact now-playing header */}
              <div className="mb-4 flex items-center gap-3">
                <img
                  src={thumbnailUrl}
                  alt=""
                  className="h-12 w-12 flex-shrink-0 rounded-xl object-cover ring-1 ring-white/10"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white" dir="auto">
                    {displayTrack?.title}
                  </p>
                  <p className="truncate text-xs text-white/45" dir="auto">
                    {displayTrack?.artist || "ناشناس"}
                  </p>
                </div>
              </div>
              <div style={{ height: "52vh" }}>
                <LyricsView
                  lyrics={lyrics}
                  currentTime={currentTime}
                  synced={lyricsSynced}
                  isLoading={lyricsLoading}
                  title={displayTrack?.title}
                  artist={displayTrack?.artist}
                  onSeek={seekTo}
                  variant="full"
                />
              </div>
              {!lyricsLoading && lyrics.length > 0 && !lyricsSynced && (
                <p className="mt-3 text-center text-[11px] text-white/30">
                  متن این آهنگ هم‌زمان‌بندی نشده
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mt-5 rounded-2xl bg-red-500/10 p-3 text-center text-sm text-red-300/80">
            {error}
          </div>
        )}
      </div>

      {/* Fixed transport dock */}
      <div className="fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto max-w-xl px-5 pb-5">
          <div className="player-bar rounded-[1.75rem] px-5 py-4">
            {/* Scrubber */}
            <div dir="ltr">
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={progress}
                onChange={handleSeekBar}
                className="w-full"
                style={{ ["--_pct" as string]: `${progress}%`, ["--_col" as string]: "#86efac" } as React.CSSProperties}
              />
              <div className="mt-1 flex justify-between text-[11px] tabular-nums text-white/45">
                <span>{formatDuration(currentTime)}</span>
                <span>-{formatDuration(Math.max(0, duration - currentTime))}</span>
              </div>
            </div>

            {/* Transport */}
            <div className="mt-2 flex items-center justify-between">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={toggleShuffle}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  shuffle ? "text-emerald-400" : "text-white/45 hover:text-white"
                }`}
              >
                <Shuffle size={17} />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={playPrev}
                disabled={queueIndex <= 0 && currentTime < 3}
                className="text-white/85 transition-colors hover:text-white disabled:opacity-25"
              >
                <SkipBack size={26} fill="currentColor" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                onClick={togglePlay}
                className="btn-play-accent flex h-16 w-16 items-center justify-center rounded-full"
              >
                {isLoading ? (
                  <Loader2 size={28} className="animate-spin text-emerald-200" />
                ) : isPlaying ? (
                  <Pause size={28} className="text-zinc-900" fill="currentColor" />
                ) : (
                  <Play size={28} className="ml-1 text-zinc-900" fill="currentColor" />
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={playNext}
                disabled={queueIndex >= queue.length - 1}
                className="text-white/85 transition-colors hover:text-white disabled:opacity-25"
              >
                <SkipForward size={26} fill="currentColor" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={cycleRepeat}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  repeat !== "off" ? "text-emerald-400" : "text-white/45 hover:text-white"
                }`}
              >
                {repeat === "one" ? <Repeat1 size={17} /> : <Repeat size={17} />}
              </motion.button>
            </div>

            {/* Volume + bottom toggles */}
            <div className="mt-4 flex items-center gap-3">
              <button onClick={toggleMute} className="text-white/55 transition-colors hover:text-white">
                <VolumeIcon size={17} />
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                className="flex-1"
                dir="ltr"
                style={{ ["--_pct" as string]: `${isMuted ? 0 : volume}%`, ["--_col" as string]: "rgba(255,255,255,0.8)" } as React.CSSProperties}
              />
              <button
                onClick={() => setTab(tab === "lyrics" ? "cover" : "lyrics")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === "lyrics"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "btn-glass text-white/65"
                }`}
              >
                <Mic2 size={14} />
                متن
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Queue sheet */}
      <AnimatePresence>
        {showQueue && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQueue(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-xl"
            >
              <div className="glass-strong max-h-[70vh] overflow-y-auto rounded-t-[2rem] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-white">
                    <ListMusic size={18} className="text-emerald-400" />
                    در صف پخش
                  </h3>
                  <button
                    onClick={() => setShowQueue(false)}
                    className="btn-glass flex h-8 w-8 items-center justify-center rounded-full text-white/60"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {queue.length === 0 && (
                    <p className="py-8 text-center text-sm text-white/40">صف پخش خالیه</p>
                  )}
                  {queue.map((t, i) => {
                    const active = i === queueIndex;
                    return (
                      <button
                        key={`${t.id}-${i}`}
                        onClick={() => {
                          setQueue(queue, i);
                          setShowQueue(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl p-2 text-right transition-colors ${
                          active ? "glass-accent" : "hover:bg-white/[0.05]"
                        }`}
                      >
                        <img src={t.thumbnail} alt="" className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm ${active ? "text-emerald-300 font-semibold" : "text-white/85"}`} dir="auto">
                            {t.title}
                          </p>
                          <p className="truncate text-xs text-white/40" dir="auto">{t.artist || "ناشناس"}</p>
                        </div>
                        {active && isPlaying && (
                          <div className="flex h-4 items-end gap-0.5">
                            {[0, 1, 2].map((b) => (
                              <motion.div
                                key={b}
                                className="w-0.5 rounded-full bg-emerald-400"
                                animate={{ scaleY: [0.3, 1, 0.3] }}
                                transition={{ duration: 0.5, repeat: Infinity, delay: b * 0.15 }}
                                style={{ height: "100%" }}
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
