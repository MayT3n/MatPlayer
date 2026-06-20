import { motion } from "framer-motion";
import { Play, Pause, Loader2, Music } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "@/lib/playerStore";
import { formatDuration, formatViews } from "@/lib/normalize";
import type { Track } from "@/lib/types";

interface TrackCardProps {
  track: Track;
  index?: number;
  allTracks?: Track[];
  rank?: number;
}

export default function TrackCard({ track, index = 0, allTracks, rank }: TrackCardProps) {
  const navigate = useNavigate();
  const { currentTrack, isPlaying, isLoading, setQueue, togglePlay } = usePlayer();

  const isCurrentTrack = currentTrack?.id === track.id;
  const isCurrentPlaying = isCurrentTrack && isPlaying;
  const isCurrentLoading = isCurrentTrack && isLoading;

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrentTrack) {
      togglePlay();
    } else {
      const tracks = allTracks || [track];
      const idx = allTracks ? allTracks.findIndex((t) => t.id === track.id) : 0;
      setQueue(tracks, idx >= 0 ? idx : 0);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate(`/player/${track.id}`)}
      className={`group flex cursor-pointer items-center gap-3 rounded-2xl p-2.5 transition-all duration-300 ${
        isCurrentTrack ? "glass-accent" : "hover:bg-white/[0.05]"
      }`}
    >
      {/* Rank number */}
      {rank !== undefined && (
        <span
          className={`w-5 flex-shrink-0 text-center text-sm tabular-nums font-en ${
            isCurrentTrack ? "text-emerald-400" : "text-white/30"
          }`}
        >
          {rank}
        </span>
      )}

      {/* Thumbnail */}
      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl ring-1 ring-white/5">
        {track.thumbnail ? (
          <img
            src={track.thumbnail}
            alt={track.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${track.id}/mqdefault.jpg`;
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/5">
            <Music size={20} className="text-white/20" />
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handlePlay}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-md"
          >
            {isCurrentLoading ? (
              <Loader2 size={16} className="animate-spin text-white" />
            ) : isCurrentPlaying ? (
              <Pause size={16} className="text-white" fill="white" />
            ) : (
              <Play size={16} className="ml-0.5 text-white" fill="white" />
            )}
          </motion.button>
        </div>

        {isCurrentPlaying && (
          <div className="absolute bottom-1.5 right-1.5 flex h-4 items-end gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-0.5 rounded-full bg-emerald-400"
                animate={{ scaleY: [0.3, 1, 0.3] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                style={{ height: "100%" }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <h3
          className={`truncate text-[0.95rem] font-semibold leading-tight ${
            isCurrentTrack ? "text-emerald-300" : "text-white/90"
          }`}
          dir="auto"
        >
          {track.title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-white/45" dir="auto">
          {track.artist || "ناشناس"}
          {track.views ? (
            <span className="text-white/30"> · {formatViews(track.views)}</span>
          ) : null}
        </p>
      </div>

      {/* Duration + play */}
      <div className="flex flex-shrink-0 items-center gap-2">
        {track.duration ? (
          <span className="text-[11px] tabular-nums text-white/30">
            {formatDuration(track.duration)}
          </span>
        ) : null}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handlePlay}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
            isCurrentPlaying
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-white/5 text-white/50 hover:bg-emerald-500/15 hover:text-emerald-400"
          }`}
        >
          {isCurrentLoading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : isCurrentPlaying ? (
            <Pause size={13} fill="currentColor" />
          ) : (
            <Play size={13} className="ml-0.5" fill="currentColor" />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
