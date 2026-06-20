import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Loader2, SkipForward, SkipBack, ChevronUp } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePlayer } from "@/lib/playerStore";
import { formatDuration } from "@/lib/normalize";

export default function MiniPlayer() {
  const navigate = useNavigate();
  const location = useLocation();
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
    queue,
    queueIndex,
  } = usePlayer();

  // Hide the mini-player while the full player page is open
  const onPlayerPage = location.pathname.startsWith("/player");
  if (!currentTrack || onPlayerPage) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seekTo(Math.max(0, Math.min(1, ratio)) * duration);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 120, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3"
      >
        <div className="pointer-events-none absolute -inset-x-6 -bottom-6 h-32 bg-emerald-500/[0.07] blur-3xl" />

        <div className="relative mx-auto max-w-xl">
          <div className="player-bar glass-edge relative overflow-hidden rounded-[1.6rem]">
            {/* Album art ambient glow */}
            <div
              className="absolute left-5 top-1/2 -translate-y-1/2 h-12 w-12 rounded-2xl opacity-50 blur-2xl scale-[2]"
              style={{ backgroundImage: `url(${currentTrack.thumbnail})`, backgroundSize: "cover" }}
            />

            <div className="relative flex items-center gap-3 p-2.5 pr-3">
              {/* Track info → expand to full player */}
              <button
                onClick={() => navigate(`/player/${currentTrack.id}`)}
                className="group flex min-w-0 flex-1 items-center gap-3 text-right transition-transform active:scale-[0.99]"
              >
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-[0.9rem] shadow-lg shadow-black/40 ring-1 ring-white/10">
                  <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${currentTrack.id}/mqdefault.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <ChevronUp size={18} className="text-white" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white/95" dir="auto">
                    {currentTrack.title}
                  </p>
                  <p className="truncate text-[11px] text-white/45" dir="auto">
                    {currentTrack.artist || "ناشناس"}
                  </p>
                </div>
              </button>

              {/* Controls */}
              <div className="flex flex-shrink-0 items-center gap-0.5">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={playPrev}
                  disabled={queueIndex <= 0}
                  className="rounded-full p-2 text-white/55 transition-colors hover:text-white disabled:opacity-20"
                >
                  <SkipBack size={16} fill="currentColor" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={togglePlay}
                  className="mx-0.5 flex h-11 w-11 items-center justify-center rounded-full text-white btn-play-accent"
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin text-emerald-200" />
                  ) : isPlaying ? (
                    <Pause size={18} className="text-zinc-900" fill="currentColor" />
                  ) : (
                    <Play size={18} className="ml-0.5 text-zinc-900" fill="currentColor" />
                  )}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={playNext}
                  disabled={queueIndex >= queue.length - 1}
                  className="rounded-full p-2 text-white/55 transition-colors hover:text-white disabled:opacity-20"
                >
                  <SkipForward size={16} fill="currentColor" />
                </motion.button>
              </div>
            </div>

            {/* Interactive progress bar */}
            <div
              className="group/bar relative h-2.5 cursor-pointer px-3 pb-1.5"
              dir="ltr"
              onClick={handleScrub}
            >
              <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-300 to-green-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between px-4 pb-1.5 text-[9px] tabular-nums text-white/30" dir="ltr">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
