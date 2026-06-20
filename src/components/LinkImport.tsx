import { useState } from "react";
import { motion } from "framer-motion";
import { Link2, Loader2, ArrowLeft, Music2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { resolveLink } from "@/providers/api";

export default function LinkImport() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    const link = url.trim();
    if (!link) return;
    setLoading(true);
    setError(null);
    try {
      const r = await resolveLink(link);
      if (r.error) {
        setError(r.error);
      } else if (r.type === "youtube" && r.id) {
        navigate(`/player/${r.id}`);
      } else if (r.type === "search" && r.query) {
        navigate(`/search?q=${encodeURIComponent(r.query)}`);
      } else {
        setError("نتونستم این لینک رو بشناسم");
      }
    } catch {
      setError("یه مشکلی پیش اومد");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className="glass-subtle rounded-3xl p-5"
    >
      <div className="mb-3 flex items-center gap-2">
        <Link2 size={15} className="text-emerald-400" />
        <h3 className="text-sm font-semibold text-white/80">پخش یا دانلود از لینک</h3>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-white/40">
        لینک از YouTube، YouTube Music، Spotify یا Apple Music بذار — پیدا و پخشش می‌کنم و
        می‌تونی دانلودش کنی.
      </p>

      <form onSubmit={handle} className="flex flex-col gap-2.5 sm:flex-row">
        <div className="flex flex-1 items-center rounded-2xl bg-white/[0.04] px-4">
          <Music2 size={16} className="ml-2 flex-shrink-0 text-white/30" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            dir="ltr"
            className="w-full bg-transparent px-3 py-3 text-sm text-white placeholder-white/25 outline-none font-en"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="btn-play-accent flex items-center justify-center gap-1.5 rounded-2xl px-5 py-3 text-sm font-semibold text-zinc-900 disabled:opacity-40"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              برو
              <ArrowLeft size={15} />
            </>
          )}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-center text-xs text-red-300/80">{error}</p>
      )}
    </motion.div>
  );
}
