import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import SearchBox from "@/components/SearchBox";
import TrackCard from "@/components/TrackCard";
import SkeletonCard from "@/components/SkeletonCard";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { searchMusicTracks } from "@/providers";
import type { Track } from "@/lib/types";
import { usePlayer } from "@/lib/playerStore";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const rawQuery = searchParams.get("q") || "";
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const lastQuery = useRef("");
  const { currentTrack } = usePlayer();

  const performSearch = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) return;
    if (q === lastQuery.current && results.length > 0) return;
    lastQuery.current = q;

    setLoading(true);
    setError(null);
    setSearched(true);
    setResults([]);

    try {
      const data = await searchMusicTracks(q);

      if (data.items.length > 0) {
        setResults(data.items);
      }
    } catch (err) {
      console.error("[SearchPage]", err);
      setError("مشکلی در جستجو پیش اومد. لطفاً دوباره امتحان کن.");
    } finally {
      setLoading(false);
    }
  }, [results.length]);

  useEffect(() => {
    if (rawQuery) {
      performSearch(rawQuery);
    }
  }, [rawQuery]);

  const handleRetry = () => {
    lastQuery.current = "";
    performSearch(rawQuery);
  };

  return (
    <div className={`min-h-screen ${currentTrack ? "pb-36" : "pb-12"}`}>
      <div className="mx-auto max-w-xl px-5 pt-6 pb-10">
        {/* Search box */}
        <SearchBox defaultValue={rawQuery} autoFocus />

        {/* Results header */}
        {rawQuery && !loading && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 mb-4 flex items-center gap-2"
          >
            <Search size={14} className="text-white/30" />
            <p className="text-sm text-white/40">
              نتایج جستجو برای «{rawQuery}»
            </p>
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-8 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} index={i} />
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-2"
          >
            {results.map((track, i) => (
              <TrackCard
                key={track.id}
                track={track}
                index={i}
                allTracks={results}
              />
            ))}
          </motion.div>
        )}

        {/* Empty */}
        {!loading && searched && results.length === 0 && !error && (
          <EmptyState query={rawQuery} />
        )}

        {/* Error */}
        {!loading && error && (
          <ErrorState message={error} onRetry={handleRetry} />
        )}
      </div>
    </div>
  );
}
