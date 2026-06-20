import { motion } from "framer-motion";
import { Sparkles, Play, TrendingUp, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SearchBox from "@/components/SearchBox";
import TrackCard from "@/components/TrackCard";
import TelegramCard from "@/components/TelegramCard";
import LinkImport from "@/components/LinkImport";
import { suggestedTracks } from "@/data/suggestions";
import { getRecentlyPlayed } from "@/lib/history";
import { usePlayer } from "@/lib/playerStore";

export default function HomePage() {
  const navigate = useNavigate();
  const { currentTrack, setQueue } = usePlayer();
  const recent = getRecentlyPlayed();

  const featured = suggestedTracks[0];
  const rest = suggestedTracks.slice(1);

  const playFeatured = () => {
    setQueue(suggestedTracks, 0);
    navigate(`/player/${featured.id}`);
  };

  return (
    <div className={`min-h-screen ${currentTrack ? "pb-36" : "pb-12"}`}>
      {/* Background accents — soft & calm */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-emerald-500/[0.04] blur-[140px]" />
      </div>

      {/* Hero / search */}
      <div className="relative flex flex-col items-center px-5 pt-12 pb-8 md:pt-16">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-2 text-center text-3xl font-bold tracking-tight text-white md:text-4xl"
        >
          Mat Player
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mb-8 text-sm text-white/45"
        >
          هر آهنگی، هر جا — فقط اسمش رو بنویس
        </motion.p>
        <div className="relative w-full max-w-lg">
          <SearchBox large />
        </div>

        {/* چیپس‌های سرچ سریع */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-5 flex max-w-lg flex-wrap items-center justify-center gap-2"
        >
          {["محسن یگانه", "شادمهر عقیلی", "سیروان خسروی", "The Weeknd", "Billie Eilish", "Coldplay"].map(
            (chip) => (
              <button
                key={chip}
                onClick={() => navigate(`/search?q=${encodeURIComponent(chip)}`)}
                className="btn-glass rounded-full px-3.5 py-1.5 text-xs text-white/65 hover:text-white"
                dir="auto"
              >
                {chip}
              </button>
            )
          )}
        </motion.div>
      </div>

      {/* Featured */}
      <div className="mx-auto max-w-xl px-5">
        {/* پخش/دانلود از لینک */}
        <div className="mb-8">
          <LinkImport />
        </div>

        {/* اخیراً پخش‌شده */}
        {recent.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="mb-3 flex items-center gap-2">
              <Clock size={15} className="text-emerald-400" />
              <h2 className="text-sm font-semibold text-white/70">اخیراً پخش‌شده</h2>
            </div>
            <div className="space-y-0.5">
              {recent.slice(0, 5).map((track, i) => (
                <TrackCard key={track.id} track={track} index={i} allTracks={recent} />
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-3 flex items-center gap-2"
        >
          <Sparkles size={15} className="text-emerald-400" />
          <h2 className="text-sm font-semibold text-white/70">امروز گوش بده</h2>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          onClick={playFeatured}
          className="group relative mb-8 block w-full overflow-hidden rounded-[1.75rem] text-right ring-1 ring-white/10"
        >
          <div className="relative aspect-[16/10] w-full">
            <img
              src={`https://i.ytimg.com/vi/${featured.id}/hqdefault.jpg`}
              alt={featured.title}
              className="absolute inset-0 h-full w-full scale-110 object-cover transition-transform duration-700 group-hover:scale-[1.18]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-300/90 font-en">
                  Featured
                </p>
                <h3 className="truncate text-xl font-bold text-white font-en" dir="ltr">
                  {featured.title}
                </h3>
                <p className="truncate text-sm text-white/60 font-en" dir="ltr">
                  {featured.artist}
                </p>
              </div>
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full btn-play-accent shadow-lg">
                <Play size={20} className="ml-0.5 text-zinc-900" fill="currentColor" />
              </span>
            </div>
          </div>
        </motion.button>

        {/* Trending list */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp size={15} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white/70">آهنگ‌های پرطرفدار</h2>
          </div>
          <div className="space-y-0.5">
            {rest.map((track, i) => (
              <TrackCard
                key={track.id}
                track={track}
                index={i}
                rank={i + 1}
                allTracks={suggestedTracks}
              />
            ))}
          </div>
        </motion.div>

        <div className="mt-10">
          <TelegramCard />
        </div>
      </div>
    </div>
  );
}
